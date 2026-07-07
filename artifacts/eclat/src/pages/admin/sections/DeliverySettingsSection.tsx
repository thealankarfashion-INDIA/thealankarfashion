import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Plus, Trash2, Loader2, Check, AlertTriangle, Truck, Zap } from "lucide-react";
import { getDB } from "@/lib/supabase";
import { doc, getDoc, setDoc, serverTimestamp } from "@/lib/supabaseStore";
import { DeliverySettings, DeliveryRange } from "@/hooks/useDelivery";

export function DeliverySettingsSection() {
  const [settings, setSettings] = useState<DeliverySettings>({
    mode: 'fixed',
    fixedCharge: 80,
    freeDeliveryEnabled: true,
    freeDeliveryThreshold: 999,
    expressDeliveryEnabled: true,
    expressDeliveryCharge: 150,
    ranges: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [previewSubtotal, setPreviewSubtotal] = useState(1200);

  useEffect(() => {
    (async () => { 
      try { 
        const snap = await getDoc(doc(getDB(), "settings", "deliverySettings")); 
        if (snap.exists()) {
          setSettings({ 
            mode: 'fixed',
            fixedCharge: 80,
            freeDeliveryEnabled: true,
            freeDeliveryThreshold: 999,
            expressDeliveryEnabled: true,
            expressDeliveryCharge: 150,
            ranges: [],
            ...snap.data() 
          });
        }
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      } 
    })();
  }, []);

  const validateRanges = () => {
    if (settings.mode !== 'range') return true;
    if (settings.ranges.length === 0) {
      setErrorMsg("Please add at least one range rule or switch to Fixed mode.");
      return false;
    }

    const sorted = [...settings.ranges].sort((a, b) => a.min - b.min);
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      if (r.charge < 0) {
        setErrorMsg(`Charge cannot be negative for range starting at ₹${r.min}`);
        return false;
      }
      if (r.max !== null && r.min >= r.max) {
        setErrorMsg(`Minimum order must be less than Maximum order for range starting at ₹${r.min}`);
        return false;
      }
      if (i > 0) {
        const prev = sorted[i - 1];
        if (prev.max === null || r.min <= prev.max) {
          setErrorMsg("Ranges cannot overlap. Please adjust the Minimum and Maximum values.");
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async () => { 
    setErrorMsg("");
    if (!validateRanges()) return;

    setSaving(true); 
    try { 
      // Ensure sorted before saving
      const sortedRanges = [...settings.ranges].sort((a, b) => a.min - b.min);
      const dataToSave = { 
        ...settings, 
        ranges: sortedRanges,
        updatedAt: serverTimestamp() 
      };
      
      await setDoc(doc(getDB(), "settings", "deliverySettings"), dataToSave); 
      setSettings(dataToSave as DeliverySettings); // update state with sorted ranges
      
      setSuccessMsg("Delivery settings saved successfully."); 
      setTimeout(() => setSuccessMsg(""), 3000); 
    } catch (err) { 
      console.error(err); 
      setErrorMsg("Failed to save delivery settings."); 
    } finally { 
      setSaving(false); 
    } 
  };

  const addRange = () => {
    const newId = Date.now().toString();
    const lastRange = settings.ranges.length > 0 ? [...settings.ranges].sort((a, b) => b.min - a.min)[0] : null;
    const newMin = lastRange && lastRange.max !== null ? lastRange.max + 1 : 0;
    
    setSettings({
      ...settings,
      ranges: [...settings.ranges, { id: newId, min: newMin, max: null, charge: 50, expressCharge: settings.expressDeliveryCharge || 150 }]
    });
  };

  const updateRange = (id: string, field: keyof DeliveryRange, value: any) => {
    setSettings({
      ...settings,
      ranges: settings.ranges.map(r => r.id === id ? { ...r, [field]: value } : r)
    });
  };

  const removeRange = (id: string) => {
    setSettings({
      ...settings,
      ranges: settings.ranges.filter(r => r.id !== id)
    });
  };

  const calculatePreview = () => {
    if (settings.freeDeliveryEnabled && previewSubtotal >= settings.freeDeliveryThreshold) {
      return 0;
    }
    if (settings.mode === 'range' && settings.ranges.length > 0) {
      const activeRange = settings.ranges.find((range) => {
        const isAboveMin = previewSubtotal >= range.min;
        const isBelowMax = range.max === null || previewSubtotal <= range.max;
        return isAboveMin && isBelowMax;
      });
      if (activeRange) return activeRange.charge;
    }
    return settings.fixedCharge;
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-[#B47A67]" /></div>;

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-serif text-2xl text-[#8E5E4F]">Delivery Charges</h2>
          <p className="text-xs text-[#8E5E4F]/50 mt-0.5">Manage shipping and delivery rules</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="w-full sm:w-auto justify-center flex items-center gap-2 px-6 py-2.5 bg-[#B47A67] text-white rounded-xl text-sm font-medium hover:bg-[#A86F5C] transition-all">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
        </button>
      </div>

      {successMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-green-50 text-green-700 border border-green-200 px-5 py-4 rounded-xl flex items-center gap-3">
          <Check className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium">{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-50 text-red-700 border border-red-200 px-5 py-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </motion.div>
      )}

      <div className="space-y-6">
        
        {/* Free Delivery Settings */}
        <div className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-[#F7F1EE] border-b border-[#E8D8D1] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#8E5E4F] flex items-center gap-2"><Truck className="h-4 w-4 text-[#B47A67]" /> Free Delivery Support</h3>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={settings.freeDeliveryEnabled} onChange={(e) => setSettings({ ...settings, freeDeliveryEnabled: e.target.checked })} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${settings.freeDeliveryEnabled ? 'bg-[#B47A67]' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.freeDeliveryEnabled ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
          {settings.freeDeliveryEnabled && (
            <div className="p-6">
              <label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">Free Delivery Minimum Order Amount (₹)</label>
              <input type="number" value={settings.freeDeliveryThreshold} onChange={e => setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })} className="w-full max-w-xs px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-all" />
              <p className="text-xs text-[#8E5E4F]/50 mt-2">Orders above this amount will automatically qualify for free delivery.</p>
            </div>
          )}
        </div>

        {/* Express Delivery Settings */}
        <div className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-[#F7F1EE] border-b border-[#E8D8D1] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#8E5E4F] flex items-center gap-2"><Zap className="h-4 w-4 text-[#B47A67]" /> Express Delivery</h3>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={settings.expressDeliveryEnabled} onChange={(e) => setSettings({ ...settings, expressDeliveryEnabled: e.target.checked })} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${settings.expressDeliveryEnabled ? 'bg-[#B47A67]' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.expressDeliveryEnabled ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
          {settings.expressDeliveryEnabled && (
            <div className="p-6">
              <label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">Express Delivery Charge (₹)</label>
              <input type="number" value={settings.expressDeliveryCharge} onChange={e => setSettings({ ...settings, expressDeliveryCharge: Number(e.target.value) })} className="w-full max-w-xs px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-all" />
              <p className="text-xs text-[#8E5E4F]/50 mt-2">This flat fee will apply when a user selects Express Delivery at checkout.</p>
            </div>
          )}
        </div>

        {/* Pricing Mode */}
        <div className="bg-white border border-[#E8D8D1] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-[#F7F1EE] border-b border-[#E8D8D1]">
            <h3 className="text-sm font-semibold text-[#8E5E4F] flex items-center gap-2">Delivery Pricing Mode</h3>
          </div>
          <div className="p-6">
            <div className="flex gap-4 mb-6">
              <label className={`flex-1 border rounded-xl p-4 cursor-pointer transition-colors ${settings.mode === 'fixed' ? 'border-[#B47A67] bg-[#B47A67]/5' : 'border-[#E8D8D1] hover:bg-[#F7F1EE]'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <input type="radio" name="mode" checked={settings.mode === 'fixed'} onChange={() => setSettings({ ...settings, mode: 'fixed' })} className="accent-[#B47A67]" />
                  <span className="font-semibold text-[#8E5E4F]">Fixed Charge</span>
                </div>
                <p className="text-xs text-[#8E5E4F]/60 ml-6">Apply a single flat delivery charge to all orders.</p>
              </label>
              <label className={`flex-1 border rounded-xl p-4 cursor-pointer transition-colors ${settings.mode === 'range' ? 'border-[#B47A67] bg-[#B47A67]/5' : 'border-[#E8D8D1] hover:bg-[#F7F1EE]'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <input type="radio" name="mode" checked={settings.mode === 'range'} onChange={() => setSettings({ ...settings, mode: 'range' })} className="accent-[#B47A67]" />
                  <span className="font-semibold text-[#8E5E4F]">Order Amount Based</span>
                </div>
                <p className="text-xs text-[#8E5E4F]/60 ml-6">Calculate delivery charge based on cart subtotal ranges.</p>
              </label>
            </div>

            {settings.mode === 'fixed' && (
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40 mb-2">Fixed Delivery Charge (₹)</label>
                <input type="number" value={settings.fixedCharge} onChange={e => setSettings({ ...settings, fixedCharge: Number(e.target.value) })} className="w-full max-w-xs px-4 py-3 bg-[#F7F1EE] border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-all" />
              </div>
            )}

            {settings.mode === 'range' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] tracking-widest uppercase text-[#8E5E4F]/40">Delivery Rules</label>
                  <button onClick={addRange} className="flex items-center gap-1.5 text-xs text-[#B47A67] font-semibold hover:text-[#8E5E4F] transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Rule
                  </button>
                </div>
                
                <div className="bg-[#F7F1EE] rounded-xl border border-[#E8D8D1] overflow-hidden">
                  {settings.ranges.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#8E5E4F]/50">No delivery rules defined. Add a rule to get started.</div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#E8D8D1]/30 text-[#8E5E4F] text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-medium">Min Order (₹)</th>
                          <th className="px-4 py-3 font-medium">Max Order (₹)</th>
                          <th className="px-4 py-3 font-medium">Standard (₹)</th>
                          {settings.expressDeliveryEnabled && <th className="px-4 py-3 font-medium">Express (₹)</th>}
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8D8D1]">
                        {settings.ranges.map((range, index) => (
                          <tr key={range.id} className="bg-white">
                            <td className="px-4 py-3">
                              <input type="number" value={range.min} onChange={e => updateRange(range.id, 'min', Number(e.target.value))} className="w-full px-3 py-2 bg-[#F7F1EE] border border-[#E8D8D1] rounded-lg outline-none focus:border-[#B47A67]" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <input type="number" value={range.max === null ? '' : range.max} placeholder="No limit" onChange={e => updateRange(range.id, 'max', e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 bg-[#F7F1EE] border border-[#E8D8D1] rounded-lg outline-none focus:border-[#B47A67]" />
                                {range.max === null && <span className="text-xs text-[#8E5E4F]/50 whitespace-nowrap">and above</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" value={range.charge} onChange={e => updateRange(range.id, 'charge', Number(e.target.value))} className="w-full px-3 py-2 bg-[#F7F1EE] border border-[#E8D8D1] rounded-lg outline-none focus:border-[#B47A67]" />
                            </td>
                            {settings.expressDeliveryEnabled && (
                              <td className="px-4 py-3">
                                <input type="number" value={range.expressCharge ?? (settings.expressDeliveryCharge || 150)} onChange={e => updateRange(range.id, 'expressCharge', Number(e.target.value))} className="w-full px-3 py-2 bg-[#F7F1EE] border border-[#E8D8D1] rounded-lg outline-none focus:border-[#B47A67]" />
                              </td>
                            )}
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => removeRange(range.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="bg-[#B47A67]/5 border border-[#B47A67]/20 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#8E5E4F] mb-4">Preview Calculator</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs text-[#8E5E4F]/60 mb-1">Enter Cart Subtotal (₹)</label>
              <input type="number" value={previewSubtotal} onChange={e => setPreviewSubtotal(Number(e.target.value))} className="w-full px-4 py-3 bg-white border border-[#E8D8D1] rounded-xl text-sm outline-none focus:border-[#B47A67]" />
            </div>
            <div className="hidden sm:block text-[#E8D8D1] mt-5">→</div>
            <div className="flex-1 w-full bg-white p-4 rounded-xl border border-[#E8D8D1] flex items-center justify-between">
              <span className="text-sm text-[#8E5E4F]">Calculated Delivery Charge:</span>
              <span className="font-serif text-xl text-[#B47A67]">
                {calculatePreview() === 0 ? "FREE" : `₹${calculatePreview()}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
