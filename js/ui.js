import { CONFIG } from "./config.js";
import {
  computeAverageLatency,
  formatCountdown,
  formatDuration,
  updateUptimeRing,
} from "./session.js";

export function bindElements() {
  return {
    stage: document.getElementById("stage"),
    urlInput: document.getElementById("urlInput"),
    intervalInput: document.getElementById("intervalInput"),
    presetButtons: [...document.querySelectorAll(".preset-btn")],
    urlError: document.getElementById("urlError"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    statusText: document.getElementById("statusText"),
    hostName: document.getElementById("hostName"),
    hostUrl: document.getElementById("hostUrl"),
    sessionLine: document.getElementById("sessionLine"),
    uptimeRing: document.getElementById("uptimeRing"),
    totalPings: document.getElementById("totalPings"),
    successCount: document.getElementById("successCount"),
    failureCount: document.getElementById("failureCount"),
    uptime: document.getElementById("uptime"),
    avgLatency: document.getElementById("avgLatency"),
    timelineStrip: document.getElementById("timelineStrip"),
    logContainer: document.getElementById("logContainer"),
  };
}

export function setFieldError(element, message) {
  element.textContent = message || "";
}

export function setMonitoringState(elements, isMonitoring) {
  elements.startBtn.textContent = isMonitoring
    ? "Stop monitoring"
    : "Start monitoring";
  elements.startBtn.classList.toggle("btn-primary", !isMonitoring);
  elements.startBtn.classList.toggle("btn-stop", isMonitoring);
  elements.startBtn.setAttribute("aria-pressed", String(isMonitoring));
  elements.urlInput.disabled = isMonitoring;
  elements.intervalInput.disabled = isMonitoring;
  elements.resetBtn.disabled = isMonitoring;
  elements.presetButtons.forEach((button) => {
    button.disabled = isMonitoring;
  });
}

export function syncPresetButtons(elements, intervalSec) {
  elements.presetButtons.forEach((button) => {
    const value = Number.parseInt(button.dataset.interval, 10);
    button.classList.toggle("is-active", value === intervalSec);
  });
}

export function updateHost(elements, url) {
  if (!url) {
    elements.hostName.textContent = "—";
    elements.hostUrl.textContent = "Enter a URL below to begin";
    return;
  }

  try {
    const parsed = new URL(url);
    elements.hostName.textContent = parsed.hostname;
    elements.hostUrl.textContent = parsed.href;
  } catch {
    elements.hostName.textContent = url;
    elements.hostUrl.textContent = url;
  }
}

export function setStageState(elements, state) {
  elements.stage.dataset.state = state;
}

export function updateStats(elements, stats, responseTimes) {
  elements.totalPings.textContent = String(stats.total);
  elements.successCount.textContent = String(stats.success);
  elements.failureCount.textContent = String(stats.failure);

  const uptimePercentage =
    stats.total > 0
      ? (stats.success / stats.total) * 100
      : 100;

  elements.uptime.textContent = `${uptimePercentage.toFixed(1)}%`;
  updateUptimeRing(
    elements.uptimeRing,
    uptimePercentage,
    stats.total > 0,
  );

  const average = computeAverageLatency(responseTimes);
  elements.avgLatency.textContent =
    average === null ? "—" : `${average}ms`;
}

export function updateStatus(elements, state, label) {
  setStageState(elements, state);
  elements.statusText.textContent = label;
}

export function setIdleStatus(elements) {
  updateStatus(elements, "idle", "Ready");
  elements.sessionLine.innerHTML =
    "<span>Press <strong>Start</strong> to begin monitoring</span>";
}

export function setCheckingStatus(elements) {
  updateStatus(elements, "checking", "Checking…");
}

export function updateSessionLine(elements, snapshot) {
  if (!snapshot.isActive) {
    return;
  }

  elements.sessionLine.innerHTML = `
    <span>Running for <strong>${formatDuration(snapshot.elapsedMs)}</strong></span>
    <span>Next check in <strong>${formatCountdown(snapshot.nextInSec)}</strong></span>
  `;
}

export function formatRelativeTime(date) {
  const deltaSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (deltaSec < 5) {
    return "just now";
  }
  if (deltaSec < 60) {
    return `${deltaSec}s ago`;
  }
  const minutes = Math.floor(deltaSec / 60);
  return `${minutes}m ago`;
}

export function addLogEntry(elements, result) {
  const emptyState = elements.logContainer.querySelector(".log-empty");
  if (emptyState) {
    emptyState.remove();
  }

  const now = new Date();
  const entry = document.createElement("article");
  entry.className = `log-item ${
    result.success ? "log-item-pass" : "log-item-fail"
  }`;

  const badge = document.createElement("span");
  badge.className = "log-badge";
  badge.textContent = result.success ? "Pass" : "Fail";

  const content = document.createElement("div");
  content.className = "log-content";

  const title = document.createElement("div");
  title.className = "log-title";
  title.textContent = result.success
    ? `Responded in ${result.responseTime}ms`
    : "Unreachable";

  const detail = document.createElement("div");
  detail.className = "log-detail";
  detail.textContent = result.detail;

  const meta = document.createElement("div");
  meta.className = "log-meta";

  const time = document.createElement("time");
  time.className = "log-time";
  time.dateTime = now.toISOString();
  time.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const relative = document.createElement("div");
  relative.className = "log-relative";
  relative.textContent = "just now";

  content.append(title, detail);
  meta.append(time, relative);
  entry.append(badge, content, meta);
  elements.logContainer.prepend(entry);

  window.setTimeout(() => {
    relative.textContent = formatRelativeTime(now);
  }, 5000);

  while (elements.logContainer.children.length > CONFIG.maxLogEntries) {
    elements.logContainer.lastElementChild.remove();
  }
}

export function clearLog(elements) {
  elements.logContainer.innerHTML = `
    <div class="log-empty">
      <span class="log-empty-icon">∿</span>
      <span>No checks yet. Start monitoring to see live results.</span>
    </div>
  `;
}

export function refreshLogRelativeTimes(elements) {
  elements.logContainer.querySelectorAll(".log-item time").forEach((node) => {
    const relative = node.parentElement?.querySelector(".log-relative");
    if (!relative || !node.dateTime) {
      return;
    }
    relative.textContent = formatRelativeTime(new Date(node.dateTime));
  });
}
