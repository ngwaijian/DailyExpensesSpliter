import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

// Fix for default marker icon in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }: { position: { lat: number, lng: number } | null, setPosition: (pos: { lat: number, lng: number }) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} draggable={true} eventHandlers={{
      dragend: (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        setPosition(position);
      },
    }} />
  );
}

interface LocationPickerProps {
  locationCoords: { lat: number; lng: number } | undefined;
  setLocationCoords: (coords: { lat: number; lng: number } | undefined) => void;
  locationName: string;
  setLocationName: (name: string) => void;
  showMapInitial?: boolean;
}

export function LocationPicker({ locationCoords, setLocationCoords, locationName, setLocationName, showMapInitial = false }: LocationPickerProps) {
  const { t } = useLanguage();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showMap, setShowMap] = useState(showMapInitial || !!locationCoords);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        if (!locationName) {
          setLocationName(t('form_pinned_location'));
        }
        setIsLoadingLocation(false);
        setShowMap(true);
      },
      (error) => {
        console.error(error);
        alert('Unable to retrieve your location');
        setIsLoadingLocation(false);
      }
    );
  };

  const handleSearchLocation = async () => {
    if (!locationName.trim()) {
      alert('Please enter a location name to search');
      return;
    }

    setIsSearchingLocation(true);
    try {
      const { customFetch } = await import('../../utils/api');
      const response = await customFetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        setLocationCoords({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        });
        setShowMap(true);
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      alert('Error searching for location. Please try again.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  return (
    <div className="col-span-2 md:col-span-12">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('form_location')}</label>
      <div className="relative flex gap-2 mb-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            value={locationName}
            onChange={e => setLocationName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchLocation();
              }
            }}
            placeholder={t('form_location_placeholder')}
            className="w-full pl-10 pr-10 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
          />
          <button
            type="button"
            onClick={handleSearchLocation}
            disabled={isSearchingLocation || !locationName.trim()}
            className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            title={t('form_search_location')}
          >
            {isSearchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={isLoadingLocation}
          className={cn(
            "px-3 rounded-xl border transition-colors flex items-center gap-2",
            locationCoords 
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" 
              : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
          )}
          title={t('form_use_current_location')}
        >
          {isLoadingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
          <span className="hidden sm:inline text-sm font-medium">
            {locationCoords ? t('form_pinned') : t('form_pin')}
          </span>
        </button>
      </div>
      
      {/* Map Preview */}
      {(showMap || locationCoords) && (
        <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 relative z-0">
          <MapContainer 
            center={locationCoords || { lat: 3.140853, lng: 101.693207 }} // Default to KL
            zoom={15} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker 
              position={locationCoords || null} 
              setPosition={(pos) => {
                setLocationCoords(pos);
                if (!locationName) setLocationName(t('form_pinned_location'));
              }} 
            />
          </MapContainer>
        </div>
      )}
      
      {locationCoords && (
        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {t('form_coordinates')} {locationCoords.lat.toFixed(4)}, {locationCoords.lng.toFixed(4)}
        </div>
      )}
    </div>
  );
}
