// ═══════════════════════════════════════
// UACS — External API Proxy Route
// Handles all 12 disaster/weather API categories
// Solves CORS + XML parsing for frontend
// ═══════════════════════════════════════

import express from 'express';
import axios   from 'axios';
import { parseStringPromise } from 'xml2js';

const router = express.Router();

// ─── In-memory cache (avoid hammering free APIs) ────────────────────────────
const CACHE = new Map();
const CACHE_TTL = {
  gdacs:      5  * 60 * 1000,  // 5 min  — disaster events
  ndma:       5  * 60 * 1000,  // 5 min  — India alerts
  nhc:        10 * 60 * 1000,  // 10 min — cyclone tracks
  gvp:        30 * 60 * 1000,  // 30 min — volcano weekly report
  reliefweb:  15 * 60 * 1000,  // 15 min — humanitarian reports
  emsc:       3  * 60 * 1000,  // 3 min  — European earthquakes
  glofas:     10 * 60 * 1000,  // 10 min — flood forecasts
  aqi:        10 * 60 * 1000,  // 10 min — air quality
  firms:      15 * 60 * 1000,  // 15 min — wildfire hotspots
  nasapower:  60 * 60 * 1000,  // 60 min — climate (rarely changes)
  vaac:       30 * 60 * 1000,  // 30 min — volcanic ash advisories
};

function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > (CACHE_TTL[key.split('_')[0]] || 300000)) {
    CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  CACHE.set(key, { ts: Date.now(), data });
}

// ─── Helper: safe fetch with timeout ────────────────────────────────────────
async function safeFetch(url, options = {}) {
  const res = await axios.get(url, {
    timeout: 12000,
    headers: {
      'User-Agent': 'UACS-DisasterResponse/1.0 (emergency-platform@uacs.in)',
      ...options.headers,
    },
    ...options,
  });
  return res.data;
}

// ════════════════════════════════════════════════════════════════════════════
// CAT 2 + 4 + 5 + 6 + 7 + 8 — GDACS Multi-Hazard
// UN + European Commission — Earthquakes, Cyclones, Floods, Volcanoes,
//                            Tsunamis, Wildfires
// NO KEY REQUIRED
// ════════════════════════════════════════════════════════════════════════════
router.get('/gdacs', async (req, res) => {
  try {
    const cached = getCached('gdacs');
    if (cached) return res.json(cached);

    const data = await safeFetch(
      'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH',
      {
        params: {
          eventtype: 'EQ,TC,FL,VO,TS,DR,WF',
          alertlevel: 'green,orange,red',
          limit: 100,
          fromdate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          todate: new Date().toISOString().split('T')[0],
        },
      }
    );

    const result = {
      source: 'GDACS (UN + European Commission)',
      fetchedAt: new Date().toISOString(),
      events: (data?.features || []).map(f => ({
        id:         f.properties?.eventid,
        type:       f.properties?.eventtype,   // EQ TC FL VO TS WF
        typeName:   gdacsTypeName(f.properties?.eventtype),
        alertLevel: f.properties?.alertlevel,  // green orange red
        title:      f.properties?.name,
        country:    f.properties?.country,
        lat:        f.geometry?.coordinates?.[1],
        lng:        f.geometry?.coordinates?.[0],
        date:       f.properties?.fromdate,
        url:        f.properties?.url?.report,
        magnitude:  f.properties?.atemagnitude || f.properties?.maxintensity,
        severity:   f.properties?.severity?.value,
      })),
    };

    setCache('gdacs', result);
    res.json(result);
  } catch (err) {
    console.error('[External/GDACS]', err.message);
    res.status(502).json({ error: 'GDACS unavailable', details: err.message, events: [] });
  }
});

function gdacsTypeName(code) {
  const map = { EQ:'Earthquake', TC:'Tropical Cyclone', FL:'Flood',
                VO:'Volcano', TS:'Tsunami', DR:'Drought', WF:'Wildfire' };
  return map[code] || code || 'Unknown';
}

