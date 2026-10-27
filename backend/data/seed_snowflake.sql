-- =====================================================================
-- SignalMesh AI - Snowflake Data Setup Script
-- Target Database: SIGNALMESH_DB
-- Target Schema:   MONITORING
-- Target Warehouse: COMPUTE_WH
-- Team:            APEX-AI-X
-- =====================================================================

USE WAREHOUSE COMPUTE_WH;
CREATE DATABASE IF NOT EXISTS SIGNALMESH_DB;
USE DATABASE SIGNALMESH_DB;
CREATE SCHEMA IF NOT EXISTS MONITORING;
USE SCHEMA MONITORING;

-- ---------------------------------------------------------------------
-- 1. Table: LOCATIONS (8 Demonstration Records)
-- ---------------------------------------------------------------------
CREATE OR REPLACE TABLE LOCATIONS (
    ID VARCHAR(100) PRIMARY KEY,
    NAME VARCHAR(150),
    STATE VARCHAR(100),
    LATITUDE FLOAT,
    LONGITUDE FLOAT,
    RISK_LEVEL VARCHAR(50),
    RISK_SCORE NUMBER(3,0),
    RAINFALL_PCT NUMBER(3,0),
    SOIL_MOISTURE_PCT NUMBER(3,0),
    SLOPE_GRADIENT_PCT NUMBER(3,0),
    LAND_COVER_CHANGE_PCT NUMBER(3,0),
    EARTHQUAKE_RISK_PCT NUMBER(3,0),
    ROADS_COUNT NUMBER(5,0),
    VILLAGES_COUNT NUMBER(5,0),
    INFRASTRUCTURE_COUNT NUMBER(5,0),
    POPULATION NUMBER(10,0),
    SUMMARY VARCHAR(1000)
);

INSERT INTO LOCATIONS VALUES
('dima-hasao', 'Dima Hasao', 'Assam', 25.77, 93.03, 'Very High', 87, 85, 78, 82, 56, 15, 3, 2, 1, 4200, 'High rainfall and soil moisture combined with steep slopes in the region increase the chance of landslide occurrence.'),
('champhai', 'Champhai', 'Mizoram', 23.47, 93.33, 'High', 72, 74, 69, 75, 48, 22, 2, 3, 1, 3100, 'Sustained rainfall over saturated soils on moderately steep terrain elevates slope-failure likelihood.'),
('west-garo-hills', 'West Garo Hills', 'Meghalaya', 25.51, 90.22, 'High', 74, 79, 72, 68, 61, 18, 4, 2, 2, 5300, 'Very high seasonal rainfall and deforestation-driven land-cover change weaken hill slopes across the district.'),
('peren', 'Peren', 'Nagaland', 25.52, 93.73, 'Moderate', 61, 58, 60, 64, 42, 20, 2, 1, 1, 2100, 'Moderate moisture build-up on sloping terrain warrants continued monitoring during the monsoon period.'),
('tamenglong', 'Tamenglong', 'Manipur', 24.98, 93.50, 'Moderate', 58, 55, 57, 62, 39, 24, 1, 2, 1, 1800, 'Slope gradient and gradual soil saturation keep this district in a watchful, moderate-risk state.'),
('cherrapunji', 'Cherrapunji', 'Meghalaya', 25.30, 91.70, 'High', 70, 88, 74, 66, 44, 16, 3, 2, 1, 2600, 'Record-breaking rainfall saturates slopes rapidly, sustaining a high landslide threat.'),
('aizawl', 'Aizawl', 'Mizoram', 23.72, 92.72, 'High', 68, 71, 66, 73, 51, 25, 4, 3, 3, 8200, 'Dense hillside settlements on steep gradients amplify exposure to slope failures.'),
('tawang', 'Tawang', 'Arunachal Pradesh', 27.58, 91.86, 'High', 71, 63, 64, 84, 33, 40, 2, 1, 2, 1500, 'Extremely steep high-altitude terrain and seismic activity drive elevated instability.');

