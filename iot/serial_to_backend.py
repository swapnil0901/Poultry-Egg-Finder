import json
import os
import time
from typing import Any

import requests
import serial
from requests import RequestException
from serial import SerialException

SERIAL_PORT = os.getenv("ARDUINO_COM_PORT", "COM15")
BAUD_RATE = int(os.getenv("ARDUINO_BAUD_RATE", "9600"))
BACKEND_URL = os.getenv(
    "BACKEND_DATA_URL",
    "https://poultrymanager.vercel.app/api/data",
)
SERIAL_TIMEOUT_SECONDS = float(os.getenv("SERIAL_TIMEOUT_SECONDS", "1"))
HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "10"))
RECONNECT_DELAY_SECONDS = float(os.getenv("SERIAL_RECONNECT_DELAY_SECONDS", "5"))


def log(level: str, message: str) -> None:
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}", flush=True)


def normalize_payload(payload: dict[str, Any]) -> dict[str, float]:
    return {
        "temperature": float(payload["temperature"]),
        "humidity": float(payload["humidity"]),
        "ammonia": float(payload["ammonia"]),
    }


def post_sensor_data(session: requests.Session, payload: dict[str, float]) -> None:
    response = session.post(BACKEND_URL, json=payload, timeout=HTTP_TIMEOUT_SECONDS)
    response.raise_for_status()
    log("SENT", f"POST {BACKEND_URL} -> {payload}")


def open_serial_connection() -> serial.Serial:
    log("INFO", f"Connecting to serial port {SERIAL_PORT} at {BAUD_RATE} baud")
    connection = serial.Serial(
        port=SERIAL_PORT,
        baudrate=BAUD_RATE,
        timeout=SERIAL_TIMEOUT_SECONDS,
    )
    connection.reset_input_buffer()
    log("INFO", f"Serial connection established on {SERIAL_PORT}")
    return connection


def read_serial_payload(connection: serial.Serial) -> dict[str, float] | None:
    raw_line = connection.readline().decode("utf-8", errors="ignore").strip()
    if not raw_line:
        return None

    log("RECEIVED", raw_line)

    try:
        parsed = json.loads(raw_line)
        if not isinstance(parsed, dict):
            raise ValueError("JSON payload must be an object")
        return normalize_payload(parsed)
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
        log("ERROR", f"Ignoring invalid serial line: {error}")
        return None


def run_bridge() -> None:
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})

    while True:
        try:
            with open_serial_connection() as connection:
                while True:
                    payload = read_serial_payload(connection)
                    if payload is None:
                        continue

                    try:
                        post_sensor_data(session, payload)
                    except RequestException as error:
                        log("ERROR", f"Backend request failed: {error}")
        except SerialException as error:
            log(
                "ERROR",
                f"Serial connection failed on {SERIAL_PORT}: {error}. Retrying in {RECONNECT_DELAY_SECONDS} seconds.",
            )
            time.sleep(RECONNECT_DELAY_SECONDS)
        except KeyboardInterrupt:
            log("INFO", "Stopping serial bridge")
            break
        except Exception as error:
            log(
                "ERROR",
                f"Unexpected bridge failure: {error}. Retrying in {RECONNECT_DELAY_SECONDS} seconds.",
            )
            time.sleep(RECONNECT_DELAY_SECONDS)


if __name__ == "__main__":
    run_bridge()