// ════════════════════════════════════════════════════════════════════════════
// CAT 10 — NDMA SACHET (India-Official CAP Alerts)
// National Disaster Management Authority — Government of India
// NO KEY — RSS/XML feed
// ════════════════════════════════════════════════════════════════════════════
router.get('/ndma', async (req, res) => {
  try {
    const cached = getCached('ndma');
    if (cached) return res.json(cached);

    const xml = await safeFetch('https://sachet.ndma.gov.in/cap_feed/active/atom.xml');
    const parsed = await parseStringPromise(xml, { explicitArray: false });

    const feed = parsed?.feed;
    const entries = feed?.entry || [];
    const list = Array.isArray(entries) ? entries : [entries];

    const result = {
      source: 'NDMA SACHET — Government of India',
      fetchedAt: new Date().toISOString(),
      alerts: list.map(e => ({
        id:        e?.id || '',
        title:     e?.title?._ || e?.title || '',
        summary:   e?.summary?._ || e?.summary || '',
        updated:   e?.updated || '',
        severity:  e?.['cap:severity'] || e?.severity || '',
        urgency:   e?.['cap:urgency']  || e?.urgency  || '',
        area:      e?.['cap:areaDesc'] || e?.areaDesc || '',
        link:      e?.link?.['$']?.href || e?.link || '',
      })),
    };

    setCache('ndma', result);
    res.json(result);
  } catch (err) {
    console.error('[External/NDMA]', err.message);
    // Graceful fallback — SACHET feed can be intermittent
    res.json({ source: 'NDMA SACHET', fetchedAt: new Date().toISOString(), alerts: [], error: 'Feed temporarily unavailable' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CAT 4 — NOAA NHC Cyclone Tracks
// National Hurricane Center — Live cyclone paths & forecasts
// NO KEY REQUIRED
// ════════════════════════════════════════════════════════════════════════════
router.get('/nhc', async (req, res) => {
  try {
    const cached = getCached('nhc');
    if (cached) return res.json(cached);

    const data = await safeFetch('https://www.nhc.noaa.gov/CurrentStorms.json');

    const result = {
      source: 'NOAA National Hurricane Center',
      fetchedAt: new Date().toISOString(),
      storms: (data?.activeStorms || []).map(s => ({
        id:       s.id,
        name:     s.name,
        basin:    s.basin,
        lat:      s.latitudeNumeric,
        lng:      s.longitudeNumeric,
        wind:     s.maxSustainedWindMph,
        category: s.ssCategory,
        movement: s.movementDir,
        speed:    s.movementSpeed,
        trackUrl: s.trackingMapImage,
        advisoryUrl: `https://www.nhc.noaa.gov/text/refresh/MIATCPAT${s.id}+shtml/`,
      })),
    };

    setCache('nhc', result);
    res.json(result);
  } catch (err) {
    console.error('[External/NHC]', err.message);
    res.json({ source: 'NOAA NHC', fetchedAt: new Date().toISOString(), storms: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CAT 8 — Smithsonian Global Volcanism Program
// Weekly volcano activity report — RSS feed
// NO KEY REQUIRED
// ════════════════════════════════════════════════════════════════════════════
router.get('/gvp', async (req, res) => {
  try {
    const cached = getCached('gvp');
    if (cached) return res.json(cached);

    const xml = await safeFetch('https://volcano.si.edu/news/WeeklyVolcanoRSS.xml');
    const parsed = await parseStringPromise(xml, { explicitArray: false });

    const items = parsed?.rss?.channel?.item || [];
    const list  = Array.isArray(items) ? items : [items];

    const result = {
      source: 'Smithsonian Global Volcanism Program',
      fetchedAt: new Date().toISOString(),
      volcanoes: list.slice(0, 30).map(item => ({
        title:       item?.title || '',
        description: item?.description || '',
        link:        item?.link || '',
        date:        item?.pubDate || '',
        // Extract volcano name from title (format: "VolcanoName | Country | Activity")
        name:        (item?.title || '').split('|')[0]?.trim(),
        country:     (item?.title || '').split('|')[1]?.trim(),
        activity:    (item?.title || '').split('|')[2]?.trim(),
      })),
    };

    setCache('gvp', result);
    res.json(result);
  } catch (err) {
    console.error('[External/GVP]', err.message);
    res.json({ source: 'Smithsonian GVP', fetchedAt: new Date().toISOString(), volcanoes: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CAT 2 — ReliefWeb Disaster Reports
// UN OCHA — Humanitarian situation reports for active disasters
// NO KEY REQUIRED
// ════════════════════════════════════════════════════════════════════════════
router.get('/reliefweb', async (req, res) => {
  try {
    const cached = getCached('reliefweb');
    if (cached) return res.json(cached);

    const data = await safeFetch('https://api.reliefweb.int/v2/reports', {
      params: {
        'filter[field]': 'theme.name',
        'filter[value]': 'Disaster Management',
        'sort[]': 'date:desc',
        limit: 20,
        'fields[include][]': 'title,date,country,source,body-html,url',
        'appname': 'uacs-platform',
      },
    });

    const result = {
      source: 'ReliefWeb (UN OCHA)',
      fetchedAt: new Date().toISOString(),
      reports: (data?.data || []).map(r => ({
        id:      r.id,
        title:   r.fields?.title,
        date:    r.fields?.date?.created,
        country: r.fields?.country?.map(c => c.name).join(', '),
        source:  r.fields?.source?.map(s => s.name).join(', '),
        url:     r.fields?.url,
        summary: (r.fields?.['body-html'] || '').replace(/<[^>]+>/g, '').slice(0, 300),
      })),
    };

    setCache('reliefweb', result);
    res.json(result);
  } catch (err) {
    console.error('[External/ReliefWeb]', err.message);
    res.json({ source: 'ReliefWeb', fetchedAt: new Date().toISOString(), reports: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CAT 1 — EMSC European Seismological Centre
// More earthquakes than USGS alone — global coverage
// NO KEY REQUIRED
// ════════════════════════════════════════════════════════════════════════════
router.get('/emsc', async (req, res) => {
  try {
    const cached = getCached('emsc');
    if (cached) return res.json(cached);

    const data = await safeFetch(
      'https://www.seismicportal.eu/fdsnws/event/1/query',
      {
        params: {
          format: 'geojson',
          limit: 100,
          minmag: 3.0,
          orderby: 'time',
          start: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        },
      }
    );

    const result = {
      source: 'EMSC — Euro-Mediterranean Seismological Centre',
      fetchedAt: new Date().toISOString(),
      earthquakes: (data?.features || []).map(f => ({
        id:        f.id,
        magnitude: f.properties?.mag,
        place:     f.properties?.place || f.properties?.flynn_region,
        depth:     f.geometry?.coordinates?.[2],
        lat:       f.geometry?.coordinates?.[1],
        lng:       f.geometry?.coordinates?.[0],
        time:      f.properties?.time,
        url:       `https://www.seismicportal.eu/eventdetails.html?unid=${f.id}`,
      })),
    };

    setCache('emsc', result);
    res.json(result);
  } catch (err) {
    console.error('[External/EMSC]', err.message);
    res.json({ source: 'EMSC', fetchedAt: new Date().toISOString(), earthquakes: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CAT 6 — GloFAS Flood Forecast
// Copernicus / EU — Global 30-day flood forecasts
// NO KEY REQUIRED
// ════════════════════════════════════════════════════════════════════════════
router.get('/glofas', async (req, res) => {
  try {
    const cached = getCached('glofas');
    if (cached) return res.json(cached);

    // GloFAS provides flood warning points — fetch via their REST API
    const data = await safeFetch(
      'https://gdacs.org/gdacsapi/api/events/geteventlist/SEARCH',
      {
        params: {
          eventtype: 'FL',
          alertlevel: 'orange,red',
          limit: 50,
        },
      }
    );

    const result = {
      source: 'GloFAS + GDACS Flood Events',
      fetchedAt: new Date().toISOString(),
      floods: (data?.features || []).map(f => ({
        id:          f.properties?.eventid,
        title:       f.properties?.name,
        country:     f.properties?.country,
        alertLevel:  f.properties?.alertlevel,
        lat:         f.geometry?.coordinates?.[1],
        lng:         f.geometry?.coordinates?.[0],
        date:        f.properties?.fromdate,
        affectedPop: f.properties?.population?.value,
        severity:    f.properties?.severity?.value,
        url:         f.properties?.url?.report,
      })),
    };

    setCache('glofas', result);
    res.json(result);
  } catch (err) {
    console.error('[External/GloFAS]', err.message);
    res.json({ source: 'GloFAS', fetchedAt: new Date().toISOString(), floods: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CAT 9 — Air Quality Index (Open-Meteo, no key)
// + WAQI if WAQI_TOKEN is configured
// ════════════════════════════════════════════════════════════════════════════
router.get('/aqi', async (req, res) => {
  const { lat = 19.0760, lng = 72.8777 } = req.query;
  const cacheKey = `aqi_${lat}_${lng}`;

  try {
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Open-Meteo Air Quality — always free, no key
    const data = await safeFetch('https://air-quality-api.open-meteo.com/v1/air-quality', {
      params: {
        latitude:  lat,
        longitude: lng,
        current: [
          'pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide',
          'sulphur_dioxide', 'ozone', 'aerosol_optical_depth',
          'dust', 'uv_index', 'european_aqi', 'us_aqi',
        ].join(','),
        hourly: 'pm2_5,european_aqi',
        forecast_days: 1,
      },
    });

    const current = data?.current || {};
    const europeanAqi = current.european_aqi;

    const result = {
      source: 'Open-Meteo Air Quality API',
      fetchedAt: new Date().toISOString(),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      current: {
        pm2_5:             current.pm2_5,
        pm10:              current.pm10,
        carbon_monoxide:   current.carbon_monoxide,
        nitrogen_dioxide:  current.nitrogen_dioxide,
        sulphur_dioxide:   current.sulphur_dioxide,
        ozone:             current.ozone,
        dust:              current.dust,
        uv_index:          current.uv_index,
        european_aqi:      europeanAqi,
        us_aqi:            current.us_aqi,
        aqi_label:         getAqiLabel(europeanAqi),
        aqi_color:         getAqiColor(europeanAqi),
      },
    };

    // Optionally augment with WAQI if token configured
    if (process.env.WAQI_TOKEN) {
      try {
        const waqi = await safeFetch(
          `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${process.env.WAQI_TOKEN}`
        );
        if (waqi?.status === 'ok') {
          result.waqi = {
            aqi:        waqi.data?.aqi,
            dominentPol: waqi.data?.dominentpol,
            station:    waqi.data?.city?.name,
          };
        }
      } catch (_) { /* waqi optional */ }
    }

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('[External/AQI]', err.message);
    res.status(502).json({ error: 'AQI data unavailable', details: err.message });
  }
});

function getAqiLabel(aqi) {
  if (!aqi && aqi !== 0) return 'Unknown';
  if (aqi <= 20)  return 'Good';
  if (aqi <= 40)  return 'Fair';
  if (aqi <= 60)  return 'Moderate';
  if (aqi <= 80)  return 'Poor';
  if (aqi <= 100) return 'Very Poor';
  return 'Extremely Poor';
}

function getAqiColor(aqi) {
  if (!aqi && aqi !== 0) return '#888';
  if (aqi <= 20)  return '#50C878';
  if (aqi <= 40)  return '#9DC183';
  if (aqi <= 60)  return '#FFD700';
  if (aqi <= 80)  return '#FFA500';
  if (aqi <= 100) return '#FF4500';
  return '#8B0000';
}

// ════════════════════════════════════════════════════════════════════════════
// CAT 5 — NASA FIRMS Wildfire Hotspots
// Near real-time fire data from VIIRS + MODIS satellites
// FREE MAP_KEY required (register at firms.modaps.eosdis.nasa.gov/api/)
// Falls back to NASA EONET if no key configured
// ════════════════════════════════════════════════════════════════════════════
router.get('/firms', async (req, res) => {
  const { lat = 20.5937, lng = 78.9629, days = 1 } = req.query;
  const cacheKey = `firms_${lat}_${lng}_${days}`;

  try {
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const FIRMS_KEY = process.env.NASA_FIRMS_KEY;

    if (FIRMS_KEY) {
      // Use proper NASA FIRMS API with satellite data
      const area = `${parseFloat(lng) - 10},${parseFloat(lat) - 10},${parseFloat(lng) + 10},${parseFloat(lat) + 10}`;
      const data = await safeFetch(
        `https://firms.modaps.eosdis.nasa.gov/api/area/json/${FIRMS_KEY}/VIIRS_SNPP_NRT/${area}/${days}`
      );

      const result = {
        source: 'NASA FIRMS — VIIRS/SNPP Near Real-Time',
        fetchedAt: new Date().toISOString(),
        hotspots: (Array.isArray(data) ? data : []).map(h => ({
          lat:         parseFloat(h.latitude),
          lng:         parseFloat(h.longitude),
          brightness:  h.bright_ti4,
          confidence:  h.confidence,
          frp:         h.frp, // Fire Radiative Power in MW
          satellite:   h.satellite,
          daynight:    h.daynight,
          acqDate:     h.acq_date,
          acqTime:     h.acq_time,
        })),
      };
      setCache(cacheKey, result);
      return res.json(result);
    }

    // Fallback: NASA EONET wildfires (no key)
    const eonet = await safeFetch(
      'https://eonet.gsfc.nasa.gov/api/v3/events',
      { params: { category: 'wildfires', status: 'open', days: 30 } }
    );

    const result = {
      source: 'NASA EONET Wildfires (fallback — add NASA_FIRMS_KEY for satellite hotspots)',
      fetchedAt: new Date().toISOString(),
      hotspots: (eonet?.events || []).flatMap(e =>
        (e.geometry || []).map(g => ({
          lat:       g.coordinates?.[1],
          lng:       g.coordinates?.[0],
          title:     e.title,
          date:      g.date,
          id:        e.id,
          eonetLink: e.sources?.[0]?.url,
        }))
      ),
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('[External/FIRMS]', err.message);
    res.json({ source: 'NASA FIRMS', fetchedAt: new Date().toISOString(), hotspots: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CAT 12 — NASA POWER Climate Data
// Satellite-derived climate metrics — temperature, solar, wind
// NO KEY REQUIRED
// ════════════════════════════════════════════════════════════════════════════
router.get('/nasa-power', async (req, res) => {
  const { lat = 20.5937, lng = 78.9629 } = req.query;
  const cacheKey = `nasapower_${lat}_${lng}`;

  try {
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const data = await safeFetch('https://power.larc.nasa.gov/api/temporal/daily/point', {
      params: {
        parameters: 'T2M,WS10M,WD10M,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN',
        community:  'AG',
        longitude:  lng,
        latitude:   lat,
        start:      formatNasaDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        end:        formatNasaDate(new Date()),
        format:     'JSON',
      },
    });

    const props = data?.properties?.parameter || {};
    const dates = Object.keys(props.T2M || {}).slice(-3);

    const result = {
      source: 'NASA POWER — Satellite Climate Data',
      fetchedAt: new Date().toISOString(),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      recent: dates.map(d => ({
        date:          d,
        temperature:   props.T2M?.[d],         // °C
        windSpeed:     props.WS10M?.[d],        // m/s
        windDirection: props.WD10M?.[d],        // degrees
        rainfall:      props.PRECTOTCORR?.[d],  // mm/day
        humidity:      props.RH2M?.[d],         // %
        solarRad:      props.ALLSKY_SFC_SW_DWN?.[d], // MJ/m²/day
      })),
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('[External/NASA-POWER]', err.message);
    res.status(502).json({ error: 'NASA POWER unavailable', details: err.message });
  }
});

function formatNasaDate(d) {
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

// ════════════════════════════════════════════════════════════════════════════
// CAT 8 — VAAC Volcanic Ash Advisory (aviation safety)
// International Civil Aviation Organization RSS
// NO KEY REQUIRED
// ════════════════════════════════════════════════════════════════════════════
router.get('/vaac', async (req, res) => {
  try {
    const cached = getCached('vaac');
    if (cached) return res.json(cached);

    // London VAAC covers widest area including Asia
    const xml = await safeFetch('https://www.metoffice.gov.uk/aviation/vaac/data/VAA.xml');
    const parsed = await parseStringPromise(xml, { explicitArray: false });

    const items = parsed?.rss?.channel?.item || [];
    const list  = Array.isArray(items) ? items : [items];

    const result = {
      source: 'London VAAC — Volcanic Ash Advisory Centre',
      fetchedAt: new Date().toISOString(),
      advisories: list.slice(0, 20).map(item => ({
        title:       item?.title || '',
        description: item?.description || '',
        date:        item?.pubDate || '',
        link:        item?.link || '',
      })),
    };

    setCache('vaac', result);
    res.json(result);
  } catch (err) {
    console.error('[External/VAAC]', err.message);
    res.json({ source: 'VAAC', fetchedAt: new Date().toISOString(), advisories: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CAT 3 — OpenWeatherMap (wind, storm pressure, cyclone direction)
// Requires OWM_API_KEY in .env — free signup at openweathermap.org
// Falls back to Open-Meteo if no key
// ════════════════════════════════════════════════════════════════════════════
router.get('/owm', async (req, res) => {
  const { lat = 20.5937, lng = 78.9629 } = req.query;
  const cacheKey = `owm_${lat}_${lng}`;

  try {
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const OWM_KEY = process.env.OWM_API_KEY;

    if (OWM_KEY) {
      const data = await safeFetch('https://api.openweathermap.org/data/2.5/weather', {
        params: { lat, lon: lng, appid: OWM_KEY, units: 'metric' },
      });

      const result = {
        source: 'OpenWeatherMap',
        fetchedAt: new Date().toISOString(),
        wind: {
          speed:     data?.wind?.speed,     // m/s
          direction: data?.wind?.deg,       // degrees
          gust:      data?.wind?.gust,      // m/s
        },
        pressure:    data?.main?.pressure,  // hPa
        visibility:  data?.visibility,      // meters
        weather:     data?.weather?.[0]?.description,
        clouds:      data?.clouds?.all,     // %
        alerts:      data?.alerts || [],
      };

      setCache(cacheKey, result);
      return res.json(result);
    }

    // Fallback: Open-Meteo wind data (no key)
    const meteo = await safeFetch('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude:  lat,
        longitude: lng,
        current: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,visibility',
        wind_speed_unit: 'ms',
      },
    });

    const c = meteo?.current || {};
    const result = {
      source: 'Open-Meteo (fallback — add OWM_API_KEY for storm alerts)',
      fetchedAt: new Date().toISOString(),
      wind: {
        speed:     c.wind_speed_10m,
        direction: c.wind_direction_10m,
        gust:      c.wind_gusts_10m,
      },
      pressure:   c.surface_pressure,
      visibility: c.visibility,
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('[External/OWM]', err.message);
    res.status(502).json({ error: 'Weather data unavailable', details: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Summary endpoint — all source statuses
// ════════════════════════════════════════════════════════════════════════════
router.get('/status', (req, res) => {
  res.json({
    sources: {
      'CAT-1  USGS Earthquakes':        { key: false,  status: 'active',   endpoint: '/api (frontend direct)' },
      'CAT-1  EMSC Earthquakes':        { key: false,  status: 'active',   endpoint: '/api/external/emsc' },
      'CAT-2  GDACS Multi-Hazard':      { key: false,  status: 'active',   endpoint: '/api/external/gdacs' },
      'CAT-2  ReliefWeb Reports':       { key: false,  status: 'active',   endpoint: '/api/external/reliefweb' },
      'CAT-2  NASA EONET':              { key: false,  status: 'active',   endpoint: '/api (frontend direct)' },
      'CAT-3  Open-Meteo Weather':      { key: false,  status: 'active',   endpoint: '/api (frontend direct)' },
      'CAT-3  OpenWeatherMap (wind)':   { key: true,   status: process.env.OWM_API_KEY ? 'active' : 'no-key',  endpoint: '/api/external/owm' },
      'CAT-4  NOAA NHC Cyclones':       { key: false,  status: 'active',   endpoint: '/api/external/nhc' },
      'CAT-5  NASA FIRMS Wildfires':    { key: 'opt',  status: process.env.NASA_FIRMS_KEY ? 'active' : 'eonet-fallback', endpoint: '/api/external/firms' },
      'CAT-6  GloFAS Flood Forecasts':  { key: false,  status: 'active',   endpoint: '/api/external/glofas' },
      'CAT-7  NOAA Tsunami (via GDACS)':{ key: false,  status: 'active',   endpoint: 'included in GDACS' },
      'CAT-8  Smithsonian GVP Volcano': { key: false,  status: 'active',   endpoint: '/api/external/gvp' },
      'CAT-8  VAAC Ash Advisories':     { key: false,  status: 'active',   endpoint: '/api/external/vaac' },
      'CAT-9  Open-Meteo AQI':          { key: false,  status: 'active',   endpoint: '/api/external/aqi' },
      'CAT-9  WAQI City AQI':           { key: 'opt',  status: process.env.WAQI_TOKEN ? 'active' : 'disabled', endpoint: 'merged in /aqi' },
      'CAT-10 NDMA SACHET India':       { key: false,  status: 'active',   endpoint: '/api/external/ndma' },
      'CAT-11 Nominatim Geocoding':     { key: false,  status: 'active',   endpoint: '/api (frontend direct)' },
      'CAT-12 NASA POWER Climate':      { key: false,  status: 'active',   endpoint: '/api/external/nasa-power' },
    },
    optionalKeys: {
      OWM_API_KEY:    { set: !!process.env.OWM_API_KEY,    purpose: 'Wind/storm pressure + cyclone alerts' },
      NASA_FIRMS_KEY: { set: !!process.env.NASA_FIRMS_KEY, purpose: 'Satellite wildfire hotspots (VIIRS)' },
      WAQI_TOKEN:     { set: !!process.env.WAQI_TOKEN,     purpose: 'City-level AQI for Indian cities' },
    },
  });
});

export default router;
