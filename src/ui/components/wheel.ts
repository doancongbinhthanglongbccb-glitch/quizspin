import type { WheelModel, WheelLayoutSegment } from '../../core/wheel';

/**
 * HTML render function trả về canvas element
 */
export function renderWheelHTML(): string {
  return `
    <div class="wheel-frame" aria-hidden="false">
      <canvas id="wheel-canvas" class="wheel-canvas"></canvas>
    </div>
  `;
}

// ============================================================================
// Canvas rendering internals
// ============================================================================

const WHEEL_CONFIG = {
  padding: 20,
  pointerHeight: 28,
  pointerWidth: 16,
  centerDotRadius: 10,
  segmentBorderWidth: 2,
  minRadius: 120,
  labelMaxFontSize: 16,
  labelMinFontSize: 9,
  labelMaxLines: 3,
};

type CanvasSize = {
  width: number;
  height: number;
  dpr: number;
};

const canvasSizeCache = new WeakMap<HTMLCanvasElement, CanvasSize>();

const LABEL_FONT_STACK = 'Arial, "Segoe UI", sans-serif';

function degreesToRadians(angleDeg: number): number {
  return (angleDeg * Math.PI) / 180;
}

function normalizeDegrees(angleDeg: number): number {
  const next = angleDeg % 360;
  return next < 0 ? next + 360 : next;
}

function getCachedCanvasSize(canvas: HTMLCanvasElement): CanvasSize {
  const cachedSize = canvasSizeCache.get(canvas);
  if (cachedSize) {
    return cachedSize;
  }

  const dpr = window.devicePixelRatio || 1;
  return {
    width: Math.max(1, canvas.width / dpr || 450),
    height: Math.max(1, canvas.height / dpr || 450),
    dpr,
  };
}

function measureCanvasSize(canvas: HTMLCanvasElement): CanvasSize {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const style = window.getComputedStyle(canvas);

  const width = Math.max(
    1,
    Math.round(rect.width || parseFloat(style.width) || canvas.clientWidth || canvas.width / dpr || 450),
  );
  const height = Math.max(
    1,
    Math.round(rect.height || parseFloat(style.height) || canvas.clientHeight || canvas.height / dpr || 450),
  );

  return { width, height, dpr };
}

function syncCanvasSize(canvas: HTMLCanvasElement): CanvasSize {
  const nextSize = measureCanvasSize(canvas);
  const previousSize = canvasSizeCache.get(canvas);

  if (
    previousSize &&
    previousSize.width === nextSize.width &&
    previousSize.height === nextSize.height &&
    previousSize.dpr === nextSize.dpr
  ) {
    return previousSize;
  }

  canvasSizeCache.set(canvas, nextSize);
  canvas.width = Math.round(nextSize.width * nextSize.dpr);
  canvas.height = Math.round(nextSize.height * nextSize.dpr);

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.setTransform(nextSize.dpr, 0, 0, nextSize.dpr, 0, 0);
    ctx.clearRect(0, 0, nextSize.width, nextSize.height);
  }

  return nextSize;
}

function wrapLabelToWidth(ctx: CanvasRenderingContext2D, label: string, maxWidth: number): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [''];
  }

  const lines: string[] = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    const testLine = `${currentLine} ${word}`;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  lines.push(currentLine);
  return lines;
}

function trimTextToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  const ellipsis = '...';
  if (ctx.measureText(ellipsis).width >= maxWidth) {
    return '';
  }

  let result = text;
  while (result.length > 0 && ctx.measureText(`${result}${ellipsis}`).width > maxWidth) {
    result = result.slice(0, -1);
  }

  return `${result}${ellipsis}`;
}