-- ---------------------------------------------------------------------
-- 2. Table: ALERTS (5 Demonstration Records)
-- ---------------------------------------------------------------------
CREATE OR REPLACE TABLE ALERTS (
    ID VARCHAR(50) PRIMARY KEY,
    LOCATION_ID VARCHAR(100),
    NAME VARCHAR(150),
    STATE VARCHAR(100),
    RISK_LEVEL VARCHAR(50),
    ALERT_DATE VARCHAR(50),
    ALERT_TIME VARCHAR(50),
    STATUS VARCHAR(50)
);

INSERT INTO ALERTS VALUES
('AL-001', 'dima-hasao', 'Dima Hasao', 'Assam', 'Very High', '2025-05-03', '10:20 AM', 'New'),
('AL-002', 'champhai', 'Champhai', 'Mizoram', 'High', '2025-05-03', '09:45 AM', 'New'),
('AL-003', 'west-garo-hills', 'West Garo Hills', 'Meghalaya', 'High', '2025-05-03', '09:10 AM', 'New'),
('AL-004', 'peren', 'Peren', 'Nagaland', 'Moderate', '2025-05-03', '08:30 AM', 'Acknowledged'),
('AL-005', 'tamenglong', 'Tamenglong', 'Manipur', 'Moderate', '2025-05-03', '07:50 AM', 'Closed');

-- ---------------------------------------------------------------------
-- 3. Table: ENVIRONMENTAL_OBSERVATIONS (8 Synthetic Records)
-- ---------------------------------------------------------------------
CREATE OR REPLACE TABLE ENVIRONMENTAL_OBSERVATIONS (
    OBSERVATION_ID VARCHAR(50) PRIMARY KEY,
    LOCATION_ID VARCHAR(100),
    TIMESTAMP TIMESTAMP_NTZ,
    RAINFALL_MM_72H FLOAT,
    SOIL_MOISTURE_PCT FLOAT,
    SLOPE_GRADIENT_DEG FLOAT,
    DISPLACEMENT_RATE_MM_DAY FLOAT,
    SEISMIC_MAGNITUDE FLOAT,
    CALCULATED_RISK_SCORE NUMBER(3,0),
    ALERT_TRIGGERED BOOLEAN
);

INSERT INTO ENVIRONMENTAL_OBSERVATIONS VALUES
('OBS-2025-01', 'dima-hasao', '2025-05-03 10:00:00', 142.5, 78.2, 38.5, 4.2, 1.2, 87, TRUE),
('OBS-2025-02', 'champhai', '2025-05-03 09:30:00', 118.0, 69.4, 32.0, 2.8, 0.8, 72, TRUE),
('OBS-2025-03', 'west-garo-hills', '2025-05-03 09:00:00', 126.4, 72.1, 30.5, 3.1, 1.5, 74, TRUE),
('OBS-2025-04', 'peren', '2025-05-03 08:15:00', 82.3, 60.2, 28.0, 1.2, 0.5, 61, FALSE),
('OBS-2025-05', 'tamenglong', '2025-05-03 07:45:00', 76.8, 57.5, 27.5, 0.9, 1.1, 58, FALSE),
('OBS-2025-06', 'cherrapunji', '2025-05-02 18:00:00', 165.2, 74.0, 29.0, 2.4, 0.4, 70, TRUE),
('OBS-2025-07', 'aizawl', '2025-05-02 11:00:00', 105.6, 66.3, 31.2, 1.9, 0.9, 68, TRUE),
('OBS-2025-08', 'tawang', '2025-05-02 14:30:00', 92.1, 64.2, 42.0, 2.1, 2.4, 71, TRUE);

