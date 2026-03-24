import json
import os
import time

import requests
import serial


SERIAL_PORT = os.getenv("SERIAL_PORT", "COM15")
BAUD_RATE = int(os.getenv("SERIAL_BAUD_RATE", "9600"))
BACKEND_URL = os.getenv("BACKEND_URL", "https://poultrymanager.vercel.app/api/data")
CONTROL_URL = os.getenv("CONTROL_URL", "https://poultrymanager.vercel.app/api/control")
REQUEST_TIMEOUT_SECONDS = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "5"))
CONTROL_POLL_INTERVAL_SECONDS = float(os.getenv("CONTROL_POLL_INTERVAL_SECONDS", "1.5"))
SENSOR_POST_INTERVAL_SECONDS = float(os.getenv("SENSOR_POST_INTERVAL_SECONDS", "2"))


def normalize_control_payload(payload):
    return {
        "fan": str(payload.get("fan", {}).get("state", payload.get("fan", "OFF"))).upper(),
        "heater": str(payload.get("heater", {}).get("state", payload.get("heater", "OFF"))).upper(),
    }


def main() -> None:
    session = requests.Session()
    last_control_states = {"fan": None, "heater": None}
    next_control_poll_at = 0.0
    last_sensor_post_at = 0.0

    while True:
        try:
            with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1) as ser:
                print(f"Listening on {SERIAL_PORT} at {BAUD_RATE} baud")

                while True:
                    now = time.monotonic()
                    if now >= next_control_poll_at:
                        try:
                            control_response = session.get(
                                CONTROL_URL,
                                timeout=REQUEST_TIMEOUT_SECONDS,
                            )
                            control_response.raise_for_status()
                            controls = normalize_control_payload(control_response.json())

                            for device, state in controls.items():
                                if last_control_states.get(device) == state:
                                    continue

                                command = f"{device}:{state}"
                                ser.write((command + "\n").encode("utf-8"))
                                ser.flush()
                                last_control_states[device] = state
                                print("Command sent:", command)
                        except Exception as error:
                            print("Control error:", error)
                        finally:
                            next_control_poll_at = now + CONTROL_POLL_INTERVAL_SECONDS

                    raw_line = ser.readline().decode("utf-8", errors="ignore").strip()
                    if not raw_line or not raw_line.startswith("{"):
                        continue

                    incoming = json.loads(raw_line)
                    payload = {
                        "temp": incoming.get("temp", incoming.get("temperature")),
                        "hum": incoming.get("hum", incoming.get("humidity")),
                        "gas": incoming.get("gas", incoming.get("ammonia")),
                    }

                    now = time.monotonic()
                    if now - last_sensor_post_at < SENSOR_POST_INTERVAL_SECONDS:
                        continue

                    print("Sending:", payload)

                    response = session.post(
                        BACKEND_URL,
                        json=payload,
                        timeout=REQUEST_TIMEOUT_SECONDS,
                    )
                    last_sensor_post_at = now
                    print("Response:", response.status_code, response.text)
        except KeyboardInterrupt:
            print("Stopped.")
            break
        except Exception as error:
            print("Error:", error)
            time.sleep(2)


if __name__ == "__main__":
    main()
