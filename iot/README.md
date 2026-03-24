# IoT Bridge Setup

## Flow

Arduino -> USB serial -> Node bridge -> Vercel API -> Neon PostgreSQL -> Website

## Files

- `arduino_serial_extension.ino`: serial JSON output plus fan/LED command input
- `bridge.mjs`: Node bridge for serial -> Vercel API and control polling
- `serial_to_backend.py`: older Python bridge kept as fallback
- `sensor_data.sql`: Neon table definition
- `frontend_latest_data.js`: browser snippet for latest values

## Required Setup

1. In Vercel Project Settings, set `DATABASE_URL` to your Neon PostgreSQL connection string.
2. Deploy the website/backend so `/api/data`, `/api/sensors`, and `/api/control` are live.
3. Connect the Arduino and confirm the port, default `COM15`.
4. Upload your Arduino sketch with the serial extension code.
5. From the app root, run `npm install`.
6. Start the bridge with `npm run iot:bridge`.

## Optional Environment Variables

- `ARDUINO_COM_PORT=COM15`
- `ARDUINO_BAUD_RATE=9600`
- `BACKEND_DATA_URL=https://poultrymanager.vercel.app/api/data`
- `BACKEND_CONTROL_URL=https://poultrymanager.vercel.app/api/control`
- `REQUEST_TIMEOUT_MS=10000`
- `CONTROL_POLL_INTERVAL_MS=1500`
- `SENSOR_POST_INTERVAL_MS=2000`

## Result

- Sensor values are posted into Neon through the deployed Vercel backend.
- The website reads the latest values from `/api/sensors`.
- Fan/LED commands saved from the website are pulled from `/api/control` and sent back to the Arduino.
