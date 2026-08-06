'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_LAT = 46.603354;
const DEFAULT_LNG = 1.888334;

/* ------------------------------------------------------------------ */
/*  Composant                                                          */
/* ------------------------------------------------------------------ */

interface LocationPickerProps {
  onChange: (coords: { lat: number; lng: number }) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function LocationPicker({ onChange, initialLat, initialLng }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ lat: string; lon: string; display_name: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [localizing, setLocalizing] = useState(false);
  const localizingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const initDone = useRef(false);

  /* Initialisation de la carte ------------------------------------ */
  useEffect(() => {
    if (initDone.current || !mapRef.current) return;
    initDone.current = true;

    const startLat = initialLat ?? DEFAULT_LAT;
    const startLng = initialLng ?? DEFAULT_LNG;

    const map = L.map(mapRef.current, { zoomControl: true })
      .setView([startLat, startLng], initialLat ? 15 : 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onChangeRef.current({ lat: pos.lat, lng: pos.lng });
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (localizingRef.current) return;
      marker.setLatLng(e.latlng);
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapInstance.current = map;
    markerRef.current = marker;
    setReady(true);

    onChangeRef.current({ lat: startLat, lng: startLng });
  }, [initialLat, initialLng]);

  /* Géolocalisation navigateur ----------------------------------- */
  const localiser = () => {
    if (!navigator.geolocation || !mapInstance.current || !markerRef.current) return;
    localizingRef.current = true;
    setLocalizing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstance.current!.setView([latitude, longitude], 16);
        markerRef.current!.setLatLng({ lat: latitude, lng: longitude });
        onChange({ lat: latitude, lng: longitude });
        localizingRef.current = false;
        setLocalizing(false);
      },
      () => {
        localizingRef.current = false;
        setLocalizing(false);
      }
    );
  };

  /* Recherche d'adresse via Nominatim ---------------------------- */
  const rechercher = async () => {
    if (!query.trim() || !mapInstance.current || !markerRef.current) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=fr`
      );
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
      setResults(data);
      if (data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        mapInstance.current!.setView([lat, lng], 15);
        markerRef.current!.setLatLng({ lat, lng });
        onChange({ lat, lng });
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (item: { lat: string; lon: string; display_name: string }) => {
    if (!mapInstance.current || !markerRef.current) return;
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    mapInstance.current!.setView([lat, lng], 16);
    markerRef.current!.setLatLng({ lat, lng });
    onChange({ lat, lng });
    setResults([]);
    setQuery(item.display_name);
  };

  /* Rendu --------------------------------------------------------- */
  return (
    <div className="lp-root">
      <div className="lp-search-bar">
        <input
          className="field-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && rechercher()}
          placeholder="Rechercher une adresse..."
          style={{ flex: 1 }}
          disabled={localizing}
        />
        <button type="button" className="filter-button" onClick={rechercher} disabled={localizing || searching || !query.trim()}>
          {searching ? '...' : 'Chercher'}
        </button>
        <button type="button" className="filter-button" onClick={localiser} disabled={!ready || localizing}>
          {localizing ? 'Localisation...' : 'Me localiser'}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="lp-results">
          {results.map((item, i) => (
            <li key={i}>
              <button type="button" onClick={() => selectResult(item)}>
                {item.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={mapRef} className="lp-map" />

      <span className="field-hint" style={{ marginTop: 6, display: 'block' }}>
        Cliquez sur la carte pour placer le marqueur, ou recherchez une adresse.
      </span>
    </div>
  );
}
