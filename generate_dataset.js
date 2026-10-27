/**
 * SignalMesh AI - Enterprise Landslide Training Dataset Generator
 * Generates 3,000 realistic, geotechnically correlated records for Northeast India
 * Team: APEX-AI-X
 */

const fs = require('fs');
const path = require('path');

const LOCATIONS = [
  { id: 'dima-hasao', name: 'Dima Hasao', state: 'Assam', lat: 25.77, lng: 93.03, elev: 680, baseSlope: 42, soil: 'Clayey Loam' },
  { id: 'champhai', name: 'Champhai', state: 'Mizoram', lat: 23.47, lng: 93.33, elev: 1678, baseSlope: 38, soil: 'Weathered Sandstone' },
  { id: 'west-garo-hills', name: 'West Garo Hills', state: 'Meghalaya', lat: 25.51, lng: 90.22, elev: 450, baseSlope: 34, soil: 'Laterite' },
  { id: 'peren', name: 'Peren', state: 'Nagaland', lat: 25.52, lng: 93.73, elev: 1445, baseSlope: 36, soil: 'Silty Clay' },
  { id: 'tamenglong', name: 'Tamenglong', state: 'Manipur', lat: 24.98, lng: 93.50, elev: 1260, baseSlope: 35, soil: 'Shale Loam' },
  { id: 'cherrapunji', name: 'Cherrapunji', state: 'Meghalaya', lat: 25.30, lng: 91.70, elev: 1484, baseSlope: 39, soil: 'Limestone Residue' },
  { id: 'aizawl', name: 'Aizawl', state: 'Mizoram', lat: 23.72, lng: 92.72, elev: 1132, baseSlope: 45, soil: 'Weathered Shale' },
  { id: 'tawang', name: 'Tawang', state: 'Arunachal Pradesh', lat: 27.58, lng: 91.86, elev: 3048, baseSlope: 48, soil: 'Glacial Till / Gneiss' },
  { id: 'ukhrul', name: 'Ukhrul', state: 'Manipur', lat: 25.12, lng: 94.36, elev: 1662, baseSlope: 37, soil: 'Clayey Silt' },
  { id: 'kohima', name: 'Kohima', state: 'Nagaland', lat: 25.67, lng: 94.11, elev: 1444, baseSlope: 40, soil: 'Weathered Siltstone' },
  { id: 'itanagar', name: 'Itanagar', state: 'Arunachal Pradesh', lat: 27.08, lng: 93.61, elev: 440, baseSlope: 31, soil: 'Alluvial Loam' },
  { id: 'karbi-anglong', name: 'Karbi Anglong', state: 'Assam', lat: 25.83, lng: 93.43, elev: 380, baseSlope: 28, soil: 'Sandy Clay Loam' }
];

const LAND_COVERS = ['Dense Forest', 'Degraded Forest', 'Road Cut / Barren', 'Agricultural Terraced', 'Settlement / Urban Slope'];

// Seeded PRNG for reproducible synthetic ML records
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42891);
const randBetween = (min, max) => min + rand() * (max - min);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const TOTAL_ROWS = 3200;
const records = [];

// Header row
const headers = [
  'RECORD_ID',
  'TIMESTAMP',
  'LOCATION_ID',
  'LOCATION_NAME',
  'STATE',
  'LATITUDE',
  'LONGITUDE',
  'ELEVATION_M',
  'SLOPE_GRADIENT_DEG',
  'SLOPE_ASPECT_DEG',
  'SOIL_TYPE',
  'SOIL_DEPTH_M',
  'SOIL_MOISTURE_PCT',
  'PORE_WATER_PRESSURE_KPA',
  'RAINFALL_LAST_1H_MM',
  'RAINFALL_LAST_24H_MM',
  'RAINFALL_LAST_72H_MM',
  'ANTECEDENT_RAINFALL_7D_MM',
  'NDVI_VEGETATION_INDEX',
  'LAND_COVER_TYPE',
  'DEFORESTATION_RATE_PCT',
  'DISTANCE_TO_ROAD_M',
  'DISTANCE_TO_DRAINAGE_M',
  'SEISMIC_MAGNITUDE_RECORDED',
  'DISPLACEMENT_RATE_MM_DAY',
  'TENSION_CRACKS_DETECTED',
  'FACTOR_OF_SAFETY',
  'RISK_SCORE',
  'RISK_LEVEL',
  'LANDSLIDE_OCCURRED'
];

records.push(headers.join(','));

const startDate = new Date('2024-05-01T00:00:00Z');

