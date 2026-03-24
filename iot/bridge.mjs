import { SerialPort } from "serialport";

const SERIAL_PORT = process.env.ARDUINO_COM_PORT || process.env.SERIAL_PORT || "COM15";
const BAUD_RATE = Number(process.env.ARDUINO_BAUD_RATE || process.env.SERIAL_BAUD_RATE || 9600);
const BACKEND_DATA_URL =
  process.env.BACKEND_DATA_URL || process.env.BACKEND_URL || "https://poultrymanager.vercel.app/api/data";
const BACKEND_CONTROL_URL =
  process.env.BACKEND_CONTROL_URL ||
  process.env.CONTROL_URL ||
  "https://poultrymanager.vercel.app/api/control";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 10_000);
const CONTROL_POLL_INTERVAL_MS = Number(process.env.CONTROL_POLL_INTERVAL_MS || 1_500);
const SENSOR_POST_INTERVAL_MS = Number(process.env.SENSOR_POST_INTERVAL_MS || 2_000);
const RECONNECT_DELAY_MS = Number(process.env.RECONNECT_DELAY_MS || 3_000);

function log(level, message, extra) {
  const timestamp = new Date().toISOString();
  const suffix = extra === undefined ? "" : ` ${JSON.stringify(extra)}`;
  console.log(`[${timestamp}] [${level}] ${message}${suffix}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeSerialLine(input) {
  return input.replace(/\0/g, "").trim();
}

function normalizeSensorPayload(input) {
  const temperature = normalizeNumber(input.temperature ?? input.temp);
  const humidity = normalizeNumber(input.humidity ?? input.hum);
  const ammonia = normalizeNumber(input.ammonia ?? input.gas);

  if (temperature === null || humidity === null || ammonia === null) {
    return null;
  }

  return { temperature, humidity, ammonia };
}

function normalizeControlPayload(payload = {}) {
  return {
    fan: String(payload.fan?.state ?? payload.fan ?? "OFF").toUpperCase(),
    heater: String(payload.heater?.state ?? payload.led?.state ?? payload.heater ?? payload.led ?? "OFF").toUpperCase(),
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(payload)}`);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function postSensorData(payload) {
  const response = await fetchJson(BACKEND_DATA_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  log("POST", `Sensor data sent to ${BACKEND_DATA_URL}`, response);
  return response;
}

async function fetchControlData() {
  return normalizeControlPayload(await fetchJson(BACKEND_CONTROL_URL));
}

async function openPort() {
  const port = new SerialPort({
    path: SERIAL_PORT,
    baudRate: BAUD_RATE,
    autoOpen: false,
  });

  await new Promise((resolve, reject) => {
    port.open((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  log("INFO", `Serial connection established on ${SERIAL_PORT} at ${BAUD_RATE} baud`);
  return port;
}

async function runBridge() {
  let lastSensorPostAt = 0;
  let nextControlPollAt = 0;
  let buffered = "";
  let lastControlStates = { fan: null, heater: null };

  while (true) {
    let port;

    try {
      port = await openPort();

      port.on("data", async (chunk) => {
        buffered += chunk.toString("utf8");
        const lines = buffered.split(/\r?\n/);
        buffered = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = sanitizeSerialLine(rawLine);
          if (!line) continue;

          log("SERIAL", "Received line", line);

          if (!line.startsWith("{")) {
            continue;
          }

          try {
            const parsed = JSON.parse(line);
            const payload = normalizeSensorPayload(parsed);

            if (!payload) {
              log("WARN", "Ignoring incomplete sensor payload", parsed);
              continue;
            }

            const now = Date.now();
            if (now - lastSensorPostAt < SENSOR_POST_INTERVAL_MS) {
              continue;
            }

            lastSensorPostAt = now;
            await postSensorData(payload);
          } catch (error) {
            log("ERROR", "Failed to process sensor line", String(error));
          }
        }
      });

      await new Promise((resolve, reject) => {
        port.on("error", reject);
        port.on("close", resolve);

        const controlTimer = setInterval(async () => {
          try {
            const now = Date.now();
            if (now < nextControlPollAt) {
              return;
            }

            nextControlPollAt = now + CONTROL_POLL_INTERVAL_MS;
            const controls = await fetchControlData();

            for (const [device, state] of Object.entries(controls)) {
              if (lastControlStates[device] === state) {
                continue;
              }

              const command = `${device}:${state}\n`;
              await new Promise((resolveWrite, rejectWrite) => {
                port.write(command, (error) => {
                  if (error) {
                    rejectWrite(error);
                    return;
                  }
                  port.drain((drainError) => {
                    if (drainError) {
                      rejectWrite(drainError);
                      return;
                    }
                    resolveWrite();
                  });
                });
              });

              lastControlStates[device] = state;
              log("CONTROL", "Command sent", { device, state });
            }
          } catch (error) {
            log("ERROR", "Control polling failed", String(error));
          }
        }, 500);

        port.on("close", () => clearInterval(controlTimer));
        port.on("error", () => clearInterval(controlTimer));
      });
    } catch (error) {
      log("ERROR", "Bridge failure", String(error));
    } finally {
      if (port?.isOpen) {
        await new Promise((resolve) => port.close(() => resolve()));
      }
    }

    log("INFO", `Reconnecting in ${RECONNECT_DELAY_MS}ms`);
    await sleep(RECONNECT_DELAY_MS);
  }
}

runBridge().catch((error) => {
  log("ERROR", "Bridge crashed", String(error));
  process.exitCode = 1;
});
