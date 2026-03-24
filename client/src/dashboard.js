import { useEffect, useMemo, useRef, useState } from "react";
import { fetchDeviceControls, fetchSensorSnapshot, normalizeSensorPayload, updateDeviceControl } from "./api";

const REFRESH_INTERVAL_MS = 5_000;
const HISTORY_LIMIT = 18;

function formatTimeLabel(value) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createHistoryEntry(snapshot) {
  return {
    ...snapshot,
    label: formatTimeLabel(snapshot.updated_at),
  };
}

export function useSensorMonitoring() {
  const initialSnapshot = normalizeSensorPayload({
    temperature: 0,
    humidity: 0,
    gas_level: 0,
    water_level: "UNKNOWN",
    light_level: 0,
    fan: "OFF",
    heater: "OFF",
    motor: "OFF",
    updated_at: new Date().toISOString(),
  });

  const [sensorData, setSensorData] = useState(initialSnapshot);
  const [history, setHistory] = useState([createHistoryEntry(initialSnapshot)]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const nextSnapshot = await fetchSensorSnapshot();
        if (!active) return;
        setSensorData(nextSnapshot);
        setHistory((current) => [...current, createHistoryEntry(nextSnapshot)].slice(-HISTORY_LIMIT));
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load sensor data.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return {
    sensorData,
    history,
    isLoading,
    error,
    isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
    lastUpdatedLabel: formatTimeLabel(sensorData.updated_at),
  };
}

export function useInstallPrompt() {
  const deferredPromptRef = useRef(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState("browser");

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    setPlatform(isIos ? "ios" : /android/.test(userAgent) ? "android" : "browser");
    setIsStandalone(standalone);

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      deferredPromptRef.current = event;
      setIsInstallable(true);
    }

    function handleAppInstalled() {
      deferredPromptRef.current = null;
      setIsInstallable(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPromptRef.current) return;
    await deferredPromptRef.current.prompt();
    await deferredPromptRef.current.userChoice;
    deferredPromptRef.current = null;
    setIsInstallable(false);
  }

  return {
    isInstallable,
    isStandalone,
    platform,
    promptInstall,
  };
}

export function useDeviceControls(sensorData) {
  const [controls, setControls] = useState({
    fan: sensorData.fan,
    heater: sensorData.heater,
  });
  const [pendingDevice, setPendingDevice] = useState(null);
  const [controlError, setControlError] = useState(null);

  useEffect(() => {
    setControls((current) => ({
      fan: current.fan || sensorData.fan,
      heater: current.heater || sensorData.heater,
    }));
  }, [sensorData.fan, sensorData.heater]);

  useEffect(() => {
    let active = true;

    async function loadControls() {
      try {
        const latest = await fetchDeviceControls();
        if (!active) return;
        setControls(latest);
        setControlError(null);
      } catch (error) {
        if (!active) return;
        setControlError(error instanceof Error ? error.message : "Unable to load device controls.");
      }
    }

    void loadControls();
    const interval = window.setInterval(() => void loadControls(), REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function toggleDevice(device, state) {
    setPendingDevice(device);
    setControlError(null);

    try {
      await updateDeviceControl(device, state);
      setControls((current) => ({
        ...current,
        [device]: state,
      }));
    } catch (error) {
      setControlError(error instanceof Error ? error.message : "Unable to save device command.");
      throw error;
    } finally {
      setPendingDevice(null);
    }
  }

  return {
    controls,
    pendingDevice,
    controlError,
    toggleDevice,
  };
}

export function useMonitoringSummary(sensorData) {
  return useMemo(
    () => [
      {
        key: "temperature",
        label: "Temperature",
        value: `${sensorData.temperature.toFixed(1)} C`,
        tone: sensorData.temperature > 34 ? "alert" : "ok",
      },
      {
        key: "humidity",
        label: "Humidity",
        value: `${sensorData.humidity.toFixed(0)}%`,
        tone: sensorData.humidity < 45 ? "warn" : "ok",
      },
      {
        key: "gas",
        label: "Ammonia Gas Level",
        value: `${sensorData.gas_level.toFixed(0)} ppm`,
        tone: sensorData.gas_level > 150 ? "alert" : "ok",
      },
    ],
    [sensorData],
  );
}
