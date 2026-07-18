import axios from 'axios';
import { parseStringPromise } from 'xml2js';

async function testAll() {
  console.log('--- STARTING RE-DIAGNOSTIC ---');

  const tests = [
    { name: 'GDACS (Multi-Hazard)', url: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtype=EQ,TC,FL,VO,TS,DR,WF&alertlevel=green,orange,red&limit=5' },
    { name: 'NDMA SACHET India Feed', url: 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml' },
    { name: 'NOAA NHC Cyclones', url: 'https://www.nhc.noaa.gov/CurrentStorms.json' },
    { name: 'Smithsonian Volcano GVP', url: 'https://volcano.si.edu/news/WeeklyVolcanoRSS.xml' },
    { name: 'EMSC Earthquakes', url: 'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=5&starttime=2026-07-16' },
    { name: 'Open-Meteo Air Quality', url: 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=20.5937&longitude=78.9629&current=pm2_5,european_aqi' },
  ];

  for (const t of tests) {
    try {
      const res = await axios.get(t.url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      let status = 'SUCCESS';
      let info = '';

      if (t.url.endsWith('.xml') || t.url.includes('rss_india.xml') || t.url.includes('WeeklyVolcanoRSS.xml')) {
        const parsed = await parseStringPromise(res.data, { explicitArray: false });
        status = parsed ? 'SUCCESS (XML Parsed)' : 'PARSING ERROR';
      } else {
        info = typeof res.data === 'object' ? `JSON (${Object.keys(res.data).slice(0, 3).join(',')}...)` : `Text (${res.data.slice(0, 50)}...)`;
      }

      console.log(`✅ ${t.name}: Connection OK | ${status} | ${info}`);
    } catch (err) {
      console.log(`❌ ${t.name}: FAILED | ${err.message}`);
    }
  }
  console.log('--- RE-DIAGNOSTIC COMPLETE ---');
}

testAll();
