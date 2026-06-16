const RING_CIRCUMFERENCE = 263.89;

export function updateUptimeRing(element, uptimePercent, hasChecks) {
  if (!hasChecks) {
    element.style.strokeDashoffset = "0";
    return;
  }

  const offset = RING_CIRCUMFERENCE * (1 - uptimePercent / 100);
  element.style.strokeDashoffset = String(offset);
}

export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatCountdown(seconds) {
  if (seconds <= 0) {
    return "now";
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

export class SessionClock {
  constructor(onTick) {
    this.onTick = onTick;
    this.startedAt = null;
    this.nextCheckAt = null;
    this.intervalSec = 5;
    this.timerId = null;
  }

  start(intervalSec) {
    this.startedAt = Date.now();
    this.intervalSec = intervalSec;
    this.scheduleNextCheck();
    this.startTicking();
  }

  stop() {
    this.startedAt = null;
    this.nextCheckAt = null;
    this.stopTicking();
    this.onTick(this.getSnapshot(false));
  }

  markCheckComplete() {
    this.scheduleNextCheck();
  }

  scheduleNextCheck() {
    this.nextCheckAt = Date.now() + this.intervalSec * 1000;
  }

  startTicking() {
    this.stopTicking();
    this.timerId = window.setInterval(() => {
      this.onTick(this.getSnapshot(true));
    }, 1000);
    this.onTick(this.getSnapshot(true));
  }

  stopTicking() {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  getSnapshot(isActive) {
    if (!isActive || !this.startedAt) {
      return {
        elapsedMs: 0,
        nextInSec: 0,
        isActive: false,
      };
    }

    return {
      elapsedMs: Date.now() - this.startedAt,
      nextInSec: Math.max(
        0,
        Math.ceil((this.nextCheckAt - Date.now()) / 1000),
      ),
      isActive: true,
    };
  }
}

export function computeAverageLatency(responseTimes) {
  if (!responseTimes.length) {
    return null;
  }
  const sum = responseTimes.reduce((total, value) => total + value, 0);
  return Math.round(sum / responseTimes.length);
}
