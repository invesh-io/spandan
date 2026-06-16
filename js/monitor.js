import { CONFIG } from "./config.js";

export function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const parsed = new URL(withProtocol);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  return parsed.href;
}

export function validateInterval(value) {
  const interval = Number.parseInt(String(value), 10);
  if (!Number.isFinite(interval)) {
    throw new Error("Enter a valid interval in seconds.");
  }
  if (interval < CONFIG.minIntervalSec || interval > CONFIG.maxIntervalSec) {
    throw new Error(
      `Interval must be between ${CONFIG.minIntervalSec} and ${CONFIG.maxIntervalSec} seconds.`,
    );
  }
  return interval;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return {
      url: typeof parsed.url === "string" ? parsed.url : CONFIG.defaultUrl,
      intervalSec:
        Number.isFinite(parsed.intervalSec) && parsed.intervalSec > 0
          ? parsed.intervalSec
          : CONFIG.defaultIntervalSec,
    };
  } catch {
    return null;
  }
}

export function saveSettings({ url, intervalSec }) {
  localStorage.setItem(
    CONFIG.storageKey,
    JSON.stringify({ url, intervalSec }),
  );
}

export async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function checkReachability(url) {
  const startedAt = performance.now();

  const corsAttempts = [
    { method: "HEAD", mode: "cors", label: "HTTP HEAD" },
    { method: "GET", mode: "cors", label: "HTTP GET" },
  ];

  for (const attempt of corsAttempts) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: attempt.method,
          mode: attempt.mode,
          cache: "no-store",
          redirect: "follow",
        },
        CONFIG.requestTimeoutMs,
      );

      const responseTime = Math.round(performance.now() - startedAt);
      const success = response.ok;

      return {
        success,
        responseTime,
        detail: success
          ? `${attempt.label} · ${response.status} OK · ${responseTime}ms`
          : `${attempt.label} · HTTP ${response.status} · ${responseTime}ms`,
        mode: "verified",
      };
    } catch (error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          responseTime: Math.round(performance.now() - startedAt),
          detail: "Request timed out after 10 seconds",
          mode: "timeout",
        };
      }
    }
  }

  try {
    await fetchWithTimeout(
      url,
      {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
      },
      CONFIG.requestTimeoutMs,
    );

    const responseTime = Math.round(performance.now() - startedAt);
    return {
      success: true,
      responseTime,
      detail: `Network reachable · ${responseTime}ms · status hidden by browser`,
      mode: "network",
    };
  } catch (error) {
    const responseTime = Math.round(performance.now() - startedAt);
    return {
      success: false,
      responseTime,
      detail:
        error.name === "AbortError"
          ? "Request timed out after 10 seconds"
          : "Could not reach the URL from this browser",
      mode: "failed",
    };
  }
}
