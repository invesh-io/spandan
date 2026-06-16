import { CONFIG } from "./config.js";

export function bindElements() {
  return {
    urlInput: document.getElementById("urlInput"),
    intervalInput: document.getElementById("intervalInput"),
    urlError: document.getElementById("urlError"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    statusBadge: document.getElementById("statusBadge"),
    statusPulse: document.getElementById("statusPulse"),
    statusText: document.getElementById("statusText"),
    totalPings: document.getElementById("totalPings"),
    successCount: document.getElementById("successCount"),
    failureCount: document.getElementById("failureCount"),
    uptime: document.getElementById("uptime"),
    logContainer: document.getElementById("logContainer"),
  };
}

export function setFieldError(element, message) {
  element.textContent = message || "";
}

export function setMonitoringState(elements, isMonitoring) {
  elements.startBtn.textContent = isMonitoring ? "Stop" : "Start";
  elements.startBtn.classList.toggle("btn-primary", !isMonitoring);
  elements.startBtn.classList.toggle("btn-danger", isMonitoring);
  elements.startBtn.setAttribute("aria-pressed", String(isMonitoring));
  elements.urlInput.disabled = isMonitoring;
  elements.intervalInput.disabled = isMonitoring;
  elements.resetBtn.disabled = isMonitoring;
}

export function updateStats(elements, stats) {
  elements.totalPings.textContent = String(stats.total);
  elements.successCount.textContent = String(stats.success);
  elements.failureCount.textContent = String(stats.failure);

  const uptimePercentage =
    stats.total > 0
      ? ((stats.success / stats.total) * 100).toFixed(1)
      : "100.0";

  elements.uptime.textContent = `${uptimePercentage}%`;
}

export function updateStatus(elements, success) {
  elements.statusBadge.dataset.state = success ? "online" : "offline";
  elements.statusText.textContent = success ? "Online" : "Offline";
}

export function setIdleStatus(elements) {
  elements.statusBadge.dataset.state = "idle";
  elements.statusText.textContent = "Idle";
}

export function addLogEntry(elements, result) {
  const emptyState = elements.logContainer.querySelector(".log-empty");
  if (emptyState) {
    emptyState.remove();
  }

  const entry = document.createElement("article");
  entry.className = `log-entry ${
    result.success ? "log-entry-success" : "log-entry-failure"
  }`;

  const indicator = document.createElement("span");
  indicator.className = "log-indicator";
  indicator.setAttribute("aria-hidden", "true");

  const body = document.createElement("div");
  body.className = "log-body";

  const title = document.createElement("div");
  title.className = "log-title";
  title.textContent = result.success ? "Passed" : "Failed";

  const detail = document.createElement("div");
  detail.className = "log-detail";
  detail.textContent = result.detail;

  const time = document.createElement("time");
  time.className = "log-time";
  time.dateTime = new Date().toISOString();
  time.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  body.append(title, detail);
  entry.append(indicator, body, time);
  elements.logContainer.prepend(entry);

  while (elements.logContainer.children.length > CONFIG.maxLogEntries) {
    elements.logContainer.lastElementChild.remove();
  }
}

export function clearLog(elements) {
  elements.logContainer.innerHTML =
    '<p class="log-empty">No checks yet. Hit Start to begin monitoring.</p>';
}
