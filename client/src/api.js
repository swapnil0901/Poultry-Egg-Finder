import { toApiUrl } from "@/lib/api-url";

export const SENSOR_ENDPOINT = "/api/sensors";
export const DEVICE_CONTROL_ENDPOINT = "/api/control";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeSensorPayload(payload = {}) {
  return {
    temperature: toNumber(payload.temperature ?? payload.temp, 0),
    humidity: toNumber(payload.humidity ?? payload.hum, 0),
    gas_level: toNumber(payload.gas_level ?? payload.gas ?? payload.ammonia, 0),
    water_level: String(payload.water_level ?? "UNKNOWN"),
    light_level: toNumber(payload.light_level, 0),
    fan: String(payload.fan ?? "OFF"),
    heater: String(payload.heater ?? "OFF"),
    motor: String(payload.motor ?? "OFF"),
    updated_at: String(payload.updated_at ?? payload.created_at ?? new Date().toISOString()),
  };
}

export async function fetchSensorSnapshot() {
  const response = await fetch(toApiUrl(SENSOR_ENDPOINT), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load sensor data (${response.status})`);
  }

  return normalizeSensorPayload(await response.json());
}

export function normalizeDeviceControls(payload = {}) {
  return {
    fan: String(payload.fan?.state ?? payload.fan ?? "OFF").toUpperCase(),
    heater: String(payload.heater?.state ?? payload.heater ?? "OFF").toUpperCase(),
  };
}

export async function fetchDeviceControls() {
  const response = await fetch(toApiUrl(DEVICE_CONTROL_ENDPOINT), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load device controls (${response.status})`);
  }

  return normalizeDeviceControls(await response.json());
}

export async function updateDeviceControl(device, state) {
  const response = await fetch(toApiUrl(DEVICE_CONTROL_ENDPOINT), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ device, state }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? `Failed to update ${device} (${response.status})`);
  }

  return payload.data;
}
