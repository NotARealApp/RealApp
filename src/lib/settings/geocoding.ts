import type { Place } from "@/lib/planner-settings";

// Bavaria-only: bbox biases Photon to the Bavarian bounding box; the country +
// state filter drops neighbouring regions (e.g. Baden-Württemberg) that leak in.
// URL pins lang=en so `state` is reliably "Bavaria".
const BAVARIA_BBOX = "8.98,47.27,13.84,50.56"; // minLon,minLat,maxLon,maxLat

export async function geocodeAddress(q: string): Promise<Place[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en&bbox=${BAVARIA_BBOX}`;
  const d = await fetch(url).then((r) => r.json());
  return (d.features || [])
    .filter((f: { properties: Record<string, string> }) => {
      const p = f.properties || {};
      return (p.countrycode || "").toUpperCase() === "DE" && p.state === "Bavaria";
    })
    .map((f: { properties: Record<string, string>; geometry: { coordinates: [number, number] } }) => {
      const p = f.properties || {};
      const c = f.geometry.coordinates;
      const street = [p.street, p.housenumber].filter(Boolean).join(" ");
      const label = [p.name, street, p.postcode, p.city, p.country].filter(Boolean).join(", ");
      return { lat: c[1], lon: c[0], label, countryCode: (p.countrycode || "").toUpperCase() };
    });
}

export async function reverseGeocode(lat: number, lon: number): Promise<Place> {
  const url = `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}&lang=en`;
  const d = await fetch(url).then((r) => r.json());
  const f = (d.features || [])[0];
  if (!f) return { lat, lon, label: `${lat.toFixed(5)}, ${lon.toFixed(5)}` };
  const p = f.properties || {};
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const label =
    [p.name, street, p.postcode, p.city, p.country].filter(Boolean).join(", ") ||
    `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  return { lat, lon, label, countryCode: (p.countrycode || "").toUpperCase() };
}

export function haversineKm(a: Place, b: Place) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function hhmm(t: { hour: number; minute: number }) {
  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}
