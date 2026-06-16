import { CONFIG, CHART_CDN, CHART_SRI } from "./config.js";
import {
  checkReachability,
  loadSettings,
  normalizeUrl,
  saveSettings,
  validateInterval,
} from "./monitor.js";
import {
  clearCharts,
  createLatencyChart,
  createUptimeChart,
  resetChartData,
  updateCharts,
} from "./chart-view.js";
import { EcgAnimator } from "./ecg.js";
import { SessionClock } from "./session.js";
import { renderTimeline, resetTimeline } from "./timeline.js";
import {
  addLogEntry,
  bindElements,
  clearLog,
  refreshLogRelativeTimes,
  setCheckingStatus,
  setFieldError,
  setIdleStatus,
  setMonitoringState,
  syncPresetButtons,
  updateHost,
  updateSessionLine,
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
let uptimeChart;
let latencyChart;
let ecg;
let sessionClock;
let relativeTimerId = null;

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

function getIntervalSec() {
  return validateInterval(elements.intervalInput.value);
}

function resetSession() {
  state.stats.total = 0;
  state.stats.success = 0;
  state.stats.failure = 0;
  resetChartData(state.pingData);
  updateStats(elements, state.stats, state.pingData.responseTimes);
  clearLog(elements);
  resetTimeline(elements.timelineStrip);
  setIdleStatus(elements);
  ecg.setState("idle");
  updateHost(elements, elements.urlInput.value.trim());
  if (uptimeChart && latencyChart) {
    clearCharts(uptimeChart, latencyChart);
  }
}

async function runCheck() {
  if (state.inFlight) {
    return;
  }

  state.inFlight = true;
  setCheckingStatus(elements);
  ecg.setState("checking");

  try {
    const url = normalizeUrl(elements.urlInput.value);
    updateHost(elements, url);
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

    updateStats(elements, state.stats, state.pingData.responseTimes);
    updateCharts(uptimeChart, latencyChart, state.pingData);
    renderTimeline(elements.timelineStrip, state.pingData.statuses);
    updateStatus(
      elements,
      result.success ? "online" : "offline",
      result.success ? "Online" : "Offline",
    );
    ecg.setState(result.success ? "online" : "offline");
    addLogEntry(elements, result);

    if (state.isMonitoring && sessionClock) {
      sessionClock.markCheckComplete();
    }
  } catch (error) {
    setFieldError(elements.urlError, error.message);
    ecg.setState("idle");
    if (!state.isMonitoring) {
      setIdleStatus(elements);
    }
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
  sessionClock.stop();
  setMonitoringState(elements, false);

  if (state.stats.total === 0) {
    setIdleStatus(elements);
    ecg.setState("idle");
  }
}

function startMonitoring() {
  setFieldError(elements.urlError, "");

  let url;
  let intervalSec;

  try {
    url = normalizeUrl(elements.urlInput.value);
    elements.urlInput.value = url;
    intervalSec = getIntervalSec();
  } catch (error) {
    setFieldError(elements.urlError, error.message);
    return;
  }

  saveSettings({ url, intervalSec });
  syncPresetButtons(elements, intervalSec);
  updateHost(elements, url);

  state.isMonitoring = true;
  setMonitoringState(elements, true);
  sessionClock.start(intervalSec);
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
  const url = saved?.url ?? CONFIG.defaultUrl;
  const intervalSec = saved?.intervalSec ?? CONFIG.defaultIntervalSec;

  elements.urlInput.value = url;
  elements.intervalInput.value = String(intervalSec);
  syncPresetButtons(elements, intervalSec);
  updateHost(elements, url);
}

function bindPresetButtons() {
  elements.presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (state.isMonitoring) {
        return;
      }
      const intervalSec = Number.parseInt(button.dataset.interval, 10);
      elements.intervalInput.value = String(intervalSec);
      syncPresetButtons(elements, intervalSec);
    });
  });

  elements.intervalInput.addEventListener("change", () => {
    try {
      const intervalSec = getIntervalSec();
      syncPresetButtons(elements, intervalSec);
    } catch {
      syncPresetButtons(elements, -1);
    }
  });
}

function bindKeyboardShortcuts() {
  window.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    toggleMonitoring();
  });
}

window.addEventListener("beforeunload", () => {
  stopMonitoring();
  ecg?.destroy();
  if (relativeTimerId) {
    window.clearInterval(relativeTimerId);
  }
});

async function init() {
  elements = bindElements();
  hydrateSettings();
  setIdleStatus(elements);
  updateStats(elements, state.stats, state.pingData.responseTimes);
  resetTimeline(elements.timelineStrip);

  ecg = new EcgAnimator(document.getElementById("ecgCanvas"));
  sessionClock = new SessionClock((snapshot) => {
    updateSessionLine(elements, snapshot);
  });

  await loadChartLibrary();
  uptimeChart = createUptimeChart(
    document.getElementById("uptimeChart"),
    state.pingData,
  );
  latencyChart = createLatencyChart(
    document.getElementById("latencyChart"),
    state.pingData,
  );

  bindPresetButtons();
  bindKeyboardShortcuts();

  elements.startBtn.addEventListener("click", toggleMonitoring);
  elements.resetBtn.addEventListener("click", resetSession);
  elements.urlInput.addEventListener("input", () => {
    if (!state.isMonitoring) {
      updateHost(elements, elements.urlInput.value.trim());
    }
  });
  elements.urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !state.isMonitoring) {
      startMonitoring();
    }
  });

  relativeTimerId = window.setInterval(() => {
    refreshLogRelativeTimes(elements);
  }, 15000);
}

init().catch((error) => {
  console.error(error);
  setFieldError(
    document.getElementById("urlError"),
    "Failed to initialize the monitor.",
  );
});
