import { CONFIG } from "./config.js";

export function bindElements() {
  return {
    urlInput: document.getElementById("urlInput"),
    intervalInput: document.getElementById("intervalInput"),
    urlError: document.getElementById("urlError"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    currentStatus: document.getElementById("currentStatus"),
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
  elements.startBtn.textContent = isMonitoring ? "Stop" : "Start monitoring";
  elements.startBtn.classList.toggle("button-primary", !isMonitoring);
  elements.startBtn.classList.toggle("button-danger", isMonitoring);
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
  elements.statusPulse.className = "pulse-dot";
  elements.statusPulse.classList.add(
    success ? "pulse-dot-online" : "pulse-dot-offline",
  );

  elements.currentStatus.className = "stat-value status-line";
  elements.currentStatus.classList.add(
    success ? "stat-value-success" : "stat-value-danger",
  );
  elements.statusText.textContent = success ? "Online" : "Offline";
}

export function setIdleStatus(elements) {
  elements.statusPulse.className = "pulse-dot pulse-dot-idle";
  elements.currentStatus.className =
    "stat-value stat-value-neutral status-line";
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

  const body = document.createElement("div");
  const title = document.createElement("div");
  title.className = "log-title";
  title.textContent = result.success ? "Check passed" : "Check failed";

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
  entry.append(body, time);
  elements.logContainer.prepend(entry);

  while (elements.logContainer.children.length > CONFIG.maxLogEntries) {
    elements.logContainer.lastElementChild.remove();
  }
}

export function clearLog(elements) {
  elements.logContainer.innerHTML =
    '<p class="log-empty">No activity yet. Start monitoring to see checks here.</p>';
}
