# IoT Bridge Setup

## Flow

Arduino -> USB serial -> Python bridge -> Express backend -> Neon PostgreSQL -> Frontend

## Files

- `arduino_serial_extension.ino`: serial-only Arduino addition
- `serial_to_backend.py`: reads Arduino JSON and posts to backend
- `sensor_data.sql`: Neon table definition
- `frontend_latest_data.js`: browser snippet for latest values

## Run Order

1. Create the `sensor_data` table in Neon with `sensor_data.sql`.
2. Set `DATABASE_URL` in your app `.env` to the Neon connection string.
3. Start the Node backend from the app root with `npm run dev:server`.
4. Install Python packages with `pip install -r iot/requirements.txt`.
5. Set the correct `SERIAL_PORT` and `BACKEND_URL` in `serial_to_backend.py`.
6. Upload your Arduino sketch after adding the serial extension lines.
7. Run the bridge with `python iot/serial_to_backend.py`.
8. Use `GET /data` from the frontend to read the latest stored record.
