import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, XCircle, Clock, Eye, X, Truck, Printer, Trash2, Download, MapPin, Phone, Mail } from "lucide-react";
import { subscribeToOrders, updateOrderStatus } from "@/lib/orders";
import { printInvoice } from "@/lib/invoice";
import type { Order, OrderStatus } from "@/lib/types";
import { deleteDoc, doc, getDocs, writeBatch, collection, query } from "@/lib/supabaseStore";
import { getDB } from "@/lib/supabase";
import { format } from "date-fns";
import { ConfirmDeleteModal } from "@/components/admin/ConfirmDeleteModal";

const STATUS_COLORS: Record<string, string> = {
  "Payment Pending": "bg-amber-100 text-amber-700",
  "Under Verification": "bg-blue-100 text-blue-700",
  "Placed": "bg-cyan-100 text-cyan-700",
  "Verified": "bg-green-100 text-green-700",
  "Rejected": "bg-red-100 text-red-700",
  "Processing": "bg-purple-100 text-purple-700",
  "Shipped": "bg-indigo-100 text-indigo-700",
  "Delivered": "bg-emerald-100 text-emerald-700",
  "Cancelled": "bg-gray-100 text-gray-600",
};

const ALL_STATUSES = ["Payment Pending", "Placed", "Under Verification", "Verified", "Processing", "Shipped", "Delivered", "Rejected", "Cancelled"];

