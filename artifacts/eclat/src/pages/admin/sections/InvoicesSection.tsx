import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Search, Loader2, Plus, X, RefreshCw, Printer, ArrowDown, Trash2 } from "lucide-react";
import { subscribeToOrders } from "@/lib/orders";
import { deleteDoc, writeBatch, collection, query, getDocs, doc } from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";
import { isPaidOrder } from "@/lib/orderPayment";
import type { Order } from "@/lib/types";

export function InvoicesSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<"list" | "manual">("list");
  
  // MANUAL INVOICE STATE
  const [invoiceForm, setInvoiceForm] = useState({
    orderId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    customerCity: '',
    customerState: '',
    customerZipCode: '',
    lineItems: [{ description: '', quantity: 1, price: 0 }],
    subtotal: 0,
    discount: 0,
    discountCode: '',
    shipping: 0,
    total: 0,
    gstEnabled: false,
    companyGstin: '',
    customerGstin: '',
    gstRate: 18,
    hsnCode: '',
    placeOfSupply: '',
    sameState: true,
  });
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    try {
      const unsub = subscribeToOrders((list) => { setOrders(list.filter(isPaidOrder)); setLoading(false); });
      return () => unsub();
    } catch { setLoading(false); return undefined; }
  }, []);

  const filtered = orders.filter(o => !search || (o.orderId || '').toLowerCase().includes(search.toLowerCase()) || (o.customerName || '').toLowerCase().includes(search.toLowerCase()));

  const handleDeleteSingle = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const db = getDB();
      await deleteDoc(doc(db, 'orders', itemToDelete));
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const db = getDB();
      const q = query(collection(db, 'orders'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        // Only delete the orders that would appear in the invoices section
        snap.docs.forEach(d => {
          if (isPaidOrder(d.data() as Order)) {
             batch.delete(d.ref);
          }
        });
        await batch.commit();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const generateOrderId = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setInvoiceForm(prev => ({ ...prev, orderId: `INV-${year}-${randomNum}` }));
  };

  const calculateInvoiceTotals = () => {
    const subtotal = invoiceForm.lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const total = subtotal - invoiceForm.discount + invoiceForm.shipping;
    setInvoiceForm(prev => ({ ...prev, subtotal, total }));
  };

  const buildInvoiceHTML = (form: typeof invoiceForm) => {
    const taxableAmount = form.subtotal - form.discount;
    const gstAmount = form.gstEnabled ? (taxableAmount * form.gstRate / 100) : 0;
    const cgst = form.sameState ? gstAmount / 2 : 0;
    const sgst = form.sameState ? gstAmount / 2 : 0;
    const igst = !form.sameState ? gstAmount : 0;
    const grandTotal = taxableAmount + gstAmount + form.shipping;

    const itemsRows = form.lineItems.map((item, idx) => {
      const lineTotal = item.quantity * item.price;
      return `<tr style="border-bottom:1px solid #F7F1EE">
        <td style="padding:12px 0;font-size:13px;color:#8E5E4F">${item.description}</td>
        ${form.gstEnabled && form.hsnCode ? `<td style="text-align:center;padding:12px;font-size:13px;color:#8E5E4F99">${form.hsnCode}</td>` : ''}
        <td style="text-align:center;padding:12px;font-size:13px;color:#8E5E4F99">${item.quantity}</td>
        <td style="text-align:right;padding:12px 0;font-size:13px;color:#8E5E4F;font-weight:600">₹${item.price.toFixed(2)}</td>
        ${form.gstEnabled ? `<td style="text-align:right;padding:12px 0;font-size:13px;color:#8E5E4F;font-weight:600">${form.gstRate}%</td>` : ''}
        <td style="text-align:right;padding:12px 0;font-size:13px;color:#8E5E4F;font-weight:600">₹${lineTotal.toFixed(2)}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<body style="font-family:serif;color:#1d1d1f;background:#fff;margin:0;padding:48px;">
  <div style="border-bottom:2px solid #B47A67;padding-bottom:24px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-size:28px;color:#8E5E4F;font-style:italic">Thealankar</div>
      <div style="font-size:10px;color:#8E5E4F99;letter-spacing:3px;text-transform:uppercase;margin-top:4px">Tax Invoice</div>
      ${form.companyGstin ? `<div style="font-size:11px;color:#8E5E4F99;margin-top:4px;font-family:monospace">GSTIN: ${form.companyGstin}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:14px;color:#8E5E4F;font-weight:600">#${form.orderId}</div>
      <div style="font-size:11px;color:#8E5E4F99;margin-top:4px">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      ${form.placeOfSupply ? `<div style="font-size:11px;color:#8E5E4F99;margin-top:4px">Place of Supply: ${form.placeOfSupply}</div>` : ''}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px">
    <div>
      <div style="font-size:10px;color:#8E5E4F80;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Bill To</div>
      <div style="font-size:14px;color:#8E5E4F;font-weight:600">${form.customerName}</div>
      <div style="font-size:12px;color:#8E5E4F99;margin-top:4px">${form.customerAddress}, ${form.customerCity}</div>
      <div style="font-size:12px;color:#8E5E4F99">${form.customerState} - ${form.customerZipCode}</div>
      <div style="font-size:12px;color:#8E5E4F99;margin-top:4px">${form.customerPhone}</div>
      ${form.customerGstin ? `<div style="font-size:11px;color:#8E5E4F99;margin-top:4px;font-family:monospace">GSTIN: ${form.customerGstin}</div>` : ''}
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead>
      <tr style="border-bottom:1px solid #E8D8D1">
        <th style="text-align:left;padding:10px 0;font-size:10px;color:#8E5E4F80;text-transform:uppercase;letter-spacing:2px">Description</th>
        ${form.gstEnabled && form.hsnCode ? `<th style="text-align:center;padding:10px 0;font-size:10px;color:#8E5E4F80;text-transform:uppercase;letter-spacing:2px">HSN</th>` : ''}
        <th style="text-align:center;padding:10px;font-size:10px;color:#8E5E4F80;text-transform:uppercase;letter-spacing:2px">Qty</th>
        <th style="text-align:right;padding:10px 0;font-size:10px;color:#8E5E4F80;text-transform:uppercase;letter-spacing:2px">Rate</th>
        ${form.gstEnabled ? `<th style="text-align:right;padding:10px 0;font-size:10px;color:#8E5E4F80;text-transform:uppercase;letter-spacing:2px">Tax</th>` : ''}
        <th style="text-align:right;padding:10px 0;font-size:10px;color:#8E5E4F80;text-transform:uppercase;letter-spacing:2px">Amount</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div style="border-top:2px solid #E8D8D1;padding-top:16px;display:flex;flex-direction:column;align-items:flex-end;gap:6px">
    <div style="display:flex;gap:48px;font-size:12px"><span style="color:#8E5E4F99">Subtotal</span><span style="color:#8E5E4F">₹${form.subtotal.toFixed(2)}</span></div>
    ${form.discount > 0 ? `<div style="display:flex;gap:48px;font-size:12px"><span style="color:#22c55e">Discount${form.discountCode ? ` (${form.discountCode})` : ''}</span><span style="color:#22c55e">-₹${form.discount.toFixed(2)}</span></div>` : ''}
    ${form.gstEnabled && form.sameState ? `
      <div style="display:flex;gap:48px;font-size:12px"><span style="color:#8E5E4F99">CGST @ ${(form.gstRate/2).toFixed(1)}%</span><span style="color:#8E5E4F">₹${cgst.toFixed(2)}</span></div>
      <div style="display:flex;gap:48px;font-size:12px"><span style="color:#8E5E4F99">SGST @ ${(form.gstRate/2).toFixed(1)}%</span><span style="color:#8E5E4F">₹${sgst.toFixed(2)}</span></div>
    ` : ''}
    ${form.gstEnabled && !form.sameState ? `
      <div style="display:flex;gap:48px;font-size:12px"><span style="color:#8E5E4F99">IGST @ ${form.gstRate}%</span><span style="color:#8E5E4F">₹${igst.toFixed(2)}</span></div>
    ` : ''}
    ${form.shipping === 0 ? `<div style="display:flex;gap:48px;font-size:12px"><span style="color:#8E5E4F99">Shipping</span><span style="color:#8E5E4F">FREE</span></div>` : `<div style="display:flex;gap:48px;font-size:12px"><span style="color:#8E5E4F99">Shipping</span><span style="color:#8E5E4F">₹${form.shipping.toFixed(2)}</span></div>`}
    <div style="display:flex;gap:48px;font-size:18px;border-top:1px solid #E8D8D1;padding-top:8px;margin-top:4px"><span style="color:#8E5E4F">Total</span><span style="color:#8E5E4F;font-weight:700">₹${(form.gstEnabled ? grandTotal : form.total).toFixed(2)}</span></div>
  </div>

  <div style="text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #F7F1EE">
    <div style="font-size:11px;color:#8E5E4F60;font-style:italic">Thank you for your business · Thealankar</div>
  </div>
</body>
</html>`;
  };

  const generateInvoiceHTML = () => {
    if (!invoiceForm.orderId || !invoiceForm.customerName || invoiceForm.lineItems.some(i => !i.description)) {
      alert("Please fill in all required fields");
      return;
    }
    calculateInvoiceTotals();
    const subtotal = invoiceForm.lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const html = buildInvoiceHTML({ ...invoiceForm, subtotal, total: subtotal - invoiceForm.discount + invoiceForm.shipping });
    setInvoicePreview(html);
  };

  const downloadPDF = async (html: string, orderId: string) => {
    try {
      const html2canvasModule = await import("html2canvas");
      const jsPDFModule = await import("jspdf");
      // @ts-ignore — multi-shape fallback for various module builds
      let html2canvas = html2canvasModule.default ?? html2canvasModule.html2canvas ?? html2canvasModule;
      if (typeof html2canvas !== 'function' && typeof window !== 'undefined' && (window as any).html2canvas) {
        html2canvas = (window as any).html2canvas;
      }
      // @ts-ignore — multi-shape fallback for various module builds
      let jsPDFCtor = jsPDFModule.jsPDF ?? jsPDFModule.default?.jsPDF ?? jsPDFModule.default ?? jsPDFModule;
      // @ts-ignore
      if (!jsPDFCtor || (typeof jsPDFCtor !== 'function' && typeof jsPDFCtor.jsPDF === 'function')) {
        // @ts-ignore
        jsPDFCtor = jsPDFModule.jspdf?.jsPDF ?? jsPDFModule.default?.jspdf?.jsPDF ?? jsPDFCtor?.jsPDF ?? jsPDFCtor;
      }
      // @ts-ignore
      if ((typeof jsPDFCtor !== 'function' || jsPDFCtor === jsPDFModule) && typeof window !== 'undefined') {
        jsPDFCtor = (window as any).jsPDF ?? (window as any).jspdf?.jsPDF ?? (window as any).jspdf ?? jsPDFCtor;
      }

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.innerHTML = html;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDFCtor({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        let remainingHeight = imgHeight;
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        const pxPerPt = canvas.width / imgWidth;
        const sliceHeightPx = Math.floor(pageHeight * pxPerPt);
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        let y = 0;
        while (remainingHeight > 0) {
          pageCtx?.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx?.drawImage(canvas, 0, y, canvas.width, sliceHeightPx, 0, 0, pageCanvas.width, pageCanvas.height);
          const sliceData = pageCanvas.toDataURL('image/png');
          pdf.addImage(sliceData, 'PNG', 0, 0, imgWidth, pageHeight);
          remainingHeight -= pageHeight;
          y += sliceHeightPx;
          if (remainingHeight > 0) pdf.addPage();
        }
      }

      pdf.save(`Invoice-${orderId}.pdf`);
      document.body.removeChild(container);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert("Failed to generate PDF");
    }
  };

  const generateAutoInvoice = async (order: Order) => {
    setGenerating(order.orderId);
    try {
      const lineItems = (order.items || []).map((item: any) => ({
        description: item.name || item.description || 'Product',
        quantity: item.quantity || 1,
        price: item.price || 0,
      }));
      const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);
      const discount = order.discount || 0;
      const shipping = order.shipping || 0;
      const total = subtotal - discount + shipping;

      const form = {
        orderId: order.orderId,
        customerName: order.customerName || '',
        customerEmail: order.email || '',
        customerPhone: order.phone || '',
        customerAddress: order.address || '',
        customerCity: order.city || '',
        customerState: order.state || '',
        customerZipCode: order.pincode || '',
        lineItems, subtotal, discount, discountCode: '', shipping, total,
        gstEnabled: false, companyGstin: '', customerGstin: '', gstRate: 18, hsnCode: '', placeOfSupply: '', sameState: true
      };
      
      const html = buildInvoiceHTML(form);
      await downloadPDF(html, order.orderId);
    } catch (err) { console.error(err); }
    setGenerating(null);
  };

  const loadOrderIntoForm = (order: Order) => {
    const lineItems = (order.items || []).map((item: any) => ({
      description: item.name || item.description || 'Product',
      quantity: item.quantity || 1,
      price: item.price || 0,
    }));
    const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);
    setInvoiceForm({
      orderId: order.orderId,
      customerName: order.customerName || '',
      customerEmail: order.email || '',
      customerPhone: order.phone || '',
      customerAddress: order.address || '',
      customerCity: order.city || '',
      customerState: order.state || '',
      customerZipCode: order.pincode || '',
      lineItems, subtotal, discount: order.discount || 0, discountCode: '', shipping: order.shipping || 0, total: subtotal - (order.discount || 0) + (order.shipping || 0),
      gstEnabled: false, companyGstin: '', customerGstin: '', gstRate: 18, hsnCode: '', placeOfSupply: '', sameState: true
    });
    setActiveTab("manual");
  };

  if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#E8D8D1] rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-[#8E5E4F]">Invoices</h2>
            <p className="text-xs text-[#8E5E4F]/50 mt-0.5">Manage and generate tax invoices</p>
          </div>
          {orders.length > 0 && activeTab === "list" && (
            <button 
              onClick={() => setBulkDeleteOpen(true)}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Invoices
            </button>
          )}
        </div>
        {/* Tab Switcher - full width on mobile */}
        <div className="flex bg-[#F7F1EE] p-1 rounded-xl w-full">
          <button onClick={() => setActiveTab("list")} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "list" ? "bg-white text-[#8E5E4F] shadow-sm" : "text-[#8E5E4F]/60 hover:text-[#8E5E4F]"}`}>Recent Orders</button>
          <button onClick={() => setActiveTab("manual")} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "manual" ? "bg-white text-[#8E5E4F] shadow-sm" : "text-[#8E5E4F]/60 hover:text-[#8E5E4F]"}`}>Custom Invoice</button>
        </div>
      </div>

      {activeTab === "list" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="relative mb-5"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E5E4F]/40" /><input type="text" placeholder="Search by order ID or customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] placeholder-[#8E5E4F]/30 outline-none focus:border-[#B47A67] transition-colors" /></div>
          <div className="space-y-3">{filtered.length === 0 ? <div className="text-center py-10 text-sm text-[#8E5E4F]/40">No verified orders found.</div> : filtered.map((order, i) => (
            <motion.div key={order.orderId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white border border-[#E8D8D1] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="h-11 w-11 bg-[#B47A67]/10 rounded-xl flex items-center justify-center flex-shrink-0"><FileText className="h-5 w-5 text-[#B47A67]" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-medium text-[#8E5E4F] truncate">{order.orderId}</div>
                  <div className="text-sm text-[#8E5E4F]/60 truncate">{order.customerName}</div>
                  <div className="text-xs text-[#8E5E4F]/40 mt-0.5">₹{(order.total || 0).toFixed(2)} · {order.paymentMethod}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={() => loadOrderIntoForm(order)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E8D8D1] text-[#8E5E4F] rounded-xl text-xs font-medium hover:bg-[#F7F1EE] transition-colors">Edit</button>
                <button onClick={() => generateAutoInvoice(order)} disabled={generating === order.orderId} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#B47A67] text-white rounded-xl text-xs font-medium hover:bg-[#A86F5C] transition-colors disabled:opacity-60">
                  {generating === order.orderId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PDF
                </button>
                <button 
                  onClick={() => { setItemToDelete(order.id || null); setDeleteModalOpen(true); }}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                  title="Delete Invoice/Order"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}</div>
        </motion.div>
      )}

      {activeTab === "manual" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-2xl border border-[#E8D8D1] overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#E8D8D1] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="font-serif text-lg text-[#8E5E4F]">Invoice Generator</h3>
            {invoicePreview && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={() => { const w = window.open('', '', 'width=900,height=600'); if(w){ w.document.write(invoicePreview); w.document.close(); setTimeout(() => w.print(), 250); } }} className="flex-1 sm:flex-none px-4 py-2.5 border border-[#E8D8D1] text-[#8E5E4F] rounded-xl text-xs font-medium hover:bg-[#F7F1EE] transition-colors flex items-center justify-center gap-2"><Printer className="h-4 w-4"/> Print</button>
                <button onClick={() => downloadPDF(invoicePreview, invoiceForm.orderId || 'Custom')} className="flex-1 sm:flex-none px-4 py-2.5 bg-[#B47A67] text-white rounded-xl text-xs font-medium hover:bg-[#A86F5C] transition-colors flex items-center justify-center gap-2"><ArrowDown className="h-4 w-4"/> Download</button>
              </div>
            )}
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Invoice Number</label>
                <div className="flex gap-2">
                  <input type="text" value={invoiceForm.orderId} onChange={e => setInvoiceForm({ ...invoiceForm, orderId: e.target.value })} className="flex-1 px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" />
                  <button type="button" onClick={generateOrderId} className="px-4 py-3 bg-[#B47A67] text-white rounded-xl hover:bg-[#A86F5C] transition-colors"><RefreshCw className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="bg-[#F7F1EE] p-5 rounded-2xl border border-[#E8D8D1] space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E5E4F]/60">Bill To</h4>
                <input type="text" value={invoiceForm.customerName} onChange={e => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })} placeholder="Customer Name *" className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="email" value={invoiceForm.customerEmail} onChange={e => setInvoiceForm({ ...invoiceForm, customerEmail: e.target.value })} placeholder="Email" className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" />
                  <input type="tel" value={invoiceForm.customerPhone} onChange={e => setInvoiceForm({ ...invoiceForm, customerPhone: e.target.value })} placeholder="Phone" className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" />
                </div>
                <input type="text" value={invoiceForm.customerAddress} onChange={e => setInvoiceForm({ ...invoiceForm, customerAddress: e.target.value })} placeholder="Address" className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <input type="text" value={invoiceForm.customerCity} onChange={e => setInvoiceForm({ ...invoiceForm, customerCity: e.target.value })} placeholder="City" className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" />
                  <input type="text" value={invoiceForm.customerState} onChange={e => setInvoiceForm({ ...invoiceForm, customerState: e.target.value })} placeholder="State" className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" />
                  <input type="text" value={invoiceForm.customerZipCode} onChange={e => setInvoiceForm({ ...invoiceForm, customerZipCode: e.target.value })} placeholder="PIN" className="col-span-2 sm:col-span-1 w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" />
                </div>
              </div>

              <div className="bg-[#F7F1EE] p-5 rounded-2xl border border-[#E8D8D1] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E5E4F]/60">GST Details</h4>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={invoiceForm.gstEnabled} onChange={e => setInvoiceForm({ ...invoiceForm, gstEnabled: e.target.checked })} className="accent-[#B47A67]" /><span className="text-xs text-[#8E5E4F] font-medium">Enable GST</span></label>
                </div>
                {invoiceForm.gstEnabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-[10px] uppercase tracking-wider text-[#8E5E4F]/60 mb-1">Company GSTIN</label><input type="text" value={invoiceForm.companyGstin} onChange={e => setInvoiceForm({ ...invoiceForm, companyGstin: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 bg-white border border-[#E8D8D1] rounded-xl text-sm font-mono text-[#8E5E4F]" /></div>
                      <div><label className="block text-[10px] uppercase tracking-wider text-[#8E5E4F]/60 mb-1">Customer GSTIN</label><input type="text" value={invoiceForm.customerGstin} onChange={e => setInvoiceForm({ ...invoiceForm, customerGstin: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 bg-white border border-[#E8D8D1] rounded-xl text-sm font-mono text-[#8E5E4F]" /></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div><label className="block text-[10px] uppercase tracking-wider text-[#8E5E4F]/60 mb-1">GST Rate %</label><select value={invoiceForm.gstRate} onChange={e => setInvoiceForm({ ...invoiceForm, gstRate: parseFloat(e.target.value) })} className="w-full px-4 py-2.5 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]"><option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option></select></div>
                      <div><label className="block text-[10px] uppercase tracking-wider text-[#8E5E4F]/60 mb-1">HSN/SAC</label><input type="text" value={invoiceForm.hsnCode} onChange={e => setInvoiceForm({ ...invoiceForm, hsnCode: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]" /></div>
                      <div className="col-span-2 sm:col-span-1"><label className="block text-[10px] uppercase tracking-wider text-[#8E5E4F]/60 mb-1">Place of Supply</label><input type="text" value={invoiceForm.placeOfSupply} onChange={e => setInvoiceForm({ ...invoiceForm, placeOfSupply: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]" /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={invoiceForm.sameState} onChange={() => setInvoiceForm({ ...invoiceForm, sameState: true })} className="accent-[#B47A67]" /><span className="text-xs text-[#8E5E4F]">Intra-State (CGST+SGST)</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!invoiceForm.sameState} onChange={() => setInvoiceForm({ ...invoiceForm, sameState: false })} className="accent-[#B47A67]" /><span className="text-xs text-[#8E5E4F]">Inter-State (IGST)</span></label>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Discount</label><input type="number" value={invoiceForm.discount} onChange={e => setInvoiceForm({ ...invoiceForm, discount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" /></div>
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Code</label><input type="text" value={invoiceForm.discountCode} onChange={e => setInvoiceForm({ ...invoiceForm, discountCode: e.target.value })} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" /></div>
                <div><label className="block text-xs tracking-wider uppercase text-[#8E5E4F]/50 mb-2">Shipping</label><input type="number" value={invoiceForm.shipping} onChange={e => setInvoiceForm({ ...invoiceForm, shipping: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" /></div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E5E4F]/60">Line Items</h4>
              <div className="space-y-3">
                {invoiceForm.lineItems.map((item, idx) => (
                  <div key={idx} className="bg-[#F7F1EE] p-4 rounded-2xl border border-[#E8D8D1] space-y-3">
                    <div className="flex justify-between"><span className="text-xs font-medium text-[#8E5E4F]/60">Item {idx + 1}</span>{invoiceForm.lineItems.length > 1 && <button onClick={() => { const n = [...invoiceForm.lineItems]; n.splice(idx, 1); setInvoiceForm({ ...invoiceForm, lineItems: n }); }} className="text-[#8E5E4F]/40 hover:text-red-500"><X className="h-4 w-4"/></button>}</div>
                    <input type="text" value={item.description} onChange={e => { const n = [...invoiceForm.lineItems]; n[idx].description = e.target.value; setInvoiceForm({ ...invoiceForm, lineItems: n }); }} placeholder="Description *" className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]" />
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="block text-[10px] text-[#8E5E4F]/60 mb-1">Qty</label><input type="number" value={item.quantity} onChange={e => { const n = [...invoiceForm.lineItems]; n[idx].quantity = parseInt(e.target.value) || 1; setInvoiceForm({ ...invoiceForm, lineItems: n }); }} className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]" /></div>
                      <div><label className="block text-[10px] text-[#8E5E4F]/60 mb-1">Rate (₹)</label><input type="number" value={item.price} onChange={e => { const n = [...invoiceForm.lineItems]; n[idx].price = parseFloat(e.target.value) || 0; setInvoiceForm({ ...invoiceForm, lineItems: n }); }} className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F]" /></div>
                      <div><label className="block text-[10px] text-[#8E5E4F]/60 mb-1">Amount</label><div className="px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm font-semibold text-[#8E5E4F]">₹{(item.quantity * item.price).toFixed(2)}</div></div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setInvoiceForm({ ...invoiceForm, lineItems: [...invoiceForm.lineItems, { description: '', quantity: 1, price: 0 }] })} className="w-full py-3 border border-dashed border-[#B47A67] text-[#B47A67] rounded-xl text-sm font-medium hover:bg-[#B47A67]/5 transition-colors flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Add Item</button>

              <div className="flex gap-3 pt-4">
                <button onClick={generateInvoiceHTML} className="flex-1 py-3 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-colors flex items-center justify-center gap-2"><FileText className="h-4 w-4"/> Generate Preview</button>
                <button onClick={() => setInvoicePreview(null)} className="py-3 px-6 border border-[#E8D8D1] text-[#8E5E4F] rounded-xl text-sm font-medium hover:bg-[#F7F1EE] transition-colors"><RefreshCw className="h-4 w-4"/></button>
              </div>

              {invoicePreview && (
                <div className="mt-8 border border-[#E8D8D1] rounded-2xl overflow-hidden bg-white">
                  <div className="bg-[#F7F1EE] p-3 text-xs font-semibold text-[#8E5E4F] uppercase tracking-wider text-center border-b border-[#E8D8D1]">Preview</div>
                  <iframe srcDoc={invoicePreview} className="w-full h-[500px]" />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={handleDeleteSingle}
        title="Delete Invoice/Order"
        message="Are you sure you want to delete this invoice record? This will delete the order data. This action cannot be undone."
        isDeleting={isDeleting}
      />

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Invoices"
        message="Are you absolutely sure you want to delete ALL completed orders from this list? This will permanently wipe all invoice history from the database and free up storage space. This action cannot be undone."
        isBulk={true}
        isDeleting={isDeleting}
      />
    </div>
  );
}
