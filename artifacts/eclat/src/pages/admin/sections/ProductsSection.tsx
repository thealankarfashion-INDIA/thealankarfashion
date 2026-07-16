import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Search, X, Check } from "lucide-react";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, query } from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";
import { getStorageInstance, ref, uploadBytes, getDownloadURL } from "@/lib/supabaseStorage";
import useStoreProducts from "@/hooks/useStoreProducts";
import useStoreCategories from "@/hooks/useStoreCategories";
import useStoreBrands from "@/hooks/useStoreBrands";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";
import { normalizeDisplayOrder } from "@/lib/displayOrder";

async function resizeImage(file: File, maxWidth = 900, quality = 0.72): Promise<string> {
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve) => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(file); });
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]); let n = bstr.length; const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

async function uploadProductImages(images: string[], sku: string): Promise<string[]> {
  const storage = getStorageInstance();
  const folder = (sku || "product").replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();

  return Promise.all(images.map(async (image, index) => {
    if (!image.startsWith("data:")) return image;

    const blob = dataURLtoBlob(image);
    const storageRef = ref(
      storage,
      `products/${folder}/${Date.now()}-${index}-${crypto.randomUUID()}.jpg`
    );
    const uploaded = await uploadBytes(storageRef, blob);
    return getDownloadURL(uploaded);
  }));
}

