export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
}

export async function getLocation(): Promise<LocationData> {
  const empty: LocationData = {
    latitude: null, longitude: null,
    location_city: null, location_region: null, location_country: null,
  };

  try {
    // Get GPS coords via browser Geolocation API
    const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("no geolocation")); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        { timeout: 5000 }
      );
    });

    const { latitude, longitude } = coords;

    // Reverse geocode using free nominatim API (no key needed)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    const geo = await res.json();
    const addr = geo.address ?? {};

    return {
      latitude,
      longitude,
      location_city: addr.city ?? addr.town ?? addr.village ?? addr.county ?? null,
      location_region: addr.state ?? null,
      location_country: addr.country ?? null,
    };
  } catch {
    // If user denies permission or any error — return nulls silently
    return empty;
  }
}
