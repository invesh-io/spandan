import { CONFIG, CHART_CDN, CHART_SRI } from "./config.js";
import {
  checkReachability,
  loadSettings,
  normalizeUrl,
  saveSettings,
  validateInterval,
} from "./monitor.js";
import { createChart, resetChartData, updateChart } from "./chart-view.js";
import {
  addLogEntry,
  bindElements,
  clearLog,
  setFieldError,
  setIdleStatus,
  setMonitoringState,
  updateStats,
  updateStatus,
} from "./ui.js";

const state = {
  intervalId: null,
  inFlight: false,
  isMonitoring: false,
  stats: {
    total: 0,
    success: 0,
    failure: 0,
  },
  pingData: {
    timestamps: [],
    statuses: [],
    responseTimes: [],
    details: [],
  },
};

let elements;
let chart;

function loadChartLibrary() {
  if (window.Chart) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHART_CDN;
    script.integrity = CHART_SRI;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Unable to load chart library."));
    document.head.appendChild(script);
  });
}

function resetSession() {
  state.stats.total = 0;
  state.stats.success = 0;
  state.stats.failure = 0;
  resetChartData(state.pingData);
  updateStats(elements, state.stats);
  clearLog(elements);
  setIdleStatus(elements);
  if (chart) {
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update("none");
  }
}

async function runCheck() {
  if (state.inFlight) {
    return;
  }

  state.inFlight = true;

  try {
    const url = normalizeUrl(elements.urlInput.value);
    const result = await checkReachability(url);

    state.stats.total += 1;
    if (result.success) {
      state.stats.success += 1;
    } else {
      state.stats.failure += 1;
    }

    state.pingData.timestamps.push(new Date());
    state.pingData.statuses.push(result.success ? 1 : 0);
    state.pingData.responseTimes.push(result.responseTime);
    state.pingData.details.push(result.detail);

    updateStats(elements, state.stats);
    updateChart(chart, state.pingData);
    updateStatus(elements, result.success);
    addLogEntry(elements, result);
  } catch (error) {
    setFieldError(elements.urlError, error.message);
  } finally {
    state.inFlight = false;
  }
}

function stopMonitoring() {
  if (state.intervalId) {
    window.clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isMonitoring = false;
  setMonitoringState(elements, false);
}

function startMonitoring() {
  setFieldError(elements.urlError, "");

  let url;
  let intervalSec;

  try {
    url = normalizeUrl(elements.urlInput.value);
    elements.urlInput.value = url;
    intervalSec = validateInterval(elements.intervalInput.value);
  } catch (error) {
    setFieldError(elements.urlError, error.message);
    return;
  }

  saveSettings({ url, intervalSec });

  state.isMonitoring = true;
  setMonitoringState(elements, true);
  void runCheck();
  state.intervalId = window.setInterval(
    () => void runCheck(),
    intervalSec * 1000,
  );
}

function toggleMonitoring() {
  if (state.isMonitoring) {
    stopMonitoring();
    return;
  }
  startMonitoring();
}

function hydrateSettings() {
  const saved = loadSettings();
  elements.urlInput.value = saved?.url ?? CONFIG.defaultUrl;
  elements.intervalInput.value = String(
    saved?.intervalSec ?? CONFIG.defaultIntervalSec,
  );
}

window.addEventListener("beforeunload", () => {
  stopMonitoring();
});

async function init() {
  elements = bindElements();
  hydrateSettings();
  setIdleStatus(elements);
  updateStats(elements, state.stats);

  await loadChartLibrary();
  chart = createChart(
    document.getElementById("pingChart"),
    state.pingData,
  );

  elements.startBtn.addEventListener("click", toggleMonitoring);
  elements.resetBtn.addEventListener("click", resetSession);
  elements.urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !state.isMonitoring) {
      startMonitoring();
    }
  });
}

init().catch((error) => {
  console.error(error);
  setFieldError(
    document.getElementById("urlError"),
    "Failed to initialize the monitor.",
  );
});
