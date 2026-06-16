const STATES = {
  idle: { color: "#52525b", speed: 0.004, amplitude: 0.08 },
  checking: { color: "#fbbf24", speed: 0.018, amplitude: 0.16 },
  online: { color: "#34d399", speed: 0.009, amplitude: 0.14 },
  offline: { color: "#fb7185", speed: 0.006, amplitude: 0.1 },
};

export class EcgAnimator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = "idle";
    this.phase = 0;
    this.rafId = null;
    this.resizeFrame = null;
    this.lastWidth = 0;
    this.lastHeight = 0;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame) {
        return;
      }
      this.resizeFrame = window.requestAnimationFrame(() => {
        this.resizeFrame = null;
        this.resize();
      });
    });
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.draw();
  }

  setState(state) {
    this.state = STATES[state] ? state : "idle";
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width < 1 || height < 1) {
      return;
    }
    if (width === this.lastWidth && height === this.lastHeight) {
      return;
    }
    this.lastWidth = width;
    this.lastHeight = height;
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  heartbeatOffset(progress) {
    if (progress < 0.12) {
      return 0;
    }
    if (progress < 0.18) {
      return -0.9;
    }
    if (progress < 0.24) {
      return 1.1;
    }
    if (progress < 0.32) {
      return -0.35;
    }
    if (progress < 0.42) {
      return 0.2;
    }
    return 0;
  }

  draw() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const config = STATES[this.state];

    this.ctx.clearRect(0, 0, width, height);

    const baseline = height * 0.58;
    const amplitude = height * config.amplitude;
    this.phase += config.speed;

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = config.color;
    this.ctx.shadowColor = config.color;
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();

    for (let x = 0; x <= width; x += 2) {
      const normalized = (x / width + this.phase) % 1;
      const y = baseline + this.heartbeatOffset(normalized) * amplitude;
      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    const scanX = ((this.phase * 2) % 1) * width;
    const gradient = this.ctx.createLinearGradient(
      scanX - 40,
      0,
      scanX + 40,
      0,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.08)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    this.rafId = window.requestAnimationFrame(() => this.draw());
  }

  destroy() {
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
    }
    if (this.resizeFrame) {
      window.cancelAnimationFrame(this.resizeFrame);
    }
    this.resizeObserver.disconnect();
  }
}
