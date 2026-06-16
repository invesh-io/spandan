import { CONFIG } from "./config.js";

export function createChart(canvas, pingData) {
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Reachability",
          data: [],
          borderWidth: 2,
          fill: true,
          stepped: true,
          pointRadius: 3,
          pointHoverRadius: 5,
          backgroundColor: (context) => {
            const value = context.dataset.data[context.dataIndex];
            return value === 1
              ? "rgba(5, 150, 105, 0.18)"
              : "rgba(220, 38, 38, 0.18)";
          },
          borderColor: (context) => {
            const value = context.dataset.data[context.dataIndex];
            return value === 1 ? "#059669" : "#dc2626";
          },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            stepSize: 1,
            callback: (value) => (value === 1 ? "Online" : "Offline"),
          },
          grid: {
            color: "rgba(148, 163, 184, 0.25)",
          },
        },
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label(context) {
              const status = context.parsed.y === 1 ? "Online" : "Offline";
              const meta = pingData.details[context.dataIndex];
              const responseTime = pingData.responseTimes[context.dataIndex];
              if (meta) {
                return `${status} · ${meta}`;
              }
              return responseTime
                ? `${status} · ${responseTime}ms`
                : status;
            },
          },
        },
      },
    },
  });
}

export function updateChart(chart, pingData) {
  if (pingData.timestamps.length > CONFIG.maxChartPoints) {
    pingData.timestamps.shift();
    pingData.statuses.shift();
    pingData.responseTimes.shift();
    pingData.details.shift();
  }

  chart.data.labels = pingData.timestamps.map((timestamp) =>
    timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );
  chart.data.datasets[0].data = pingData.statuses;
  chart.update("none");
}

export function resetChartData(pingData) {
  pingData.timestamps.length = 0;
  pingData.statuses.length = 0;
  pingData.responseTimes.length = 0;
  pingData.details.length = 0;
}
