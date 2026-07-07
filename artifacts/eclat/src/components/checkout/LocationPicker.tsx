import { useEffect, useState } from 'react';
import { MapPin, Navigation, X, ClipboardList, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface LocationPickerProps {
  customerDetails: CustomerDetails;
  onLocationSelect: (details: Partial<CustomerDetails>) => void;
}

const inputClass = "w-full bg-white/60 border border-[#E8D8D1] rounded-sm px-4 py-3 text-sm text-[#8E5E4F] placeholder:text-[#8E5E4F]/30 focus:outline-none focus:border-[#B47A67] transition-colors";
const labelClass = "block text-xs tracking-widest uppercase text-[#8E5E4F]/70 mb-2";

export default function LocationPicker({ customerDetails, onLocationSelect }: LocationPickerProps) {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [addressForm, setAddressForm] = useState<Partial<CustomerDetails>>({});

  useEffect(() => {
    setAddressForm({
      firstName: customerDetails.firstName,
      lastName: customerDetails.lastName,
      phone: customerDetails.phone,
      address: customerDetails.address,
      city: customerDetails.city,
      state: customerDetails.state,
      zipCode: customerDetails.zipCode,
    });
  }, [customerDetails]);

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const [regularResponse, streetResponse] = await Promise.all([
          fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${apiKey}`),
          fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=street_address&language=en&key=${apiKey}`),
        ]);
        const [regularData, streetData] = await Promise.all([regularResponse.json(), streetResponse.json()]);
        const allResults: any[] = [...(regularData.results || []), ...(streetData.results || [])];
        if (allResults.length > 0) {
          let premise = '', streetNumber = '', route = '', neighborhood = '';
          let sublocality1 = '', locality = '', administrativeAreaLevel2 = '';
          let administrativeAreaLevel1 = '', postalCode = '';
          let bestFormattedAddress = allResults[0].formatted_address;
          for (const result of allResults) {
            const components = result.address_components;
            if (!components) continue;
            if (result.types.includes('street_address') || result.types.includes('route')) {
              bestFormattedAddress = result.formatted_address;
            }
            components.forEach((c: any) => {
              const t = c.types;
              if (t.includes('premise') && !premise) premise = c.long_name;
              if (t.includes('street_number') && !streetNumber) streetNumber = c.long_name;
              if (t.includes('route') && !route) route = c.long_name;
              if (t.includes('neighborhood') && !neighborhood) neighborhood = c.long_name;
              if ((t.includes('sublocality_level_1') || t.includes('sublocality')) && !sublocality1) sublocality1 = c.long_name;
              if (t.includes('locality') && !locality) locality = c.long_name;
              if (t.includes('administrative_area_level_2') && !administrativeAreaLevel2) administrativeAreaLevel2 = c.long_name;
              if (t.includes('administrative_area_level_1') && !administrativeAreaLevel1) administrativeAreaLevel1 = c.long_name;
              if (t.includes('postal_code') && !postalCode) postalCode = c.long_name;
            });
          }
          const parts: string[] = [];
          if (premise) parts.push(premise);
          if (streetNumber && route) parts.push(`${streetNumber} ${route}`);
          else if (route) parts.push(route);
          if (neighborhood && !parts.includes(neighborhood)) parts.push(neighborhood);
          if (sublocality1 && !parts.includes(sublocality1)) parts.push(sublocality1);
          let fullAddress = parts.length > 0 ? parts.join(', ') : '';
          if (!fullAddress) {
            const fp = bestFormattedAddress.split(',').map((p: string) => p.trim())
              .filter((p: string) => {
                const lp = p.toLowerCase();
                if (/^\d{5,6}$/.test(p.trim())) return false;
                if (administrativeAreaLevel1 && lp === administrativeAreaLevel1.toLowerCase()) return false;
                if (lp === 'india') return false;
                return true;
              });
            fullAddress = fp.join(', ');
          }
          setAddressForm(prev => ({
            ...prev,
            address: fullAddress.trim(),
            city: (locality || administrativeAreaLevel2 || sublocality1 || '').trim(),
            state: (administrativeAreaLevel1 || '').trim(),
            zipCode: (postalCode || '').trim(),
          }));
          return;
        }
      }
      // Fallback: OpenStreetMap
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`
      );
      const data = await response.json();
      if (data.address) {
        const addr = data.address;
        const city = addr.city || addr.town || addr.municipality || addr.county || addr.village || '';
        const state = addr.state || addr.province || addr.region || '';
        const zipCode = addr.postcode || '';
        const parts: string[] = [];
        if (addr.house_number) parts.push(addr.house_number);
        if (addr.road || addr.street) parts.push(addr.road || addr.street);
        if (addr.neighbourhood) parts.push(addr.neighbourhood);
        if (addr.suburb && addr.suburb !== addr.neighbourhood) parts.push(addr.suburb);
        if (addr.village && !parts.includes(addr.village)) parts.push(addr.village);
        setAddressForm(prev => ({
          ...prev,
          address: parts.join(', ').trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
        }));
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  };

  const handleUseCurrentLocation = () => {
    setIsLoadingLocation(true);
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLoadingLocation(false);
      setShowLocationModal(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCoords({ lat: latitude, lng: longitude });
        await fetchAddressFromCoords(latitude, longitude);
        setIsLoadingLocation(false);
        setShowLocationModal(true);
      },
      (error) => {
        let message = 'Unable to get your location. ';
        if (error.code === error.PERMISSION_DENIED) message += 'Location permission denied.';
        else if (error.code === error.POSITION_UNAVAILABLE) message += 'Location unavailable.';
        else if (error.code === error.TIMEOUT) message += 'Location request timed out.';
        setLocationError(message);
        setIsLoadingLocation(false);
        setShowLocationModal(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleEnterManually = () => {
    setLocationError('');
    setMapCoords(null);
    setShowLocationModal(true);
  };

  const handleAddressFormChange = (field: keyof CustomerDetails, value: string) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmLocation = () => {
    if (!addressForm.address?.trim() || !addressForm.city?.trim()) {
      setLocationError('Please fill in address and city');
      return;
    }
    setLocationError('');
    onLocationSelect(addressForm);
    setShowLocationModal(false);
  };

  return (
    <div className="w-full">
      {/* Location Picker Card */}
      <div className="bg-[#FBF6F3] border border-[#E8D8D1] rounded-sm p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg text-[#8E5E4F] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#B47A67]" />
              Delivery Location
            </h3>
            <p className="text-xs text-[#8E5E4F]/50 mt-1">Select or confirm your delivery address</p>
          </div>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLoadingLocation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#B47A67] text-white text-xs uppercase tracking-widest font-medium hover:bg-[#A86F5C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Navigation className="w-4 h-4" />
            {isLoadingLocation ? 'Getting Location...' : 'Use My Current Location'}
          </button>
          <button
            type="button"
            onClick={handleEnterManually}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#E8D8D1] text-[#8E5E4F] text-xs uppercase tracking-widest font-medium hover:bg-[#F7F1EE] transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Enter Address Manually
          </button>
        </div>
        {locationError && !showLocationModal && (
          <p className="text-amber-600 text-xs mt-3">{locationError}</p>
        )}
      </div>

      {/* Location Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          >
            <div className="h-full flex items-end md:items-center md:justify-center md:p-6 pb-16 md:pb-0">
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full md:max-w-xl lg:max-w-2xl max-h-[85vh] md:max-h-[90vh] bg-[#F7F1EE] rounded-t-2xl md:rounded-sm shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div className="flex-shrink-0 bg-[#F7F1EE] border-b border-[#E8D8D1] px-4 sm:px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FBF6F3] rounded-full flex items-center justify-center border border-[#E8D8D1]">
                        <MapPin className="w-5 h-5 text-[#B47A67]" />
                      </div>
                      <div>
                        <h2 className="font-serif text-lg text-[#8E5E4F]">Delivery Address</h2>
                        <p className="text-xs text-[#8E5E4F]/50 hidden sm:block">Confirm your delivery location</p>
                      </div>
                    </div>
                    <button onClick={() => setShowLocationModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#FBF6F3] hover:bg-[#E8D8D1] transition-colors border border-[#E8D8D1]">
                      <X className="w-5 h-5 text-[#8E5E4F]" />
                    </button>
                  </div>
                  <div className="md:hidden w-12 h-1 bg-[#E8D8D1] rounded-full mx-auto mt-3" />
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                  <div className="p-4 sm:p-6 space-y-5">
                    {mapCoords && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs tracking-wider uppercase text-[#8E5E4F]/50 flex items-center gap-1.5 font-medium">
                            <MapPin className="w-3 h-3 text-[#B47A67]" />Your Location
                          </label>
                          <span className="text-[10px] text-[#8E5E4F]/40 font-mono">{mapCoords.lat.toFixed(4)}, {mapCoords.lng.toFixed(4)}</span>
                        </div>
                        <div className="w-full h-40 sm:h-48 md:h-56 rounded-sm overflow-hidden border border-[#E8D8D1] bg-[#FBF6F3]">
                          <iframe title="Delivery location map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={`https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&output=embed`} />
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      <h3 className="text-xs tracking-wider uppercase text-[#8E5E4F]/50 flex items-center gap-2 font-medium">
                        <ClipboardList className="w-3 h-3 text-[#B47A67]" />Address Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>First Name</label>
                          <input type="text" value={addressForm.firstName || ''} onChange={e => handleAddressFormChange('firstName', e.target.value)} placeholder="First name" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Last Name</label>
                          <input type="text" value={addressForm.lastName || ''} onChange={e => handleAddressFormChange('lastName', e.target.value)} placeholder="Last name" className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Contact Number</label>
                        <input type="tel" value={addressForm.phone || ''} onChange={e => handleAddressFormChange('phone', e.target.value)} placeholder="10-digit mobile number" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Full Address</label>
                        <input type="text" value={addressForm.address || ''} onChange={e => handleAddressFormChange('address', e.target.value)} placeholder="House no, Street, Landmark, Area" className={inputClass} />
                        <p className="text-[10px] text-[#8E5E4F]/40 mt-1 flex items-center gap-1"><span className="text-[#B47A67]">•</span>Add nearby landmark for accurate delivery</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                          <label className={labelClass}>Pincode</label>
                          <input type="text" value={addressForm.zipCode || ''} onChange={e => handleAddressFormChange('zipCode', e.target.value.slice(0, 6))} placeholder="6-digit" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>City</label>
                          <input type="text" value={addressForm.city || ''} onChange={e => handleAddressFormChange('city', e.target.value)} placeholder="City" className={inputClass} />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className={labelClass}>State</label>
                          <input type="text" value={addressForm.state || ''} onChange={e => handleAddressFormChange('state', e.target.value)} placeholder="State" className={inputClass} />
                        </div>
                      </div>
                    </div>
                    {locationError && (
                      <div className="bg-red-50 border border-red-200 rounded-sm p-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm">{locationError}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 bg-[#F7F1EE] border-t border-[#E8D8D1] p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowLocationModal(false)} className="w-full py-3 text-xs font-medium border border-[#E8D8D1] text-[#8E5E4F] hover:bg-[#FBF6F3] transition-colors uppercase tracking-widest">Cancel</button>
                    <button onClick={handleConfirmLocation} className="w-full py-3 text-xs font-medium bg-[#B47A67] text-white hover:bg-[#A86F5C] transition-colors uppercase tracking-widest">Confirm Address</button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
