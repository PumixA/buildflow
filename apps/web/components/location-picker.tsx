'use client';

import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Minimal Leaflet types — on ne charge pas le paquet npm, le script */
/*  et le CSS sont injectés depuis le CDN à l'init de la carte.       */
/* ------------------------------------------------------------------ */

interface LMarker {
  setLatLng(latlng: LLatLng): LMarker;
  addTo(map: LMap): LMarker;
  on(event: string, fn: () => void): void;
}
interface LMap {
  setView(center: [number, number], zoom: number): LMap;
  on(event: string, fn: (e: { latlng: LLatLng }) => void): void;
}
interface LLatLng {
  lat: number;
  lng: number;
}
interface Leaflet {
  map(el: HTMLElement, opts?: Record<string, unknown>): LMap;
  tileLayer(url: string, opts?: Record<string, unknown>): { addTo(map: LMap): void };
  marker(latlng: [number, number], opts?: Record<string, unknown>): LMarker;
}

declare global {
  interface Window {
    L: Leaflet;
  }
}

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_LAT = 46.603354;
const DEFAULT_LNG = 1.888334;
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

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
  const mapInstance = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ lat: string; lon: string; display_name: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [localizing, setLocalizing] = useState(false);
  const localizingRef = useRef(false);
  const [ready, setReady] = useState(false);

  /* Initialisation de la carte ------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // Injecter le CSS Leaflet si pas déjà présent
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = LEAFLET_CSS;
        link.setAttribute('data-leaflet', '1');
        document.head.appendChild(link);
      }

      // Charger le JS Leaflet si pas déjà présent
      if (!window.L) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = LEAFLET_JS;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Impossible de charger la carte'));
          document.head.appendChild(script);
        });
      }

      if (cancelled || !mapRef.current || mapInstance.current) return;

      const L = window.L;
      const startLat = initialLat ?? DEFAULT_LAT;
      const startLng = initialLng ?? DEFAULT_LNG;

      const map = L.map(mapRef.current, {
        zoomControl: true
      }).setView([startLat, startLng], initialLat ? 15 : 6);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const pos = (marker as unknown as { getLatLng(): LLatLng }).getLatLng();
        onChangeRef.current({ lat: pos.lat, lng: pos.lng });
      });

      map.on('click', (e: { latlng: LLatLng }) => {
        if (localizingRef.current) return;
        marker.setLatLng(e.latlng);
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapInstance.current = map;
      markerRef.current = marker;
      setReady(true);

      onChangeRef.current({ lat: startLat, lng: startLng });
    }

    boot().catch(() => {});
    return () => { cancelled = true; };
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