for (let i = 1; i <= TOTAL_ROWS; i++) {
  const loc = LOCATIONS[(i - 1) % LOCATIONS.length];
  
  // Distribute timestamps across 2024 monsoon & 2025 seasons
  const dateOffsetHours = Math.floor(randBetween(0, 365 * 24 * 1.5));
  const recordTime = new Date(startDate.getTime() + dateOffsetHours * 3600 * 1000);
  const timeStr = recordTime.toISOString().replace('T', ' ').substring(0, 19);

  // Slight spatial variation around the monitoring center point (+/- 3km)
  const lat = +(loc.lat + randBetween(-0.03, 0.03)).toFixed(4);
  const lng = +(loc.lng + randBetween(-0.03, 0.03)).toFixed(4);
  const elevation = Math.round(loc.elev + randBetween(-80, 120));

  // Geomorphology
  const slope = +(loc.baseSlope + randBetween(-8, 12)).toFixed(1);
  const aspect = Math.round(randBetween(0, 359));
  const soilDepth = +(randBetween(1.2, 8.5)).toFixed(2);
  const landCover = pick(LAND_COVERS);

  // Hydrology & Rainfall Simulation
  const isMonsoonMonth = [5, 6, 7, 8, 9].includes(recordTime.getUTCMonth());
  const rainIntensityBias = isMonsoonMonth ? (loc.id === 'cherrapunji' ? 2.5 : 1.8) : 0.4;

  const rain1h = +(Math.pow(rand(), 2.5) * 35 * rainIntensityBias).toFixed(1);
  const rain24h = +(rain1h * randBetween(2.0, 4.5) + randBetween(0, 60) * rainIntensityBias).toFixed(1);
  const rain72h = +(rain24h * randBetween(1.4, 2.8) + randBetween(5, 90) * rainIntensityBias).toFixed(1);
  const rain7d = +(rain72h * randBetween(1.2, 2.2) + randBetween(10, 120) * rainIntensityBias).toFixed(1);

  // Soil moisture correlates strongly with 72h antecedent rainfall and soil depth
  const soilMoisture = +(Math.min(96, Math.max(15, 20 + rain72h * 0.28 + randBetween(-5, 8)))).toFixed(1);
  const porePressure = +(Math.max(0, (soilMoisture - 45) * 1.85 + rain24h * 0.4 + randBetween(-3, 5))).toFixed(2);

  // Environmental & Proximity indices
  const ndvi = +(landCover === 'Dense Forest' ? randBetween(0.65, 0.88) :
                 landCover === 'Degraded Forest' ? randBetween(0.40, 0.64) :
                 landCover === 'Road Cut / Barren' ? randBetween(0.12, 0.32) : randBetween(0.35, 0.58)).toFixed(3);
  const deforestation = +(landCover === 'Road Cut / Barren' ? randBetween(40, 85) : randBetween(5, 45)).toFixed(1);
  const distRoad = Math.round(randBetween(15, 2500));
  const distDrain = Math.round(randBetween(20, 1800));

  // Geophysics & Telemetry
  const seismic = +(Math.pow(rand(), 4) * 4.2).toFixed(1); // occasional minor tremors
  
  // Geotechnical physics: Factor of Safety (FoS) estimation
  // FoS < 1.0 indicates imminent failure; 1.0 - 1.3 marginal; > 1.3 stable
  // Destabilizing: steep slope, high pore pressure, high rainfall, road cut, low ndvi
  const drivingForce = (slope / 45) * 0.4 + (porePressure / 100) * 0.3 + (rain72h / 250) * 0.2 + (distRoad < 100 ? 0.1 : 0);
  const resistingForce = (ndvi * 0.35) + (soilDepth > 4 ? 0.25 : 0.4) + (soilMoisture < 50 ? 0.35 : 0.1);
  const fos = +(Math.max(0.65, Math.min(2.8, (resistingForce / Math.max(0.2, drivingForce)) * 1.1 + randBetween(-0.15, 0.15)))).toFixed(2);

  const displacementRate = +(fos < 1.05 ? randBetween(4.5, 22.0) :
                             fos < 1.25 ? randBetween(1.2, 4.4) :
                             fos < 1.50 ? randBetween(0.3, 1.1) : randBetween(0.02, 0.28)).toFixed(2);

  const tensionCracks = (fos < 1.15 && displacementRate > 2.5) ? 1 : 0;

  // Composite Risk Score (0 - 100)
  let riskScore = Math.round(
    (100 - fos * 35) +
    (rain72h / 300) * 20 +
    (soilMoisture / 100) * 15 +
    (slope / 50) * 15 +
    (tensionCracks ? 15 : 0) +
    randBetween(-4, 4)
  );
  riskScore = Math.max(10, Math.min(99, riskScore));

  let riskLevel = 'Low';
  if (riskScore >= 80) riskLevel = 'Very High';
  else if (riskScore >= 65) riskLevel = 'High';
  else if (riskScore >= 45) riskLevel = 'Moderate';

  // Ground Truth Label: Landslide event occurred
  const landslideOccurred = (fos < 1.02 && riskScore >= 78 && displacementRate > 3.5) ? 1 : 0;

  const id = `SLP-2024-${String(i).padStart(5, '0')}`;

  const row = [
    id,
    timeStr,
    loc.id,
    `"${loc.name}"`,
    `"${loc.state}"`,
    lat,
    lng,
    elevation,
    slope,
    aspect,
    `"${loc.soil}"`,
    soilDepth,
    soilMoisture,
    porePressure,
    rain1h,
    rain24h,
    rain72h,
    rain7d,
    ndvi,
    `"${landCover}"`,
    deforestation,
    distRoad,
    distDrain,
    seismic,
    displacementRate,
    tensionCracks,
    fos,
    riskScore,
    `"${riskLevel}"`,
    landslideOccurred
  ];

  records.push(row.join(','));
}

const outputPath = path.join(__dirname, 'backend', 'data', 'LANDSLIDE_TRAINING_DATASET.csv');
fs.writeFileSync(outputPath, records.join('\n'), 'utf8');

console.log(`Successfully generated ${TOTAL_ROWS} clean, correlated machine-learning records!`);
console.log(`Saved to: ${outputPath}`);
console.log(`Total columns: ${headers.length}`);
