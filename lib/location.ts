'use client';

export interface LocationData {
  lat: number; lon: number;
  city?: string; state?: string; country?: string;
  ts: number;
}

export function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('Geolocation not supported')); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        // Reverse geocode
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const d = await r.json();
          const addr = d.address;
          const loc: LocationData = {
            lat, lon, ts: Date.now(),
            city: addr.city || addr.town || addr.village || addr.county,
            state: addr.state,
            country: addr.country,
          };
          localStorage.setItem('jarvis_location', JSON.stringify(loc));
          resolve(loc);
        } catch {
          resolve({ lat, lon, ts: Date.now() });
        }
      },
      (err) => reject(err),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

export function getCachedLocation(): LocationData | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('jarvis_location') || 'null'); } catch { return null; }
}

export function getSavedPlaces(): LocationData[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('jarvis_saved_places') || '[]'); } catch { return []; }
}

export function savePlace(place: LocationData) {
  if (typeof window === 'undefined') return;
  const places = getSavedPlaces();
  places.push(place);
  localStorage.setItem('jarvis_saved_places', JSON.stringify(places.slice(-20)));
}
