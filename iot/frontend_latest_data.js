async function updateLatestSensorValues() {
  try {
    const response = await fetch("/data");
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    document.getElementById("temperature").textContent = `${data.temperature} C`;
    document.getElementById("humidity").textContent = `${data.humidity} %`;
    document.getElementById("ammonia").textContent = `${data.ammonia}`;

    const warningElement = document.getElementById("ammonia-warning");
    if (warningElement) {
      warningElement.textContent =
        data.ammonia > 300 ? "Warning: Ammonia level is above safe threshold." : "";
      warningElement.style.display = data.ammonia > 300 ? "block" : "none";
    }
  } catch (error) {
    console.error("Failed to fetch latest sensor data:", error);
  }
}

setInterval(updateLatestSensorValues, 5000);
updateLatestSensorValues();