function fitLabelLayout(ctx: CanvasRenderingContext2D, label: string, maxWidth: number): { fontSize: number; lines: string[] } {
  for (let fontSize = WHEEL_CONFIG.labelMaxFontSize; fontSize >= WHEEL_CONFIG.labelMinFontSize; fontSize -= 1) {
    ctx.font = `700 ${fontSize}px ${LABEL_FONT_STACK}`;
    const lines = wrapLabelToWidth(ctx, label, maxWidth).map((line) => trimTextToWidth(ctx, line, maxWidth));
    if (lines.length <= WHEEL_CONFIG.labelMaxLines) {
      return { fontSize, lines };
    }
  }

  ctx.font = `700 ${WHEEL_CONFIG.labelMinFontSize}px ${LABEL_FONT_STACK}`;
  const fallbackLines = wrapLabelToWidth(ctx, label, maxWidth)
    .slice(0, WHEEL_CONFIG.labelMaxLines)
    .map((line) => trimTextToWidth(ctx, line, maxWidth));

  return { fontSize: WHEEL_CONFIG.labelMinFontSize, lines: fallbackLines };
}

function shouldFlipLabel(angleDeg: number): boolean {
  const normalizedAngle = normalizeDegrees(angleDeg);
  return normalizedAngle > 90 && normalizedAngle < 270;
}

/**
 * Khởi tạo canvas với High DPI support.
 * Adjust canvas element size để match device pixels.
 */
function initializeCanvasForHighDPI(canvas: HTMLCanvasElement): void {
  syncCanvasSize(canvas);
}

/**
 * Vẽ một segment của wheel.
 * Segment gồm: arc, border, text tên segment.
 */
