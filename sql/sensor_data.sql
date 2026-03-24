CREATE TABLE IF NOT EXISTS sensor_data (
  id SERIAL PRIMARY KEY,
  temperature FLOAT,
  humidity FLOAT,
  ammonia FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
