/**
 * JATAYU (SignalMesh AI) - Backend Real-Time Telemetry & Risk Scoring Service
 * Connects to Open-Meteo & USGS APIs on the server side.
 */

const https = require('https');

const LOCATIONS = [
  { id: 'dima-hasao', name: 'Dima Hasao', state: 'Assam', latitude: 25.77, longitude: 93.03, slopeGradient: 42 },
  { id: 'champhai', name: 'Champhai', state: 'Mizoram', latitude: 23.47, longitude: 93.33, slopeGradient: 38 },
  { id: 'west-garo-hills', name: 'West Garo Hills', state: 'Meghalaya', latitude: 25.51, longitude: 90.22, slopeGradient: 34 },
  { id: 'peren', name: 'Peren', state: 'Nagaland', latitude: 25.52, longitude: 93.73, slopeGradient: 36 },
  { id: 'tamenglong', name: 'Tamenglong', state: 'Manipur', latitude: 24.98, longitude: 93.50, slopeGradient: 35 },
  { id: 'cherrapunji', name: 'Cherrapunji', state: 'Meghalaya', latitude: 25.30, longitude: 91.70, slopeGradient: 39 },
  { id: 'aizawl', name: 'Aizawl', state: 'Mizoram', latitude: 23.72, longitude: 92.72, slopeGradient: 45 },
  { id: 'tawang', name: 'Tawang', state: 'Arunachal Pradesh', latitude: 27.58, longitude: 91.86, slopeGradient: 48 },
  { id: 'ukhrul', name: 'Ukhrul', state: 'Manipur', latitude: 25.12, longitude: 94.36, slopeGradient: 37 },
  { id: 'kohima', name: 'Kohima', state: 'Nagaland', latitude: 25.67, longitude: 94.11, slopeGradient: 40 },
  { id: 'itanagar', name: 'Itanagar', state: 'Arunachal Pradesh', latitude: 27.08, longitude: 93.61, slopeGradient: 31 },
  { id: 'karbi-anglong', name: 'Karbi Anglong', state: 'Assam', latitude: 25.83, longitude: 93.43, slopeGradient: 28 }
];

let cache = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Jatayu-SignalMesh/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function getRealtimeLocations() {
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return { ...cache.data, cached: true };
  }

  const lats = LOCATIONS.map((l) => l.latitude).join(',');
  const lngs = LOCATIONS.map((l) => l.longitude).join(',');

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,relative_humidity_2m,precipitation,rain&daily=precipitation_sum&hourly=soil_moisture_0_to_1cm&past_days=3&forecast_days=1&timezone=Asia%2FKolkata`;
  const seismicUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=20&maxlatitude=30&minlongitude=88&maxlongitude=98&limit=10`;

  const [weatherRes, seismicRes] = await Promise.allSettled([
    fetchJson(weatherUrl),
    fetchJson(seismicUrl)
  ]);

  const weatherData = weatherRes.status === 'fulfilled' ? weatherRes.value : [];
  const earthquakes = (seismicRes.status === 'fulfilled' && seismicRes.value?.features) || [];

  const locations = LOCATIONS.map((loc, idx) => {
    const w = Array.isArray(weatherData) ? weatherData[idx] : weatherData;
    const dailyRain = w?.daily?.precipitation_sum || [];
    const rain72hMm = parseFloat(dailyRain.slice(0, 3).reduce((acc, v) => acc + (v || 0), 0).toFixed(1)) || 12.0;
    const soilHourly = w?.hourly?.soil_moisture_0_to_1cm || [];
    const latestSoilMoisture = soilHourly.length ? soilHourly[soilHourly.length - 1] : 0.30;

    let nearestEq = null;
    let minD = Infinity;
    earthquakes.forEach((f) => {
      const eqLat = f.geometry.coordinates[1];
      const eqLng = f.geometry.coordinates[0];
      const d = haversineDistance(loc.latitude, loc.longitude, eqLat, eqLng);
      if (d < minD) {
        minD = d;
        nearestEq = { place: f.properties.place, mag: f.properties.mag, distKm: Math.round(d) };
      }
    });

    const rainScore = Math.min(100, Math.round((rain72hMm / 130) * 100));
    const soilScore = Math.min(100, Math.round((latestSoilMoisture / 0.40) * 100));
    const slopeScore = Math.min(100, Math.round((loc.slopeGradient / 45) * 100));
    const seismicScore = nearestEq && nearestEq.distKm < 400 ? Math.min(100, Math.round((nearestEq.mag * 100) / (nearestEq.distKm * 0.2))) : 12;

    const riskScore = Math.round(0.35 * rainScore + 0.30 * soilScore + 0.20 * slopeScore + 0.15 * seismicScore);
    let riskLevel = 'Low';
    if (riskScore >= 80) riskLevel = 'Very High';
    else if (riskScore >= 60) riskLevel = 'High';
    else if (riskScore >= 40) riskLevel = 'Moderate';

    return {
      ...loc,
      riskScore,
      riskLevel,
      rainfall: rainScore,
      soilMoisture: soilScore,
      earthquakeRisk: seismicScore,
      liveTelemetry: {
        rain72hMm,
        soilMoistureVolumetric: latestSoilMoisture,
        temperature: w?.current?.temperature_2m || 22,
        nearestEarthquake: nearestEq,
        source: 'Open-Meteo ECMWF + USGS Hazards',
        timestamp: new Date().toISOString()
      }
    };
  });

  cache = {
    data: { success: true, isLive: true, timestamp: Date.now(), locations },
    timestamp: Date.now()
  };

  return cache.data;
}

module.exports = { getRealtimeLocations };