function generateUniqueSku() {
  return `ECL-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

interface ProductForm {
  name: string; sku: string; originalPrice: number; discountPercent: number; discountAmount: number; category: string; brand: string;
  description: string; isNew: boolean; displayOrder: number; stockQuantity: number;
  whatsInTheBox: string; variants: string[]; youtubeUrls: string[]; images: string[]; badge: string;
}
const empty: ProductForm = { name: "", sku: "", originalPrice: 0, discountPercent: 0, discountAmount: 0, category: "", brand: "", description: "", isNew: false, displayOrder: 0, stockQuantity: 100, whatsInTheBox: "", variants: ["Single"], youtubeUrls: [""], images: [], badge: "" };

export function ProductsSection() {
  const { products: storeProducts, loading, source, error } = useStoreProducts();
  // The public shop can use the bundled seed catalogue as an offline fallback.
  // Admin must only manage records that actually exist in Supabase.
  const products = source === "database" ? storeProducts : [];
  const { categories } = useStoreCategories();
  const { brands } = useStoreBrands();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState("");
  const [imageUploadsPending, setImageUploadsPending] = useState(0);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand || '').toLowerCase().includes(search.toLowerCase()));
  const openAdd = () => { setForm({ ...empty, sku: generateUniqueSku() }); setEditId(null); setModalOpen(true); };
  const openEdit = (p: any) => {
    const discAmt = p.originalPrice ? (p.originalPrice - (p.price || p.originalPrice)) : 0;
    setForm({ 
      name: p.name || '', 
      sku: p.sku || '',
      originalPrice: p.originalPrice || 0, 
      discountPercent: p.discountPercent || 0, 
      discountAmount: discAmt, 
      category: p.category || '', 
      brand: p.brand || '', 
      description: p.description || '', 
      isNew: p.isNew || false, 
      displayOrder: p.displayOrder || 0, 
      stockQuantity: p.stockQuantity ?? (p.inStock === false ? 0 : 100),
      whatsInTheBox: Array.isArray(p.whatsInTheBox) ? p.whatsInTheBox.join('\n') : (p.whatsInTheBox || ''), 
      variants: p.sizes || p.variants || ['Single'], 
      youtubeUrls: p.youtubeUrls || (p.youtubeUrl ? [p.youtubeUrl] : [""]), 
      images: p.images || (p.image ? [p.image] : []), 
      badge: p.badge || '' 
    });
    setEditId(p.id); setModalOpen(true);
  };

  const addProductImage = async (file: File) => {
    setImageUploadsPending(count => count + 1);
    try {
      const base64 = await resizeImage(file);
      const [imageUrl] = await uploadProductImages([base64], form.sku || "product");
      setForm(prev => ({ ...prev, images: [...prev.images, imageUrl] }));
    } catch (err) {
      console.error("Failed to upload product image:", err);
      const message = err instanceof Error ? err.message : "Please try again.";
      alert(`Failed to upload image. ${message}`);
    } finally {
      setImageUploadsPending(count => Math.max(0, count - 1));
    }
  };

  const save = async () => {
    if (!form.name) return;
    if (imageUploadsPending > 0) {
      alert("Please wait for the product image upload to finish.");
      return;
    }
    setSaving(true);
    setSaveStage("Uploading images...");
    try {
      const db = getDB();
      const calculatedPrice = Math.max(0, form.originalPrice - form.discountAmount);
      const finalSku = form.sku || `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const storedImages = await uploadProductImages(form.images, finalSku);
      setForm(prev => ({ ...prev, images: storedImages }));
      setSaveStage("Saving product...");
      const data: any = { 
        name: form.name, 
        sku: finalSku,
        originalPrice: Number(form.originalPrice), 
        discountPercent: Number(form.discountPercent), 
        discountAmount: Number(form.discountAmount), 
        price: calculatedPrice, 
        category: form.category, 
        brand: form.brand, 
        description: form.description, 
        isNew: form.isNew, 
        displayOrder: Number(form.displayOrder), 
        whatsInTheBox: form.whatsInTheBox ? form.whatsInTheBox.split('\n').map(s => s.trim()).filter(Boolean) : [], 
        youtubeUrls: form.youtubeUrls.filter(Boolean),
        image: storedImages[0] || "", 
        images: storedImages, 
        sizes: form.variants, 
        variants: form.variants, 
        badge: form.badge || (form.isNew ? 'New' : ''), 
        stockQuantity: Number(form.stockQuantity),
        inStock: Number(form.stockQuantity) > 0,
        updatedAt: serverTimestamp() 
      };
      let savedId = editId;
      if (editId) { await updateDoc(doc(db, "products", editId), data); }
      else { data.createdAt = serverTimestamp(); savedId = (await addDoc(collection(db, "products"), data)).id; }
      if (savedId) await normalizeDisplayOrder("products", savedId, data.displayOrder);
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save product:', err);
      const message = err instanceof Error ? err.message : 'Please try again.';
      alert(`Failed to save product. ${message}`);
    }
    setSaving(false);
    setSaveStage("");
  };

  const remove = async (id: string) => { try { await deleteDoc(doc(getDB(), "products", id)); } catch (err) { console.error(err); } setDeleteId(null); };

  const handleDeleteAll = async () => {
    setIsBulkDeleting(true);
    try {
      const db = getDB();
      const snap = await getDocs(query(collection(db, "products")));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) { console.error(e); }
    finally { setIsBulkDeleting(false); setBulkDeleteOpen(false); }
  };

  if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#E8D8D1] rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div><h2 className="font-serif text-2xl text-[#8E5E4F]">Products</h2><p className="text-xs text-[#8E5E4F]/50 mt-0.5">{products.length} total products</p></div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-3">
          {products.length > 0 && (
            <button onClick={() => setBulkDeleteOpen(true)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"><Trash2 className="w-4 h-4" />Clear All</button>
          )}
          <button onClick={openAdd} className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all"><Plus className="h-4 w-4" /> Add Product</button>
        </div>
      </div>
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E5E4F]/40" />
        <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] placeholder-[#8E5E4F]/30 outline-none focus:border-[#B47A67] transition-colors" />
      </div>
      {source === "seed" && (
        <div className="mb-5 rounded-xl border border-[#E8D8D1] bg-[#F7F1EE] px-4 py-3 text-sm text-[#8E5E4F]">
          {error
            ? "Saved products could not be loaded from Supabase. Older catalogue products are hidden from admin."
            : "No products are currently saved in Supabase. Older catalogue products are hidden from admin."}
        </div>
      )}
      <div className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#E8D8D1] bg-[#F7F1EE]">
              <th className="text-left px-5 py-3.5 text-[10px] tracking-widest uppercase text-[#8E5E4F]/50">Product</th>
              <th className="text-left px-5 py-3.5 text-[10px] tracking-widest uppercase text-[#8E5E4F]/50">Brand</th>
              <th className="text-left px-5 py-3.5 text-[10px] tracking-widest uppercase text-[#8E5E4F]/50">Category</th>
              <th className="text-left px-5 py-3.5 text-[10px] tracking-widest uppercase text-[#8E5E4F]/50">Price</th>
              <th className="text-left px-5 py-3.5 text-[10px] tracking-widest uppercase text-[#8E5E4F]/50">Status</th>
              <th className="px-5 py-3.5" />
            </tr></thead>
            <tbody><AnimatePresence>
              {filtered.map((product, i) => (
                <motion.tr key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.03 }} className="border-b border-[#E8D8D1] last:border-0 hover:bg-[#F7F1EE] transition-colors">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg overflow-hidden bg-[#F7F1EE] flex-shrink-0">{product.image && <img src={product.image} alt={product.name} className="w-full h-full object-cover" />}</div><div><div className="text-sm font-medium text-[#8E5E4F]">{product.name}</div>{product.isNew && <div className="text-[10px] text-[#B47A67]">New Arrival</div>}</div></div></td>
                  <td className="px-5 py-3.5 text-sm text-[#8E5E4F]/60">{product.brand}</td>
                  <td className="px-5 py-3.5 text-sm text-[#8E5E4F]/60 capitalize">
                    {categories.find(c => c.id === product.category)?.name || product.category}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-[#8E5E4F]">₹{Number(product.price).toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col items-start gap-1">
                      {product.stockQuantity !== undefined && product.stockQuantity <= 0 ? (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-600 font-medium whitespace-nowrap">Out of Stock</span>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">In Stock ({product.stockQuantity ?? 100})</span>
                      )}
                      {product.badge && <span className="text-[10px] px-2 py-1 rounded-full bg-[#B47A67]/10 text-[#B47A67] font-medium whitespace-nowrap">{product.badge}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(product)} className="p-2 hover:bg-[#B47A67]/10 rounded-lg transition-colors text-[#8E5E4F]/50 hover:text-[#B47A67]"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteId(product.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-[#8E5E4F]/50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </motion.tr>
              ))}
            </AnimatePresence></tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>{modalOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E8D8D1]"><h3 className="font-serif text-xl text-[#8E5E4F]">{editId ? "Edit Product" : "Add New Product"}</h3><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-[#F7F1EE] rounded-lg transition-colors"><X className="h-4 w-4 text-[#8E5E4F]/50" /></button></div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1"><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Product Name</label><input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">SKU (Unique Code)</label>
                <div className="relative">
                  <input type="text" value={form.sku} placeholder="e.g. JEWEL-001" onChange={e => setForm(prev => ({ ...prev, sku: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors pr-24" />
                  <button onClick={() => setForm(prev => ({ ...prev, sku: generateUniqueSku() }))} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1.5 bg-white text-[#B47A67] text-[10px] font-bold rounded-lg border border-[#E8D8D1] hover:bg-[#B47A67] hover:text-white transition-all uppercase tracking-tighter">Regenerate</button>
                </div>
              </div>
              
              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Original Price (₹)</label><input type="number" value={form.originalPrice} onChange={e => { const v = +e.target.value; setForm(prev => ({ ...prev, originalPrice: v, discountAmount: (v * prev.discountPercent) / 100 })); }} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Display Order</label><input type="number" value={form.displayOrder} onChange={e => setForm(prev => ({ ...prev, displayOrder: +e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Stock Quantity</label><input type="number" min="0" value={form.stockQuantity} onChange={e => setForm(prev => ({ ...prev, stockQuantity: +e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>

              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Discount (%)</label><input type="number" value={form.discountPercent} onChange={e => { const v = +e.target.value; setForm(prev => ({ ...prev, discountPercent: v, discountAmount: (prev.originalPrice * v) / 100 })); }} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>
              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Discount Amount (₹)</label><input type="number" value={form.discountAmount} onChange={e => { const v = +e.target.value; setForm(prev => ({ ...prev, discountAmount: v, discountPercent: prev.originalPrice ? (v / prev.originalPrice) * 100 : 0 })); }} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" /></div>


              <div className="col-span-2 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-[#8E5E4F]">Final Selling Price</span>
                <span className="text-lg font-serif text-[#B47A67]">₹{Math.max(0, Number(form.originalPrice) - Number(form.discountAmount)).toFixed(2)}</span>
              </div>
              <div className="col-span-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isNew} onChange={e => setForm(prev => ({ ...prev, isNew: e.target.checked }))} className="accent-[#B47A67]" /><span className="text-sm text-[#8E5E4F]">Mark as New Product</span></label></div>

              {/* Multiple Images Section */}
              <div className="col-span-2 space-y-4 pt-4 border-t border-[#E8D8D1]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50">Product Images</label>
                  <label className="cursor-pointer text-[#B47A67] text-xs font-bold hover:underline flex items-center gap-1">
                    {imageUploadsPending > 0 ? <div className="w-3 h-3 border-2 border-[#B47A67]/30 border-t-[#B47A67] rounded-full animate-spin" /> : <Plus className="w-3 h-3" />}
                    {imageUploadsPending > 0 ? "Uploading image..." : "Add Image"}
                    <input type="file" accept="image/*" disabled={imageUploadsPending > 0} className="hidden" onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file) await addProductImage(file);
                      e.target.value = "";
                    }} />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-[#F7F1EE] border border-[#E8D8D1]">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white transition-colors">
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                  {form.images.length === 0 && <div className="col-span-4 py-8 border-2 border-dashed border-[#E8D8D1] rounded-2xl text-center text-[#8E5E4F]/30 text-xs">No images added yet</div>}
                </div>
              </div>

              {/* Multiple YouTube URLs Section */}
              <div className="col-span-2 space-y-4 pt-4 border-t border-[#E8D8D1]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50">YouTube Videos</label>
                  <button onClick={() => setForm(prev => ({ ...prev, youtubeUrls: [...prev.youtubeUrls, ""] }))} className="text-[#B47A67] text-xs font-bold hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Video
                  </button>
                </div>
                <div className="space-y-2">
                  {form.youtubeUrls.map((url, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text" 
                        value={url} 
                        placeholder="Paste YouTube URL here"
                        onChange={e => {
                          const newUrls = [...form.youtubeUrls];
                          newUrls[idx] = e.target.value;
                          setForm(prev => ({ ...prev, youtubeUrls: newUrls }));
                        }}
                        className="flex-1 px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors" 
                      />
                      <button onClick={() => setForm(prev => ({ ...prev, youtubeUrls: prev.youtubeUrls.filter((_, i) => i !== idx) }))} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {form.youtubeUrls.length === 0 && <div className="py-4 text-center text-[#8E5E4F]/30 text-xs italic">No videos added</div>}
                </div>
              </div>

              <div className="col-span-2"><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Description</label><textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors resize-none" /></div>
              <div className="col-span-2"><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">What's in the Box (One item per line)</label><textarea value={form.whatsInTheBox} onChange={e => setForm(prev => ({ ...prev, whatsInTheBox: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors resize-none" /></div>
              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Category</label><select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors"><option value="">Select...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Brand</label><select value={form.brand} onChange={e => setForm(prev => ({ ...prev, brand: e.target.value }))} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors"><option value="">Select...</option>{brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
            </div>
            <div className="flex gap-3 p-6 border-t border-[#E8D8D1]">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 border border-[#E8D8D1] text-[#8E5E4F]/60 rounded-xl text-sm hover:border-[#B47A67] transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || imageUploadsPending > 0} className="flex-1 py-3 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>{saveStage}</span></> : <><Check className="h-4 w-4" /> {imageUploadsPending > 0 ? "Uploading Image" : editId ? "Save Changes" : "Add Product"}</>}</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{deleteId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="h-14 w-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="h-6 w-6 text-red-500" /></div>
            <h3 className="font-serif text-xl text-[#8E5E4F] mb-2">Delete Product</h3>
            <p className="text-sm text-[#8E5E4F]/50 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]/60 hover:border-[#B47A67] transition-colors">Cancel</button>
              <button onClick={() => remove(deleteId!)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Products"
        message="Are you absolutely sure you want to delete ALL products from the store? This will remove them from the catalogue. This action cannot be undone."
        isBulk={true}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}
