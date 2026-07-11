import React, { useState, useEffect } from 'react';
import { MapPin, Search, ArrowLeft, Navigation, X, Building, Home, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAddress } from '../../lib/user';

interface AddressMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: UserAddress) => void;
  initialName?: string;
  initialPhone?: string;
}

export default function AddressMapModal({ isOpen, onClose, onSave, initialName, initialPhone }: AddressMapModalProps) {
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Form State
  const [label, setLabel] = useState<'Home' | 'Work' | 'College' | 'Other'>('Home');
  const [fullAddress, setFullAddress] = useState('');
  const [street, setStreet] = useState(''); // Flat/House No
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [name, setName] = useState(initialName || '');
  const [phone, setPhone] = useState(initialPhone || '');

  // Auto-fetch location on open
  useEffect(() => {
    if (isOpen && !mapCoords) {
      handleUseCurrentLocation();
    }
  }, [isOpen]);

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
          let fa = parts.length > 0 ? parts.join(', ') : '';
          if (!fa) {
            const fp = bestFormattedAddress.split(',').map((p: string) => p.trim())
              .filter((p: string) => {
                const lp = p.toLowerCase();
                if (/^\d{5,6}$/.test(p.trim())) return false;
                if (administrativeAreaLevel1 && lp === administrativeAreaLevel1.toLowerCase()) return false;
                if (lp === 'india') return false;
                return true;
              });
            fa = fp.join(', ');
          }
          setFullAddress(fa.trim());
          setCity((locality || administrativeAreaLevel2 || sublocality1 || '').trim());
          setDistrict((administrativeAreaLevel2 || '').trim());
          setState((administrativeAreaLevel1 || '').trim());
          setZipCode((postalCode || '').trim());
          return;
        }
      }

      // Fallback: OpenStreetMap Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`
      );
      const data = await response.json();
      if (data.address) {
        const addr = data.address;
        const fetchedCity = addr.city || addr.town || addr.municipality || addr.county || addr.village || '';
        const fetchedDistrict = addr.county || addr.state_district || addr.district || '';
        const fetchedState = addr.state || addr.province || addr.region || '';
        const fetchedZip = addr.postcode || '';

        const parts: string[] = [];
        if (addr.house_number) parts.push(addr.house_number);
        if (addr.road || addr.street) parts.push(addr.road || addr.street);
        if (addr.neighbourhood) parts.push(addr.neighbourhood);
        if (addr.suburb && addr.suburb !== addr.neighbourhood) parts.push(addr.suburb);
        if (addr.village && !parts.includes(addr.village)) parts.push(addr.village);

        setFullAddress(parts.join(', ').trim() || data.display_name);
        setCity(fetchedCity.trim());
        setDistrict(fetchedDistrict.trim());
        setState(fetchedState.trim());
        setZipCode(fetchedZip.trim());
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
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCoords({ lat: latitude, lng: longitude });
        await fetchAddressFromCoords(latitude, longitude);
        setIsLoadingLocation(false);
      },
      (error) => {
        setLocationError('Please allow location access to drop pin automatically.');
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = () => {
    if (!street.trim() || !fullAddress.trim() || !name.trim() || !phone.trim()) {
      setLocationError('Please fill in all required details');
      return;
    }

    const newAddress: UserAddress = {
      id: Math.random().toString(36).substr(2, 9),
      label,
      name,
      phone,
      street,
      fullAddress,
      city,
      district,
      state,
      zipCode,
      country: 'India',
      coordinates: mapCoords || undefined,
      distance: '0 m' // Placeholder for UI matching
    };

    onSave(newAddress);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#F7F1EE] md:bg-black/50 md:backdrop-blur-sm flex items-end md:items-center justify-center"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full md:max-w-2xl h-full md:h-[85vh] bg-[#F7F1EE] md:rounded-xl flex flex-col overflow-hidden shadow-2xl relative"
          >
            {/* Top Search Bar (Floating over map) */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6 bg-gradient-to-b from-black/20 to-transparent">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md text-[#8E5E4F] hover:bg-gray-50 transition-colors shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 bg-white rounded-xl h-12 flex items-center px-4 shadow-sm border border-[#E8D8D1]/50">
                  <Search className="w-5 h-5 text-[#8E5E4F]/50 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search for area, street name..."
                    className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-[#8E5E4F] placeholder:text-[#8E5E4F]/50"
                  />
                </div>
              </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative bg-[#E8D8D1]/30">
              {mapCoords ? (
                <iframe
                  title="Delivery location map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&output=embed&z=16`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#8E5E4F]/50 text-sm">
                  {isLoadingLocation ? 'Locating you...' : 'No location selected'}
                </div>
              )}

              {/* Target Pin (Center) */}
              {mapCoords && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm" />
                  </div>
                </div>
              )}

              {/* Get Current Location Button */}
              <button
                onClick={handleUseCurrentLocation}
                className="absolute bottom-6 right-4 w-12 h-12 bg-white rounded-full shadow-lg border border-[#E8D8D1] flex items-center justify-center text-[#B47A67] hover:bg-gray-50"
              >
                <Navigation className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Sheet Form */}
            <div className="bg-white rounded-t-[24px] -mt-4 relative z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex flex-col max-h-[65vh]">
              {/* Drag Handle */}
              <div className="w-full pt-3 pb-2 flex justify-center shrink-0 bg-white rounded-t-[24px] z-10 absolute top-0 left-0 right-0">
                <div className="w-10 h-1 bg-[#E8D8D1] rounded-full" />
              </div>

              <div className="space-y-5 px-5 pt-10 pb-32 overflow-y-auto flex-1 h-full">
                {/* Location Summary */}
                <div>
                  <h3 className="text-xs font-semibold text-[#8E5E4F]/70 uppercase tracking-widest mb-2">Delivery details</h3>
                  <div className="flex items-start gap-3 p-3 border border-[#E8D8D1] rounded-xl bg-[#FBF6F3]">
                    <MapPin className="w-5 h-5 text-[#B47A67] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-[#8E5E4F] line-clamp-2">{fullAddress || 'Locating...'}</h4>
                      {city && state && <p className="text-xs text-[#8E5E4F]/60 mt-0.5">{[city, district, state].filter(Boolean).join(', ')}, India</p>}
                    </div>
                  </div>
                </div>

                {/* Form Inputs */}
                <div>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Address details* (E.g. Floor, House no.)"
                    className="w-full px-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors"
                  />
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="District"
                    className="w-full px-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors"
                  />
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="PIN Code"
                    className="w-full px-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors"
                  />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-[#8E5E4F]/70 uppercase tracking-widest mb-2 mt-2">Receiver details for this address</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Name"
                      className="w-full sm:w-1/2 px-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone Number"
                      className="w-full sm:w-1/2 px-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors"
                    />
                  </div>
                </div>

                {/* Label Selection */}
                <div>
                  <h3 className="text-xs font-semibold text-[#8E5E4F]/70 uppercase tracking-widest mb-2 mt-2">Save as</h3>
                  <div className="flex items-center gap-3">
                    {[
                      { id: 'Home', icon: Home },
                      { id: 'Work', icon: Briefcase },
                      { id: 'College', icon: Building },
                      { id: 'Other', icon: MapPin }
                    ].map((l) => {
                      const Icon = l.icon;
                      const isActive = label === l.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => setLabel(l.id as any)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors border ${isActive
                            ? 'bg-[#B47A67] text-white border-[#B47A67]'
                            : 'bg-white text-[#8E5E4F] border-[#E8D8D1] hover:bg-[#FBF6F3]'
                            }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {l.id}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {locationError && <p className="text-red-500 text-xs text-center pb-2">{locationError}</p>}
              </div>

              {/* Absolute Sticky Save Button */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 bg-white border-t border-[#E8D8D1]/50 z-20" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 16px)' }}>
                <button
                  onClick={handleSave}
                  className="w-full py-4 bg-[#B47A67] text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-[#8E5E4F] transition-colors shadow-[0_-4px_15px_rgba(0,0,0,0.05)] shadow-[#B47A67]/20"
                >
                  Save address
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
