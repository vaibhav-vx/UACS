// ═══════════════════════════════════════
// UACS — Frontend Zone Detection Utility
// Mirrors backend/utils/zoneMapper.js
// ═══════════════════════════════════════

/**
 * Detect zone from location text and/or GPS coordinates.
 * Returns { zone: "Zone X", city: "CityName", fullZone: "Zone X — CityName" }
 */
export function detectZone(location, lat, lng) {
  // Priority 1: GPS coordinate-based detection
  if (lat && lng) {
    if (lat >= 28.4 && lat <= 28.9 && lng >= 76.8 && lng <= 77.4)
      return { zone: "Zone 1", city: "Delhi NCR", fullZone: "Zone 1 — Delhi NCR" };

    if (lat >= 18.9 && lat <= 19.3 && lng >= 72.7 && lng <= 73.0)
      return { zone: "Zone 2", city: "Mumbai", fullZone: "Zone 2 — Mumbai" };

    if (lat >= 22.4 && lat <= 22.7 && lng >= 88.2 && lng <= 88.5)
      return { zone: "Zone 3", city: "Kolkata", fullZone: "Zone 3 — Kolkata" };

    if (lat >= 12.9 && lat <= 13.2 && lng >= 80.1 && lng <= 80.3)
      return { zone: "Zone 4", city: "Chennai", fullZone: "Zone 4 — Chennai" };

    if (lat >= 12.8 && lat <= 13.1 && lng >= 77.4 && lng <= 77.8)
      return { zone: "Zone 5", city: "Bangalore", fullZone: "Zone 5 — Bangalore" };

    if (lat >= 17.3 && lat <= 17.6 && lng >= 78.3 && lng <= 78.6)
      return { zone: "Zone 6", city: "Hyderabad", fullZone: "Zone 6 — Hyderabad" };

    if (lat >= 18.4 && lat <= 18.7 && lng >= 73.7 && lng <= 74.0)
      return { zone: "Zone 7", city: "Pune", fullZone: "Zone 7 — Pune" };

    if (lat >= 22.9 && lat <= 23.2 && lng >= 72.4 && lng <= 72.8)
      return { zone: "Zone 8", city: "Ahmedabad", fullZone: "Zone 8 — Ahmedabad" };
  }

  // Priority 2: Text-based detection
  if (!location) return { zone: "Zone 9", city: "Other", fullZone: "Zone 9 — Other Regions" };
  const loc = location.toLowerCase();

  if (loc.match(/delhi|noida|gurgaon|gurugram|ncr|faridabad|ghaziabad|dwarka|rohini|connaught/))
    return { zone: "Zone 1", city: "Delhi NCR", fullZone: "Zone 1 — Delhi NCR" };

  if (loc.match(/mumbai|bombay|thane|navi mumbai|andheri|bandra|borivali|malad|dadar|kurla|panvel|kalyan/))
    return { zone: "Zone 2", city: "Mumbai", fullZone: "Zone 2 — Mumbai" };

  if (loc.match(/kolkata|calcutta|howrah|salt lake|dum dum|barasat|park street/))
    return { zone: "Zone 3", city: "Kolkata", fullZone: "Zone 3 — Kolkata" };

  if (loc.match(/chennai|madras|anna salai|adyar|tambaram|velachery|t\.nagar|chromepet/))
    return { zone: "Zone 4", city: "Chennai", fullZone: "Zone 4 — Chennai" };

  if (loc.match(/bangalore|bengaluru|koramangala|whitefield|indiranagar|jayanagar|hebbal|electronic city/))
    return { zone: "Zone 5", city: "Bangalore", fullZone: "Zone 5 — Bangalore" };

  if (loc.match(/hyderabad|secunderabad|cyberabad|hitech city|banjara hills|gachibowli|jubilee hills/))
    return { zone: "Zone 6", city: "Hyderabad", fullZone: "Zone 6 — Hyderabad" };

  if (loc.match(/pune|pimpri|chinchwad|hinjewadi|kothrud|hadapsar|shivajinagar|viman nagar/))
    return { zone: "Zone 7", city: "Pune", fullZone: "Zone 7 — Pune" };

  if (loc.match(/ahmedabad|surat|vadodara|rajkot|gandhinagar|anand|navsari|bharuch/))
    return { zone: "Zone 8", city: "Ahmedabad", fullZone: "Zone 8 — Ahmedabad" };

  return { zone: "Zone 9", city: location, fullZone: "Zone 9 — Other Regions" };
}

/**
 * Legacy wrapper — returns the full zone string "Zone X — CityName"
 */
export function detectZoneFromLocation(locationString) {
  const result = detectZone(locationString, null, null);
  return result.fullZone;
}
