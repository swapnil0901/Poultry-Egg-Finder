import Chart from "chart.js/auto";

function createLineChart(canvas, label, history, key, color) {
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: history.map((entry) => entry.label),
      datasets: [
        {
          label,
          data: history.map((entry) => entry[key]),
          borderColor: color,
          backgroundColor: `${color}22`,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            maxTicksLimit: 5,
          },
        },
      },
    },
  });
}

export function createMonitoringCharts(canvases, history) {
  if (!canvases.temperature || !canvases.humidity || !canvases.gas) {
    return () => {};
  }

  const charts = [
    createLineChart(canvases.temperature, "Temperature", history, "temperature", "#2c7a7b"),
    createLineChart(canvases.humidity, "Humidity", history, "humidity", "#3182ce"),
    createLineChart(canvases.gas, "Gas Level", history, "gas_level", "#dd6b20"),
  ];

  return () => {
    charts.forEach((chart) => chart.destroy());
  };
}
