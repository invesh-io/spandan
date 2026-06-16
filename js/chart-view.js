import { CONFIG } from "./config.js";

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: "index",
  },
  plugins: {
    legend: { display: false },
  },
};

export function createUptimeChart(canvas, pingData) {
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Availability",
          data: [],
          borderWidth: 2,
          fill: true,
          stepped: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          backgroundColor: (context) => {
            const value = context.dataset.data[context.dataIndex];
            return value === 1
              ? "rgba(52, 211, 153, 0.16)"
              : "rgba(251, 113, 133, 0.14)";
          },
          borderColor: (context) => {
            const value = context.dataset.data[context.dataIndex];
            return value === 1 ? "#34d399" : "#fb7185";
          },
        },
      ],
    },
    options: {
      ...chartDefaults,
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            stepSize: 1,
            color: "#71717a",
            callback: (value) => (value === 1 ? "Up" : "Down"),
          },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        x: {
          ticks: {
            color: "#71717a",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6,
          },
          grid: { display: false },
        },
      },
      plugins: {
        ...chartDefaults.plugins,
        tooltip: {
          backgroundColor: "#18181b",
          borderColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          titleColor: "#f4f4f5",
          bodyColor: "#a1a1aa",
          callbacks: {
            label(context) {
              const status = context.parsed.y === 1 ? "Online" : "Offline";
              const meta = pingData.details[context.dataIndex];
              return meta ? `${status} · ${meta}` : status;
            },
          },
        },
      },
    },
  });
}

export function createLatencyChart(canvas, pingData) {
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Latency",
          data: [],
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderColor: "#a78bfa",
          backgroundColor: "rgba(167, 139, 250, 0.12)",
        },
      ],
    },
    options: {
      ...chartDefaults,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#71717a",
            callback: (value) => `${value}ms`,
          },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        x: {
          ticks: {
            color: "#71717a",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6,
          },
          grid: { display: false },
        },
      },
      plugins: {
        ...chartDefaults.plugins,
        tooltip: {
          backgroundColor: "#18181b",
          borderColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          titleColor: "#f4f4f5",
          bodyColor: "#a1a1aa",
          callbacks: {
            label(context) {
              return `${context.parsed.y}ms`;
            },
          },
        },
      },
    },
  });
}

function formatLabels(timestamps) {
  return timestamps.map((timestamp) =>
    timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );
}

function trimData(pingData) {
  if (pingData.timestamps.length <= CONFIG.maxChartPoints) {
    return;
  }
  pingData.timestamps.shift();
  pingData.statuses.shift();
  pingData.responseTimes.shift();
  pingData.details.shift();
}

export function updateCharts(uptimeChart, latencyChart, pingData) {
  trimData(pingData);

  const labels = formatLabels(pingData.timestamps);
  uptimeChart.data.labels = labels;
  uptimeChart.data.datasets[0].data = pingData.statuses;
  uptimeChart.update("none");

  latencyChart.data.labels = labels;
  latencyChart.data.datasets[0].data = pingData.responseTimes.map(
    (value, index) => (pingData.statuses[index] === 1 ? value : null),
  );
  latencyChart.update("none");
}

export function resetChartData(pingData) {
  pingData.timestamps.length = 0;
  pingData.statuses.length = 0;
  pingData.responseTimes.length = 0;
  pingData.details.length = 0;
}

export function clearCharts(uptimeChart, latencyChart) {
  uptimeChart.data.labels = [];
  uptimeChart.data.datasets[0].data = [];
  latencyChart.data.labels = [];
  latencyChart.data.datasets[0].data = [];
  uptimeChart.update("none");
  latencyChart.update("none");
}