function drawSegment(
  ctx: CanvasRenderingContext2D,
  segment: WheelLayoutSegment,
  radius: number,
): void {
  const startAngleRad = degreesToRadians(segment.startAngle);
  const endAngleRad = degreesToRadians(segment.endAngle);
  const centerAngleRad = degreesToRadians(segment.centerAngle);
  const sliceRad = degreesToRadians(segment.endAngle - segment.startAngle);

  // Draw segment arc
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
  ctx.closePath();
  ctx.fillStyle = segment.color;
  ctx.fill();

  ctx.save();
  ctx.clip();
  const sheen = ctx.createLinearGradient(-radius, -radius, radius, radius);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.20)');
  sheen.addColorStop(0.48, 'rgba(255, 255, 255, 0.06)');
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0.10)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = WHEEL_CONFIG.segmentBorderWidth;
  ctx.stroke();

  // Draw text label
  const textRadius = radius * 0.62;
  const textX = textRadius * Math.cos(centerAngleRad);
  const textY = textRadius * Math.sin(centerAngleRad);
  const segmentChordWidth = Math.max(56, 2 * textRadius * Math.sin(sliceRad / 2) * 0.88);
  const labelLayout = fitLabelLayout(ctx, segment.label, segmentChordWidth);
  const labelRotation = shouldFlipLabel(segment.centerAngle) ? centerAngleRad + Math.PI : centerAngleRad;

  ctx.save();
  ctx.translate(textX, textY);
  ctx.rotate(labelRotation);
  ctx.font = `700 ${labelLayout.fontSize}px ${LABEL_FONT_STACK}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  const lines = labelLayout.lines;
  const lineHeight = Math.round(labelLayout.fontSize * 1.1);
  const startY = (-(lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctx.fillText(line, 0, y);
  });

  ctx.restore();
}

/**
 * Vẽ pointer cố định ở phía trên wheel.
 * Pointer là hình tam giác chỉ xuống.
 */
function drawPointer(ctx: CanvasRenderingContext2D, centerX: number, pointerTopY: number): void {
  const pw = WHEEL_CONFIG.pointerWidth;
  const ph = WHEEL_CONFIG.pointerHeight;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  const pointerGradient = ctx.createLinearGradient(centerX, pointerTopY, centerX, pointerTopY + ph);
  pointerGradient.addColorStop(0, '#ffe08a');
  pointerGradient.addColorStop(0.45, '#ff6b6b');
  pointerGradient.addColorStop(1, '#d94848');

  // Main pointer
  ctx.fillStyle = pointerGradient;
  ctx.beginPath();
  ctx.moveTo(centerX, pointerTopY);
  ctx.lineTo(centerX - pw / 2, pointerTopY + ph);
  ctx.lineTo(centerX + pw / 2, pointerTopY + ph);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX, pointerTopY + 1.5);
  ctx.lineTo(centerX - pw * 0.22, pointerTopY + ph * 0.58);
  ctx.lineTo(centerX + pw * 0.22, pointerTopY + ph * 0.58);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, pointerTopY + ph - 2, 3.25, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, pointerTopY + ph - 2, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ff5252';
  ctx.fill();

  ctx.shadowColor = 'transparent';
}

function drawWheelChrome(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.save();
  const ringGradient = ctx.createRadialGradient(0, 0, radius * 0.7, 0, 0, radius + 8);
  ringGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  ringGradient.addColorStop(0.6, 'rgba(245, 245, 245, 0.95)');
  ringGradient.addColorStop(1, 'rgba(225, 225, 225, 1)');
  ctx.fillStyle = ringGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCenterCap(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  const capGradient = ctx.createRadialGradient(-2, -2, 1, 0, 0, WHEEL_CONFIG.centerDotRadius);
  capGradient.addColorStop(0, '#ffffff');
  capGradient.addColorStop(0.55, '#f3f3f3');
  capGradient.addColorStop(1, '#d9d9d9');
  ctx.fillStyle = capGradient;
  ctx.beginPath();
  ctx.arc(0, 0, WHEEL_CONFIG.centerDotRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Vẽ toàn bộ wheel vào canvas.
 * Rotation được apply via transform trước khi vẽ segments.
 */
export function drawWheel(canvasId: string, model: WheelModel, rotationDeg: number): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) {
    console.warn(`Canvas element with id "${canvasId}" not found`);
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('Could not get 2D context from canvas');
    return;
  }

  const canvasSize = getCachedCanvasSize(canvas);
  const canvasWidth = canvasSize.width;
  const canvasHeight = canvasSize.height;

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Calculate positions
  const centerX = canvasWidth / 2;
  const wheelCenterY = canvasWidth / 2; // Square wheel
  const pointerTopY = WHEEL_CONFIG.padding;
  const radius = Math.max(WHEEL_CONFIG.minRadius, (Math.min(canvasWidth, canvasHeight) - WHEEL_CONFIG.padding * 2) / 2);

  // Draw wheel background circle
  ctx.save();
  ctx.translate(centerX, wheelCenterY);
  drawWheelChrome(ctx, radius);
  ctx.restore();

  // Save state and apply rotation
  ctx.save();
  ctx.translate(centerX, wheelCenterY);
  ctx.rotate((rotationDeg * Math.PI) / 180);

  // Draw all segments
  model.segments.forEach((segment) => {
    drawSegment(ctx, segment, radius);
  });

  ctx.restore();

  // Draw center decorative circle
  ctx.save();
  ctx.translate(centerX, wheelCenterY);
  drawCenterCap(ctx);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Draw pointer
  drawPointer(ctx, centerX, pointerTopY);
}

/**
 * Setup canvas element: khởi tạo, xử lý resize, vẽ lần đầu.
 * Trả về cleanup function.
 */
export function setupWheelCanvas(canvasId: string, model: WheelModel): () => void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) {
    console.warn(`Canvas element with id "${canvasId}" not found during setup`);
    return () => {};
  }

  // Initial setup
  initializeCanvasForHighDPI(canvas);
  drawWheel(canvasId, model, 0);

  // Handle size changes without reading offsetWidth on every draw.
  let resizeTimeout: number | undefined;
  const refreshCanvas = (): void => {
    initializeCanvasForHighDPI(canvas);
    drawWheel(canvasId, model, 0);
  };

  const scheduleRefresh = (): void => {
    if (resizeTimeout) {
      window.clearTimeout(resizeTimeout);
    }

    resizeTimeout = window.setTimeout(refreshCanvas, 100);
  };

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleRefresh);
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener('resize', scheduleRefresh);
  }

  // Cleanup function
  return () => {
    if (resizeTimeout) {
      window.clearTimeout(resizeTimeout);
    }

    resizeObserver?.disconnect();
    window.removeEventListener('resize', scheduleRefresh);
  };
}

/**
 * Public API: WheelRenderer.
 * Dùng để render và control wheel canvas từ component.
 */
export const WheelRenderer = {
  renderHTML: renderWheelHTML,
  setup: setupWheelCanvas,
  draw: drawWheel,
  initialize: initializeCanvasForHighDPI,
};