-- ---------------------------------------------------------------------
-- 4. Table: FIELD_REPORTS
-- ---------------------------------------------------------------------
CREATE OR REPLACE TABLE FIELD_REPORTS (
    ID VARCHAR(50) PRIMARY KEY,
    LOCATION_ID VARCHAR(100),
    LOCATION VARCHAR(200),
    SUBMITTED_BY VARCHAR(100),
    DATE VARCHAR(50),
    OBSERVATION VARCHAR(300),
    DESCRIPTION VARCHAR(2000),
    AI_STATUS VARCHAR(50),
    CONFIDENCE NUMBER(3,0),
    RISK_IMPACT VARCHAR(100),
    STATUS VARCHAR(50),
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

INSERT INTO FIELD_REPORTS (ID, LOCATION_ID, LOCATION, SUBMITTED_BY, DATE, OBSERVATION, DESCRIPTION, AI_STATUS, CONFIDENCE, RISK_IMPACT, STATUS) VALUES
('MFR-2025-0052', 'dima-hasao', 'Dima Hasao, Assam', 'S. Sharma', '03 May 2025', 'Cracks on ground', 'Longitudinal tension cracks expanding across hillside road embankment.', 'Verified', 82, 'High → Very High', 'Verified'),
('MFR-2025-0053', 'champhai', 'Champhai, Mizoram', 'R. Lalthang', '03 May 2025', 'Water seepage', 'Unusual muddy groundwater discharge surfacing near retaining wall.', 'Verified', 76, 'Moderate → High', 'Verified'),
('MFR-2025-0054', 'west-garo-hills', 'West Garo Hills, Meghalaya', 'D. Marak', '02 May 2025', 'Slope deformation', 'Downward soil displacement and tilting utility poles noticed.', 'Pending', 0, '—', 'Submitted'),
('MFR-2025-0055', 'peren', 'Peren, Nagaland', 'K. Angami', '02 May 2025', 'Rockfall', 'Minor loose rockfall on highway bypass during early morning drizzle.', 'Flagged', 41, 'No change', 'Flagged');

-- ---------------------------------------------------------------------
-- 5. Table: LANDSLIDE_TRAINING_DATASET (3,200 ML Training Records)
-- ---------------------------------------------------------------------
CREATE OR REPLACE TABLE LANDSLIDE_TRAINING_DATASET (
    RECORD_ID VARCHAR(50) PRIMARY KEY,
    TIMESTAMP TIMESTAMP_NTZ,
    LOCATION_ID VARCHAR(100),
    LOCATION_NAME VARCHAR(150),
    STATE VARCHAR(100),
    LATITUDE FLOAT,
    LONGITUDE FLOAT,
    ELEVATION_M NUMBER(6,0),
    SLOPE_GRADIENT_DEG FLOAT,
    SLOPE_ASPECT_DEG NUMBER(4,0),
    SOIL_TYPE VARCHAR(100),
    SOIL_DEPTH_M FLOAT,
    SOIL_MOISTURE_PCT FLOAT,
    PORE_WATER_PRESSURE_KPA FLOAT,
    RAINFALL_LAST_1H_MM FLOAT,
    RAINFALL_LAST_24H_MM FLOAT,
    RAINFALL_LAST_72H_MM FLOAT,
    ANTECEDENT_RAINFALL_7D_MM FLOAT,
    NDVI_VEGETATION_INDEX FLOAT,
    LAND_COVER_TYPE VARCHAR(100),
    DEFORESTATION_RATE_PCT FLOAT,
    DISTANCE_TO_ROAD_M NUMBER(6,0),
    DISTANCE_TO_DRAINAGE_M NUMBER(6,0),
    SEISMIC_MAGNITUDE_RECORDED FLOAT,
    DISPLACEMENT_RATE_MM_DAY FLOAT,
    TENSION_CRACKS_DETECTED NUMBER(1,0),
    FACTOR_OF_SAFETY FLOAT,
    RISK_SCORE NUMBER(3,0),
    RISK_LEVEL VARCHAR(50),
    LANDSLIDE_OCCURRED NUMBER(1,0)
);

-- Note: Load LANDSLIDE_TRAINING_DATASET.csv via Snowflake Web UI (Snowsight)
-- -> Databases -> SIGNALMESH_DB -> MONITORING -> Tables -> LANDSLIDE_TRAINING_DATASET -> Load Data
-- Or via SnowSQL CLI:
-- PUT file://./LANDSLIDE_TRAINING_DATASET.csv @%LANDSLIDE_TRAINING_DATASET;
-- COPY INTO LANDSLIDE_TRAINING_DATASET FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1 FIELD_OPTIONALLY_ENCLOSED_BY = '"');
