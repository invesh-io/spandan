import { CONFIG } from "./config.js";

export function renderTimeline(strip, statuses) {
  strip.replaceChildren();

  if (!statuses.length) {
    for (let index = 0; index < 24; index += 1) {
      const block = document.createElement("span");
      block.className = "timeline-block";
      strip.appendChild(block);
    }
    return;
  }

  const visible = statuses.slice(-CONFIG.maxChartPoints);
  for (const status of visible) {
    const block = document.createElement("span");
    block.className = `timeline-block ${
      status === 1 ? "timeline-block-online" : "timeline-block-offline"
    }`;
    strip.appendChild(block);
  }
}

export function resetTimeline(strip) {
  renderTimeline(strip, []);
}
