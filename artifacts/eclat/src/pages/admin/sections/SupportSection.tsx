import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Mail, User, Clock, CheckCircle2, 
  Search, Filter, ExternalLink, ChevronRight, AlertCircle, X, Trash2, Phone, Save, MessageCircle
} from 'lucide-react';
import { getDB } from '@/lib/supabase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from '@/lib/supabaseStore';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';

export function SupportSection() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'investigating' | 'resolved'>('all');
  const [selectedMsg, setSelectedMsg] = useState<any | null>(null);
  const [msgToDelete, setMsgToDelete] = useState<any | null>(null);
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (selectedMsg) {
      setInternalNotes(selectedMsg.internalNotes || '');
    }
  }, [selectedMsg]);

  useEffect(() => {
    const db = getDB();
    const q = query(collection(db, 'supportMessages'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const db = getDB();
      await updateDoc(doc(db, 'supportMessages', id), {
        status: newStatus
      });
      if (selectedMsg && selectedMsg.id === id) {
        setSelectedMsg({ ...selectedMsg, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedMsg) return;
    try {
      const db = getDB();
      await updateDoc(doc(db, 'supportMessages', selectedMsg.id), {
        internalNotes
      });
      setSelectedMsg({ ...selectedMsg, internalNotes });
    } catch (error) {
      console.error("Error saving notes:", error);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const db = getDB();
      await deleteDoc(doc(db, 'supportMessages', id));
      if (selectedMsg && selectedMsg.id === id) {
        setSelectedMsg(null);
      }
      setMsgToDelete(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      (msg.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (msg.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (msg.orderNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && msg.status === filter;
  });

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'new': return { label: 'New', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'read': return { label: 'Read', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'investigating': return { label: 'Investigating', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      case 'resolved': return { label: 'Resolved', color: 'bg-green-100 text-green-700 border-green-200' };
      default: return { label: status || 'Unknown', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const getWhatsAppMessage = (msg: any) => {
    const name = msg.firstName || 'there';
    const orderRef = msg.orderNumber ? ` regarding your order (${msg.orderNumber})` : '';
    
    switch (msg.status) {
      case 'investigating':
        return `Hi ${name},\n\nWe are currently looking into your inquiry${orderRef}. Our team is working on it and we will update you as soon as possible.\n\nThank you,\nThealankar Support`;
      case 'resolved':
        return `Hi ${name},\n\nWe're glad to inform you that your inquiry${orderRef} has been resolved. If you need anything else, please let us know!\n\nThank you,\nThealankar Support`;
      default:
        return `Hi ${name},\n\nWe've received your message${orderRef}. How can we assist you today?\n\nThank you,\nThealankar Support`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white border border-[#E8D8D1] rounded-2xl p-6"
      >
        <div>
          <h2 className="font-serif text-[26px] text-[#2C1E16] flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#B47A67]" />
            Help & Support
          </h2>
          <p className="text-sm text-[#8E5E4F]/70 mt-1">
            Manage inquiries and messages from the contact page
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#F7F1EE] p-3 rounded-xl flex items-center gap-4">
            <div className="text-center">
              <div className="text-xl font-serif text-[#B47A67]">{messages.filter(m => m.status === 'new').length}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#8E5E4F]/50">New</div>
            </div>
            <div className="w-px h-8 bg-[#E8D8D1]"></div>
            <div className="text-center">
              <div className="text-xl font-serif text-[#2C1E16]">{messages.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#8E5E4F]/50">Total</div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:h-[600px]">
        {/* Sidebar List */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[#E8D8D1] rounded-2xl flex flex-col overflow-hidden h-[400px] lg:h-full shrink-0"
        >
          {/* Controls */}
          <div className="p-4 border-b border-[#E8D8D1] space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8E5E4F]/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email, order..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F7F1EE] border border-transparent focus:border-[#B47A67] rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {['all', 'new', 'read', 'investigating', 'resolved'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    filter === f 
                      ? 'bg-[#B47A67] text-white' 
                      : 'bg-[#F7F1EE] text-[#8E5E4F] hover:bg-[#E8D8D1]'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-[#8E5E4F]/50 text-sm">Loading messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 text-[#E8D8D1] mx-auto mb-3" />
                <p className="text-[#8E5E4F]/50 text-sm">No messages found</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F7F1EE]">
                {filteredMessages.map((msg) => {
                  const cfg = getStatusConfig(msg.status);
                  const isSelected = selectedMsg?.id === msg.id;
                  
                  return (
                    <button
                      key={msg.id}
                      onClick={() => {
                        setSelectedMsg(msg);
                        if (msg.status === 'new') handleStatusChange(msg.id, 'read');
                      }}
                      className={`w-full text-left p-4 transition-colors hover:bg-[#F7F1EE]/50 ${
                        isSelected ? 'bg-[#F7F1EE]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="font-medium text-[#2C1E16] text-sm truncate pr-2">
                          {msg.firstName} {msg.lastName}
                        </span>
                        <span className={`text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${cfg.color} shrink-0`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-xs text-[#8E5E4F] truncate mb-2">
                        {msg.message}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#8E5E4F]/50">
                        <span>{formatDate(msg.createdAt)}</span>
                        {msg.orderNumber && (
                          <span className="bg-white border border-[#E8D8D1] px-1.5 py-0.5 rounded">
                            Order: {msg.orderNumber}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Detail View */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 bg-white border border-[#E8D8D1] rounded-2xl flex flex-col overflow-hidden min-h-[400px] lg:h-full relative"
        >
          {selectedMsg ? (
            <>
              <div className="p-6 border-b border-[#E8D8D1] bg-[#F7F1EE]/30">
                <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-4 mb-6">
                  <div className="w-full sm:w-auto">
                    <h3 className="text-xl font-serif text-[#2C1E16] mb-1">
                      {selectedMsg.firstName} {selectedMsg.lastName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#8E5E4F] break-all">
                      <a href={`mailto:${selectedMsg.email}`} className="flex items-center gap-1.5 hover:text-[#B47A67] transition-colors">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{selectedMsg.email}</span>
                      </a>
                      {selectedMsg.phoneNumber && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{selectedMsg.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    {selectedMsg.status !== 'resolved' && (
                      <>
                        {selectedMsg.status !== 'investigating' && (
                          <button 
                            onClick={() => handleStatusChange(selectedMsg.id, 'investigating')}
                            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors"
                          >
                            <Search className="w-4 h-4" /> Investigate
                          </button>
                        )}
                        <button 
                          onClick={() => handleStatusChange(selectedMsg.id, 'resolved')}
                          className="flex items-center gap-2 px-4 py-2 bg-[#2C1E16] text-white rounded-xl text-sm font-medium hover:bg-[#B47A67] transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Mark Resolved
                        </button>
                      </>
                    )}
                    {selectedMsg.status === 'resolved' && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Resolved
                      </div>
                    )}
                    <button 
                      onClick={() => setMsgToDelete(selectedMsg)}
                      className="flex items-center gap-2 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Delete message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedMsg.orderNumber && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E8D8D1] rounded-lg text-sm text-[#2C1E16]">
                    <span className="text-[#8E5E4F]/60">Related Order:</span>
                    <span className="font-medium font-mono">{selectedMsg.orderNumber}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs text-[#8E5E4F]/50">
                    <Clock className="w-3.5 h-3.5" />
                    Sent on {formatDate(selectedMsg.createdAt)}
                  </div>
                  
                  <div className="bg-[#F7F1EE]/50 border border-[#E8D8D1] rounded-2xl p-6 text-[#2C1E16] leading-relaxed whitespace-pre-wrap text-sm">
                    {selectedMsg.message}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8D8D1]">
                  <h4 className="text-sm font-medium text-[#2C1E16] mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#B47A67]" />
                    Internal Notes
                  </h4>
                  <div className="relative">
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Add private notes for your team here..."
                      className="w-full bg-[#F7F1EE] border border-transparent focus:border-[#B47A67] rounded-xl p-4 text-sm outline-none transition-colors resize-none min-h-[120px]"
                    />
                    <button 
                      onClick={handleSaveNotes}
                      disabled={internalNotes === (selectedMsg.internalNotes || '')}
                      className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-[#2C1E16] text-white rounded-lg text-xs font-medium hover:bg-[#B47A67] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-3 h-3" /> Save Notes
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#E8D8D1] bg-[#F7F1EE]/30 flex flex-col sm:flex-row gap-4">
                <a 
                  href={`mailto:${selectedMsg.email}?subject=Reply from Thealankar Support`}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-[#E8D8D1] text-[#8E5E4F] rounded-xl text-sm font-medium hover:border-[#B47A67] hover:text-[#B47A67] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Email Reply
                </a>
                {selectedMsg.phoneNumber ? (
                  <a 
                    href={`https://wa.me/${selectedMsg.phoneNumber.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(getWhatsAppMessage(selectedMsg))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-sm font-medium hover:bg-[#1DA851] transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Reply
                  </a>
                ) : (
                  <button 
                    disabled
                    title="No phone number provided"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-sm font-medium opacity-50 cursor-not-allowed shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Reply
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-[#F7F1EE] rounded-full flex items-center justify-center mb-6">
                <Mail className="w-10 h-10 text-[#E8D8D1]" />
              </div>
              <h3 className="font-serif text-xl text-[#2C1E16] mb-2">No Message Selected</h3>
              <p className="text-[#8E5E4F]/60 max-w-sm">
                Select a message from the list on the left to view its full details and respond to the customer.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      <ConfirmDeleteModal
        isOpen={!!msgToDelete}
        onClose={() => setMsgToDelete(null)}
        onConfirm={() => msgToDelete && handleDeleteMessage(msgToDelete.id)}
        title="Delete Message"
        message={`Are you sure you want to delete the message from ${msgToDelete?.firstName}? This action cannot be undone.`}
      />
    </div>
  );
}
