// ═══════════════════════════════════════
// UACS — Frontend Zone Detection Utility
// Mirrors backend/utils/zoneMapper.js
// ═══════════════════════════════════════

/**
 * Detect zone from location text and/or GPS coordinates.
 * Returns { zone: "CityName", city: "CityName", fullZone: "CityName" }
 */
export function detectZone(location, lat, lng) {
  // Priority 1: GPS coordinate-based detection
  if (lat && lng) {
    if (lat >= 28.4 && lat <= 28.9 && lng >= 76.8 && lng <= 77.4)
      return { zone: "Delhi NCR", city: "Delhi NCR", fullZone: "Delhi NCR" };

    if (lat >= 18.9 && lat <= 19.3 && lng >= 72.7 && lng <= 73.0)
      return { zone: "Mumbai", city: "Mumbai", fullZone: "Mumbai" };

    if (lat >= 22.4 && lat <= 22.7 && lng >= 88.2 && lng <= 88.5)
      return { zone: "Kolkata", city: "Kolkata", fullZone: "Kolkata" };

    if (lat >= 12.9 && lat <= 13.2 && lng >= 80.1 && lng <= 80.3)
      return { zone: "Chennai", city: "Chennai", fullZone: "Chennai" };

    if (lat >= 12.8 && lat <= 13.1 && lng >= 77.4 && lng <= 77.8)
      return { zone: "Bangalore", city: "Bangalore", fullZone: "Bangalore" };

    if (lat >= 17.3 && lat <= 17.6 && lng >= 78.3 && lng <= 78.6)
      return { zone: "Hyderabad", city: "Hyderabad", fullZone: "Hyderabad" };

    if (lat >= 18.4 && lat <= 18.7 && lng >= 73.7 && lng <= 74.0)
      return { zone: "Pune", city: "Pune", fullZone: "Pune" };

    if (lat >= 22.9 && lat <= 23.2 && lng >= 72.4 && lng <= 72.8)
      return { zone: "Ahmedabad", city: "Ahmedabad", fullZone: "Ahmedabad" };
  }

  // Priority 2: Text-based detection
  if (!location) return { zone: "Other", city: "Other", fullZone: "Other Regions" };
  const loc = location.toLowerCase();

  if (loc.match(/delhi|noida|gurgaon|gurugram|ncr|faridabad|ghaziabad|dwarka|rohini|connaught/))
    return { zone: "Delhi NCR", city: "Delhi NCR", fullZone: "Delhi NCR" };

  if (loc.match(/mumbai|bombay|thane|navi mumbai|andheri|bandra|borivali|malad|dadar|kurla|panvel|kalyan/))
    return { zone: "Mumbai", city: "Mumbai", fullZone: "Mumbai" };

  if (loc.match(/kolkata|calcutta|howrah|salt lake|dum dum|barasat|park street/))
    return { zone: "Kolkata", city: "Kolkata", fullZone: "Kolkata" };

  if (loc.match(/chennai|madras|anna salai|adyar|tambaram|velachery|t\.nagar|chromepet/))
    return { zone: "Chennai", city: "Chennai", fullZone: "Chennai" };

  if (loc.match(/bangalore|bengaluru|koramangala|whitefield|indiranagar|jayanagar|hebbal|electronic city/))
    return { zone: "Bangalore", city: "Bangalore", fullZone: "Bangalore" };

  if (loc.match(/hyderabad|secunderabad|cyberabad|hitech city|banjara hills|gachibowli|jubilee hills/))
    return { zone: "Hyderabad", city: "Hyderabad", fullZone: "Hyderabad" };

  if (loc.match(/pune|pimpri|chinchwad|hinjewadi|kothrud|hadapsar|shivajinagar|viman nagar/))
    return { zone: "Pune", city: "Pune", fullZone: "Pune" };

  if (loc.match(/ahmedabad|surat|vadodara|rajkot|gandhinagar|anand|navsari|bharuch/))
    return { zone: "Ahmedabad", city: "Ahmedabad", fullZone: "Ahmedabad" };

  return { zone: location, city: location, fullZone: location };
}

/**
 * Legacy wrapper — returns the full zone string "CityName"
 */
export function detectZoneFromLocation(locationString) {
  const result = detectZone(locationString, null, null);
  return result.fullZone;
}