export function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    try {
      const unsub = subscribeToOrders((list) => { setOrders(list); setLoading(false); });
      return () => unsub();
    } catch { setLoading(false); return undefined; }
  }, []);

  const filtered = orders.filter(o => {
    const matchSearch = !search || (o.orderId || '').toLowerCase().includes(search.toLowerCase()) || (o.customerName || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.orderStatus === filter;
    return matchSearch && matchFilter;
  });

  const handleStatus = async (orderId: string, status: OrderStatus) => {
    // Optimistic UI updates for instant feedback
    setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, orderStatus: status } : o));
    if (viewOrder?.orderId === orderId) {
      setViewOrder(prev => prev ? { ...prev, orderStatus: status } : null);
    }

    setUpdating(true);
    try {
      await updateOrderStatus(orderId, status);
    } catch (err) {
      console.error(err);
    }
    setUpdating(false);
  };

  const handleDeleteOrder = async (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteSingle = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(getDB(), "orders", orderToDelete));
    } catch (err: any) {
      console.error("Failed to delete order:", err);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const db = getDB();
      const snap = await getDocs(query(collection(db, "orders")));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) { console.error(e); }
    finally { setIsDeleting(false); setBulkDeleteOpen(false); }
  };

  const handleExportOrdersPdf = async () => {
    if (orders.length === 0) return alert("No orders to export.");
    setUpdating(true);
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

      const filteredOrders = filter === "all" ? orders : orders.filter(o => o.orderStatus === filter);
      const rows = filteredOrders.map(o => {
        const date = o.createdAt?.toDate ? new Date(o.createdAt.toDate()).toLocaleString('en-IN') : '—';
        const items = o.items?.map(i => `${i.name} × ${i.quantity}`).join(', ') || '—';
        return `<tr>
          <td style="padding:6px 10px;border:1px solid #ddd;font-size:11px;">${o.orderId}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;font-size:11px;">${date}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;font-size:11px;">${o.customerName}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;font-size:11px;">${o.phone}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;font-size:11px;">${o.address}, ${o.city}, ${o.state} - ${o.pincode}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;font-size:11px;">${items}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;font-size:11px;text-align:right;">₹${(o.total || 0).toFixed(2)}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;font-size:11px;font-weight:600;">${o.orderStatus}</td>
        </tr>`;
      }).join('');

      const htmlContent = `
        <div style="font-family:system-ui,-apple-system,sans-serif;padding:30px;max-width:1200px;">
          <h1 style="font-size:22px;margin-bottom:4px;color:#111;">Thealankar — Orders Report</h1>
          <p style="color:#888;font-size:12px;margin-bottom:16px;">Generated on ${new Date().toLocaleString('en-IN')} | ${filteredOrders.length} orders${filter !== "all" ? ` (${filter})` : ''}</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f5f5f5;">
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:11px;">Order ID</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:11px;">Date</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:11px;">Customer</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:11px;">Phone</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:11px;">Address</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:11px;">Items</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:right;font-size:11px;">Total</th>
                <th style="padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:11px;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1200px';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDFCtor({ unit: 'pt', format: 'a4', orientation: 'landscape' });
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

      pdf.save(`Orders-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.removeChild(container);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert("Failed to generate PDF");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusMessage = (status: OrderStatus) => {
    switch (status) {
      case "Payment Pending": return "Your order has been received and is awaiting payment completion.";
      case "Under Verification": return "We have received your payment details. Your order is currently under verification.";
      case "Verified": return "Your payment has been successfully verified! We will begin processing your order shortly.";
      case "Processing": return "Good news! Your order is currently being processed and prepared for dispatch.";
      case "Shipped": return "Great news! Your order has been shipped and is on its way to you.";
      case "Delivered": return "Your order has been successfully delivered. We hope you love your purchase!";
      case "Cancelled": return "Your order has been cancelled. If you have any questions, please reach out to our support team.";
      case "Rejected": return "Unfortunately, there was an issue verifying your order and it has been rejected. Please contact us for further assistance.";
      case "Placed":
      default: return "Your order has been successfully placed!";
    }
  };

  const generateOrderMessage = (order: Order, isEmail: boolean = false) => {
    const trackLink = `${window.location.origin}/track/${order.orderId}`;
    const items = order.items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'Various items';
    const statusText = getStatusMessage(order.orderStatus);

    return `Hello ${order.customerName},\n\nWelcome to Thealankar! ${statusText}\n\n${isEmail ? 'Order Information:' : '*Order Information:*'}\nOrder ID: ${order.orderId}\nTotal Amount: ₹${(order.total || 0).toFixed(2)}\nItems: ${items}\nCurrent Status: ${order.orderStatus}\n\nYou can track your order status in real-time here:\n${trackLink}\n\nBest regards,\nThealankar Team`;
  };

  const handleWhatsAppNotify = (order: Order) => {
    if (!order.phone) return alert("Customer phone number not available.");
    const msg = generateOrderMessage(order, false);

    // Format phone number to international format, assuming Indian if it's 10 digits without code
    let phone = order.phone.replace(/[^0-9]/g, '');
    if (phone.length === 10) phone = `91${phone}`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleEmailNotify = (order: Order) => {
    if (!order.email) return alert("Customer email not available.");
    const subject = `Order Update: ${order.orderStatus} - Thealankar (Order #${order.orderId})`;
    const body = generateOrderMessage(order, true);

    window.open(`mailto:${order.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#E8D8D1] rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div><h2 className="font-serif text-2xl text-[#8E5E4F]">Orders</h2><p className="text-xs text-[#8E5E4F]/50 mt-0.5">{orders.length} total orders</p></div>
        <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-3">
          {orders.length > 0 && (
            <button onClick={() => setBulkDeleteOpen(true)} className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm border border-red-100"><Trash2 className="w-4 h-4" />Clear All</button>
          )}
          <button onClick={handleExportOrdersPdf} disabled={updating} className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all disabled:opacity-60"><Download className="h-4 w-4" /> Export PDF</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E5E4F]/40" /><input type="text" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] placeholder-[#8E5E4F]/30 outline-none focus:border-[#B47A67] transition-colors" /></div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors">
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-[#E8D8D1] bg-[#F7F1EE]">
        <th className="text-left px-5 py-3.5 text-[10px] tracking-widest uppercase text-[#8E5E4F]/50">Order ID</th>
        <th className="text-left px-5 py-3.5 text-[10px] tracking-widest uppercase text-[#8E5E4F]/50">Customer</th>
        <th className="text-left px-5 py-3.5 text-[10px] tracking-widest uppercase text-[#8E5E4F]/50">Amount</th>
        <th className="text-left px-5 py-3.5 text-[10px] tracking-widest uppercase text-[#8E5E4F]/50">Payment</th>
        <th className="text-left px-5 py-3.5 text-[10px] tracking-widest uppercase text-[#8E5E4F]/50">Status</th>
        <th className="px-5 py-3.5" />
      </tr></thead><tbody><AnimatePresence>
        {filtered.map((order, i) => (
          <motion.tr key={order.orderId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-[#E8D8D1] last:border-0 hover:bg-[#F7F1EE] transition-colors">
            <td className="px-5 py-3.5 text-sm font-mono font-medium text-[#8E5E4F]">{order.orderId}</td>
            <td className="px-5 py-3.5"><div className="text-sm text-[#8E5E4F]">{order.customerName}</div><div className="text-xs text-[#8E5E4F]/40">{order.email}</div></td>
            <td className="px-5 py-3.5 text-sm font-medium text-[#8E5E4F]">₹{(order.total || 0).toFixed(2)}</td>
            <td className="px-5 py-3.5 text-xs text-[#8E5E4F]/60">{order.paymentMethod}</td>
            <td className="px-5 py-3.5">
              <select
                value={order.orderStatus}
                onChange={(e) => handleStatus(order.orderId, e.target.value as OrderStatus)}
                disabled={updating}
                className={`text-[10px] px-2.5 py-1.5 rounded-full font-medium border-0 outline-none cursor-pointer disabled:opacity-60 ${STATUS_COLORS[order.orderStatus] || "bg-gray-100 text-gray-500"}`}
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </td>
            <td className="px-5 py-3.5"><div className="flex items-center gap-1 justify-end">
              <button onClick={() => setViewOrder(order)} className="p-2 hover:bg-[#B47A67]/10 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-[#B47A67]"><Eye className="h-4 w-4" /></button>
              {order.orderStatus === "Under Verification" && <>
                <button onClick={() => handleStatus(order.orderId, "Verified")} disabled={updating} className="p-2 hover:bg-green-50 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-green-600"><CheckCircle2 className="h-4 w-4" /></button>
                <button onClick={() => handleStatus(order.orderId, "Rejected")} disabled={updating} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-red-500"><XCircle className="h-4 w-4" /></button>
              </>}
              <button onClick={() => handleDeleteOrder(order.orderId)} disabled={updating} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-[#8E5E4F]/40 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div></td>
          </motion.tr>
        ))}
      </AnimatePresence></tbody></table></div></div>

      <AnimatePresence>{viewOrder && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E8D8D1]"><h3 className="font-serif text-xl text-[#8E5E4F]">Order #{viewOrder.orderId}</h3><button onClick={() => setViewOrder(null)} className="p-2 hover:bg-[#F7F1EE] rounded-lg"><X className="h-4 w-4 text-[#8E5E4F]/50" /></button></div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[viewOrder.orderStatus] || ""}`}>{viewOrder.orderStatus}</span>
                {viewOrder.deliveryType === 'Express' && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-[#B47A67] text-white flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Express
                  </span>
                )}
                <span className="text-xs text-[#8E5E4F]/40">{viewOrder.paymentMethod}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[["Customer", viewOrder.customerName], ["Email", viewOrder.email], ["Phone", viewOrder.phone], ["City", viewOrder.city]].map(([l, v]) => (
                  <div key={l}><p className="text-[9px] tracking-widest uppercase text-[#8E5E4F]/40 mb-0.5">{l}</p><p className="text-sm text-[#8E5E4F]">{v || '—'}</p></div>
                ))}
              </div>
              <div><p className="text-[9px] tracking-widest uppercase text-[#8E5E4F]/40 mb-1">Address</p>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-[#8E5E4F] leading-relaxed">{viewOrder.address}, {viewOrder.city}, {viewOrder.state} - {viewOrder.pincode}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${viewOrder.address}, ${viewOrder.city}, ${viewOrder.state}, ${viewOrder.pincode}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 p-2 bg-[#B47A67]/10 text-[#B47A67] rounded-lg hover:bg-[#B47A67] hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold"
                  >
                    <MapPin className="w-3 h-3" /> Map
                  </a>
                </div>
              </div>
              {viewOrder.transactionId && <div><p className="text-[9px] tracking-widest uppercase text-[#8E5E4F]/40 mb-0.5">Transaction ID</p><p className="text-sm font-mono text-[#8E5E4F]">{viewOrder.transactionId}</p></div>}
              {viewOrder.orderNote && (
                <div className="bg-[#FBF6F3] border border-[#E8D8D1] rounded-xl p-3">
                  <p className="text-[9px] tracking-widest uppercase text-[#B47A67] font-bold mb-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    Note from Customer
                  </p>
                  <p className="text-sm text-[#8E5E4F] leading-relaxed">{viewOrder.orderNote}</p>
                </div>
              )}
              {viewOrder.paymentScreenshotUrl && <div><p className="text-[9px] tracking-widest uppercase text-[#8E5E4F]/40 mb-1">Payment Screenshot</p><img src={viewOrder.paymentScreenshotUrl} alt="Payment proof" className="max-h-40 rounded-lg border border-[#E8D8D1]" /></div>}
              <div className="border-t border-[#E8D8D1] pt-4"><p className="text-[9px] tracking-widest uppercase text-[#8E5E4F]/40 mb-3">Items ({viewOrder.items?.length || 0})</p>
                <div className="space-y-3">
                  {viewOrder.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-1">
                      <div className="w-12 h-12 rounded-lg bg-[#F7F1EE] overflow-hidden border border-[#E8D8D1] shrink-0">
                        {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#8E5E4F]/20"><Truck className="w-5 h-5" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#8E5E4F] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#8E5E4F]/50 font-mono">SKU: {item.sku || 'N/A'} | {item.size}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-[#8E5E4F]">₹{(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-[10px] text-[#8E5E4F]/40">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#E8D8D1] pt-3 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-[#8E5E4F]/60">Subtotal</span><span className="text-[#8E5E4F]">₹{(viewOrder.subtotal || 0).toFixed(2)}</span></div>
                {viewOrder.discount > 0 && <div className="flex justify-between text-sm"><span className="text-green-600">Discount</span><span className="text-green-600">-₹{viewOrder.discount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-[#8E5E4F]/60">Shipping</span><span className="text-[#8E5E4F]">{viewOrder.shipping === 0 ? 'Free' : `₹${viewOrder.shipping}`}</span></div>
                <div className="flex justify-between font-serif text-lg border-t border-[#E8D8D1] pt-2 mt-2"><span className="text-[#8E5E4F]">Total</span><span className="text-[#8E5E4F]">₹{(viewOrder.total || 0).toFixed(2)}</span></div>
              </div>

              {/* ── Admin Tracking Timeline ── */}
              <div className="border-t border-[#E8D8D1] pt-4 mt-4">
                <p className="text-[9px] tracking-widest uppercase text-[#8E5E4F]/40 mb-3">Tracking Details</p>
                {(() => {
                  const date = viewOrder.createdAt?.toDate ? viewOrder.createdAt.toDate() : viewOrder.createdAt?.seconds ? new Date(viewOrder.createdAt.seconds * 1000) : new Date();
                  return (
                    <div className="relative pl-6">
                      {/* Vertical Line */}
                      <div className="absolute top-2 bottom-6 left-[7px] w-0.5 bg-[#E8D8D1] z-0"></div>
                      <div className={`absolute top-2 left-[7px] w-0.5 bg-[#8E5E4F] z-0 transition-all duration-500
                        ${viewOrder.orderStatus === 'Delivered' ? 'bottom-6' :
                          ['Shipped', 'Processing'].includes(viewOrder.orderStatus) ? 'bottom-1/2' : 'bottom-[80%]'}`}
                      />

                      {/* Step 1: Order Confirmed */}
                      <div className="relative mb-6">
                        <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-[#8E5E4F] rounded-full z-10 border-2 border-white shadow-sm" />
                        <h3 className="text-sm font-medium text-[#222]">Order Confirmed <span className="font-normal text-[#888] ml-1">{format(date, "EEE, do MMM ''yy")}</span></h3>

                        <div className="mt-2 space-y-2">
                          <div>
                            <p className="text-xs text-[#333]">Your Order has been placed.</p>
                            <p className="text-[10px] text-[#888]">{format(date, "EEE, do MMM ''yy - h:mma").toLowerCase()}</p>
                          </div>
                          {['Processing', 'Shipped', 'Delivered'].includes(viewOrder.orderStatus) && (
                            <div>
                              <p className="text-xs text-[#333]">Seller has processed your order.</p>
                              <p className="text-[10px] text-[#888]">{format(new Date(date.getTime() + 1000 * 60 * 60), "EEE, do MMM ''yy - h:mma").toLowerCase()}</p>
                            </div>
                          )}
                          {['Shipped', 'Delivered'].includes(viewOrder.orderStatus) && (
                            <div>
                              <p className="text-xs text-[#333]">Your item has been picked up by delivery partner.</p>
                              <p className="text-[10px] text-[#888]">{format(new Date(date.getTime() + 1000 * 60 * 60 * 3), "EEE, do MMM ''yy - h:mma").toLowerCase()}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 2: Shipped */}
                      <div className="relative mb-6">
                        {['Shipped', 'Delivered'].includes(viewOrder.orderStatus) ? (
                          <div className="absolute -left-[33px] top-0 w-6 h-6 bg-[#F7F1EE] rounded-full flex items-center justify-center z-10">
                            <div className="w-[11px] h-[11px] bg-[#8E5E4F] rounded-full" />
                          </div>
                        ) : (
                          <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-white border-2 border-[#E8D8D1] rounded-full z-10" />
                        )}
                        <h3 className={`text-sm font-medium ${['Shipped', 'Delivered'].includes(viewOrder.orderStatus) ? 'text-[#222]' : 'text-[#888]'}`}>
                          Shipped {['Shipped', 'Delivered'].includes(viewOrder.orderStatus) && <span className="font-normal text-[#888] ml-1">{format(new Date(date.getTime() + 1000 * 60 * 60 * 24), "EEE, do MMM ''yy")}</span>}
                        </h3>

                        {['Shipped', 'Delivered'].includes(viewOrder.orderStatus) && (
                          <div className="mt-2">
                            <p className="text-xs text-[#333] mb-1">Logistics Partner - SHT-{viewOrder.orderId.replace(/[^0-9]/g, '').slice(0, 10)}</p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-[#333]">Your item has been shipped.</p>
                                <p className="text-[10px] text-[#888]">{format(new Date(date.getTime() + 1000 * 60 * 60 * 24), "EEE, do MMM ''yy - h:mma").toLowerCase()}</p>
                              </div>
                              <div className="pl-3 border-l-2 border-[#E8D8D1]/40 ml-1">
                                <div className="mb-2">
                                  <p className="text-xs text-[#555]">Your item has arrived at a sorting facility</p>
                                  <p className="text-[10px] text-[#999]">{format(new Date(date.getTime() + 1000 * 60 * 60 * 28), "EEE, do MMM ''yy - h:mma").toLowerCase()} - CHENNAI</p>
                                </div>
                                <div>
                                  <p className="text-xs text-[#555]">Your item has left the sorting facility</p>
                                  <p className="text-[10px] text-[#999]">{format(new Date(date.getTime() + 1000 * 60 * 60 * 36), "EEE, do MMM ''yy - h:mma").toLowerCase()} - CHENNAI</p>
                                </div>
                              </div>
                            </div>
                            {viewOrder.orderStatus !== 'Delivered' && <p className="text-xs text-[#333] mt-3 font-medium">Item yet to reach hub nearest to you.</p>}
                          </div>
                        )}
                      </div>

                      {/* Step 3: Out For Delivery */}
                      <div className="relative mb-6">
                        {viewOrder.orderStatus === 'Delivered' ? (
                          <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-[#8E5E4F] rounded-full z-10 border-2 border-white shadow-sm" />
                        ) : (
                          <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-white border-2 border-[#E8D8D1] rounded-full z-10" />
                        )}
                        <h3 className={`text-sm ${viewOrder.orderStatus === 'Delivered' ? 'font-medium text-[#222]' : 'text-[#888]'}`}>Out For Delivery</h3>
                        {viewOrder.orderStatus !== 'Delivered' && <p className="text-xs text-[#888] mt-1">Item yet to be delivered.</p>}
                        {viewOrder.orderStatus === 'Delivered' && (
                          <div className="mt-1">
                            <p className="text-xs text-[#333]">Out for delivery</p>
                            <p className="text-[10px] text-[#888]">{format(new Date(date.getTime() + 1000 * 60 * 60 * 72), "EEE, do MMM ''yy - h:mma").toLowerCase()}</p>
                          </div>
                        )}
                      </div>

                      {/* Step 4: Expected Delivery */}
                      <div className="relative">
                        {viewOrder.orderStatus === 'Delivered' ? (
                          <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-[#8E5E4F] rounded-full z-10 border-2 border-white shadow-sm" />
                        ) : (
                          <div className="absolute -left-[27px] top-1.5 w-[11px] h-[11px] bg-white border-2 border-[#E8D8D1] rounded-full z-10" />
                        )}
                        <h3 className={`text-sm ${viewOrder.orderStatus === 'Delivered' ? 'font-medium text-[#222]' : 'text-[#888]'}`}>
                          {viewOrder.orderStatus === 'Delivered' ? 'Delivered' : `Delivery Expected By ${format(new Date(date.getTime() + 1000 * 60 * 60 * 96), "EEE do MMM")}`}
                        </h3>
                        {viewOrder.orderStatus !== 'Delivered' && (
                          <div className="mt-1">
                            <p className="text-xs text-[#888]">Item yet to be delivered.</p>
                            <p className="text-[10px] text-[#999]">Expected by {format(new Date(date.getTime() + 1000 * 60 * 60 * 96), "EEE, do MMM")}</p>
                          </div>
                        )}
                        {viewOrder.orderStatus === 'Delivered' && (
                          <div className="mt-1">
                            <p className="text-xs text-[#333]">Your item has been delivered.</p>
                            <p className="text-[10px] text-[#888]">{format(new Date(date.getTime() + 1000 * 60 * 60 * 80), "EEE, do MMM ''yy - h:mma").toLowerCase()}</p>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })()}
              </div>

            </div>
            <div className="p-6 border-t border-[#E8D8D1] space-y-4">
              <div>
                <label className="block text-[9px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">Notify Customer</label>
                <div className="flex gap-3">
                  <button onClick={() => handleWhatsAppNotify(viewOrder)} className="flex-1 px-4 py-3 bg-[#25D366] text-white rounded-xl text-sm hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2 font-medium"><Phone className="h-4 w-4" /> WhatsApp Update</button>
                  <button onClick={() => handleEmailNotify(viewOrder)} className="flex-1 px-4 py-3 bg-[#EA4335] text-white rounded-xl text-sm hover:bg-[#C5221F] transition-colors flex items-center justify-center gap-2 font-medium"><Mail className="h-4 w-4" /> Email Update</button>
                </div>
              </div>
              <div>
                <label className="block text-[9px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">Update Status</label>
                <div className="flex gap-3">
                  <select
                    value={viewOrder.orderStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as OrderStatus;
                      handleStatus(viewOrder.orderId, newStatus);
                    }}
                    disabled={updating}
                    className="flex-1 px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors disabled:opacity-60"
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button onClick={() => printInvoice(viewOrder)} className="px-5 py-3 border border-[#E8D8D1] text-[#8E5E4F] rounded-xl text-sm hover:bg-[#F7F1EE] transition-colors flex items-center gap-2"><Printer className="h-4 w-4" /> Print</button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); }}
        onConfirm={confirmDeleteSingle}
        title="Delete Order"
        message="Are you sure you want to permanently delete this order? This action cannot be undone."
        isDeleting={isDeleting}
      />

      <ConfirmDeleteModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleDeleteAll}
        title="Delete All Orders"
        message="Are you absolutely sure you want to delete ALL orders? This will wipe every order record from the database and free up storage space. This action cannot be undone."
        isBulk={true}
        isDeleting={isDeleting}
      />
    </div>
  );
}
