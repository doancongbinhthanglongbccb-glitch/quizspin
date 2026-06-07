import { appContext } from '../../core/state';
import type { WheelModel, WheelLayoutSegment } from '../../core/wheel';
import { degreesToRadians } from '../../utils/angles';
import { getWheelDisplayRotation } from '../../utils/wheel-display-rotation';

/**
 * HTML render function trả về canvas element
 */
function renderWheelHTML(spinning = false): string {
  const spinningClass = spinning ? ' wheel-frame--spinning' : '';
  return `
    <div class="wheel-frame${spinningClass}" data-wheel-host aria-hidden="false"></div>
  `;
}

// ============================================================================
// Canvas rendering internals
// ============================================================================

const WHEEL_CONFIG = {
  padding: 20,
  pointerHeight: 42,
  pointerWidth: 26,
  centerDotRadius: 12,
  segmentBorderWidth: 2,
  minRadius: 120,
  labelMaxFontSize: 28,
  labelMinFontSize: 14,
  labelFontScale: 0.108,
  labelMaxLines: 3,
};

const WHEEL_CANVAS_ID = 'wheel-canvas';

type WheelMountState = {
  canvas: HTMLCanvasElement;
  cleanup: () => void;
  modelSignature: string;
};

let mountState: WheelMountState | null = null;

function buildModelSignature(model: WheelModel): string {
  return model.segments.map((segment) => `${segment.id}:${segment.label}:${segment.color}`).join('|');
}

type CanvasSize = {
  width: number;
  height: number;
  dpr: number;
};

const canvasSizeCache = new WeakMap<HTMLCanvasElement, CanvasSize>();

const LABEL_FONT_STACK = 'Arial, "Segoe UI", sans-serif';

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

function resolveLabelFontBounds(radius: number): { max: number; min: number } {
  const max = Math.round(
    Math.min(40, Math.max(WHEEL_CONFIG.labelMinFontSize + 2, radius * WHEEL_CONFIG.labelFontScale)),
  );
  const min = Math.round(Math.max(WHEEL_CONFIG.labelMinFontSize, max * 0.52));
  return { max, min };
}

function fitLabelLayout(
  ctx: CanvasRenderingContext2D,
  label: string,
  maxWidth: number,
  radius: number,
): { fontSize: number; lines: string[] } {
  const { max: maxFontSize, min: minFontSize } = resolveLabelFontBounds(radius);

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    ctx.font = `700 ${fontSize}px ${LABEL_FONT_STACK}`;
    const lines = wrapLabelToWidth(ctx, label, maxWidth).map((line) => trimTextToWidth(ctx, line, maxWidth));
    if (lines.length <= WHEEL_CONFIG.labelMaxLines) {
      return { fontSize, lines };
    }
  }

  ctx.font = `700 ${minFontSize}px ${LABEL_FONT_STACK}`;
  const fallbackLines = wrapLabelToWidth(ctx, label, maxWidth)
    .slice(0, WHEEL_CONFIG.labelMaxLines)
    .map((line) => trimTextToWidth(ctx, line, maxWidth));

  return { fontSize: minFontSize, lines: fallbackLines };
}

/** Lật 180° khi nhãn nằm nửa trên vòng — tránh chữ đọc ngược trên màn hình. */
function shouldFlipLabel(angleDeg: number): boolean {
  return Math.sin(degreesToRadians(angleDeg)) < 0;
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

  // Viền segment — tinh tế, glow nhẹ giữa các ô
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
  ctx.lineWidth = WHEEL_CONFIG.segmentBorderWidth;
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.14)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Draw text label
  const textRadius = radius * 0.64;
  const textX = textRadius * Math.cos(centerAngleRad);
  const textY = textRadius * Math.sin(centerAngleRad);
  const segmentChordWidth = Math.max(56, 2 * textRadius * Math.sin(sliceRad / 2) * 0.92);
  const labelLayout = fitLabelLayout(ctx, segment.label, segmentChordWidth, radius);
  const labelRotation = shouldFlipLabel(segment.centerAngle) ? centerAngleRad + Math.PI : centerAngleRad;

  ctx.save();
  ctx.translate(textX, textY);
  ctx.rotate(labelRotation);
  ctx.font = `700 ${labelLayout.fontSize}px ${LABEL_FONT_STACK}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = Math.max(6, Math.round(labelLayout.fontSize * 0.28));
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(2, Math.round(labelLayout.fontSize * 0.1));

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
 * Vẽ pointer cố định bên phải wheel (3h), tam giác chỉ vào tâm.
 */
function drawPointer(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
  const pw = WHEEL_CONFIG.pointerWidth;
  const ph = WHEEL_CONFIG.pointerHeight;
  const rimX = centerX + radius;
  const tipX = rimX;
  const baseX = rimX + ph;

  ctx.save();

  // Halo vàng gold — glow mạnh, shadow sâu
  ctx.shadowColor = 'rgba(251, 191, 36, 0.95)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = 'rgba(251, 191, 36, 0.42)';
  ctx.beginPath();
  ctx.moveTo(tipX, centerY);
  ctx.lineTo(baseX + 5, centerY - pw * 0.82);
  ctx.lineTo(baseX + 5, centerY + pw * 0.82);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 2;

  const pointerGradient = ctx.createLinearGradient(tipX, centerY, baseX, centerY);
  pointerGradient.addColorStop(0, '#fffbeb');
  pointerGradient.addColorStop(0.35, '#fbbf24');
  pointerGradient.addColorStop(0.72, '#f59e0b');
  pointerGradient.addColorStop(1, '#b45309');

  ctx.fillStyle = pointerGradient;
  ctx.beginPath();
  ctx.moveTo(tipX, centerY);
  ctx.lineTo(baseX, centerY - pw / 2);
  ctx.lineTo(baseX, centerY + pw / 2);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.lineWidth = 1.75;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(180, 83, 9, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tipX, centerY);
  ctx.lineTo(baseX, centerY - pw / 2);
  ctx.lineTo(baseX, centerY + pw / 2);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tipX + 3, centerY);
  ctx.lineTo(baseX - ph * 0.2, centerY - pw * 0.24);
  ctx.lineTo(baseX - ph * 0.2, centerY + pw * 0.24);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.fill();

  ctx.restore();
}

function drawWheelChrome(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.save();

  ctx.shadowColor = 'rgba(139, 92, 246, 0.35)';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.22)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
  ctx.stroke();

  const ringGradient = ctx.createRadialGradient(0, 0, radius * 0.62, 0, 0, radius + 10);
  ringGradient.addColorStop(0, 'rgba(28, 25, 44, 0.96)');
  ringGradient.addColorStop(0.5, 'rgba(14, 12, 24, 0.99)');
  ringGradient.addColorStop(0.82, 'rgba(251, 191, 36, 0.22)');
  ringGradient.addColorStop(1, 'rgba(251, 191, 36, 0.42)');
  ctx.fillStyle = ringGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'rgba(251, 191, 36, 0.45)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.58)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
  ctx.stroke();
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
function drawWheel(canvasId: string, model: WheelModel, rotationDeg: number): void {
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

  // Calculate positions — dành chỗ bên phải cho pointer
  const pointerPad = WHEEL_CONFIG.pointerHeight + 6;
  const centerX = canvasWidth / 2 - pointerPad * 0.25;
  const centerY = canvasHeight / 2;
  const radius = Math.max(
    WHEEL_CONFIG.minRadius,
    Math.min(
      centerX - WHEEL_CONFIG.padding,
      centerY - WHEEL_CONFIG.padding,
      canvasWidth - centerX - WHEEL_CONFIG.padding - pointerPad,
    ),
  );

  // Draw wheel background circle
  ctx.save();
  ctx.translate(centerX, centerY);
  drawWheelChrome(ctx, radius);
  ctx.restore();

  // Save state and apply rotation
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((rotationDeg * Math.PI) / 180);

  // Draw all segments
  model.segments.forEach((segment) => {
    drawSegment(ctx, segment, radius);
  });

  ctx.restore();

  // Draw center decorative circle
  ctx.save();
  ctx.translate(centerX, centerY);
  drawCenterCap(ctx);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.48)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  drawPointer(ctx, centerX, centerY, radius);
}

function destroyWheelMount(): void {
  mountState?.cleanup();
  mountState = null;
}

/**
 * Giữ một canvas wheel duy nhất — chỉ recreate khi model đổi.
 */
function ensureWheelMounted(
  hostSelector: string,
  model: WheelModel,
  rotationDeg: number,
): () => void {
  const host = document.querySelector<HTMLElement>(hostSelector);
  if (!host) {
    return () => {};
  }

  const signature = buildModelSignature(model);
  const canvasId = WHEEL_CANVAS_ID;

  if (mountState && mountState.modelSignature === signature) {
    if (!host.contains(mountState.canvas)) {
      host.replaceChildren(mountState.canvas);
    }
    if (!appContext.getRuntimeState().spinning) {
      initializeCanvasForHighDPI(mountState.canvas);
    }
    drawWheel(canvasId, model, rotationDeg);
    return mountState.cleanup;
  }

  mountState?.cleanup();

  const canvas = document.createElement('canvas');
  canvas.id = canvasId;
  canvas.className = 'wheel-canvas';
  host.replaceChildren(canvas);

  const cleanup = setupWheelCanvas(canvasId, model, rotationDeg);
  mountState = { canvas, cleanup, modelSignature: signature };
  return cleanup;
}

/**
 * Setup canvas element: khởi tạo, xử lý resize, vẽ lần đầu.
 * Trả về cleanup function.
 */
function setupWheelCanvas(canvasId: string, model: WheelModel, initialRotationDeg = 0): () => void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) {
    console.warn(`Canvas element with id "${canvasId}" not found during setup`);
    return () => {};
  }

  // Initial setup
  initializeCanvasForHighDPI(canvas);
  drawWheel(canvasId, model, initialRotationDeg);

  // Handle size changes without reading offsetWidth on every draw.
  let resizeTimeout: number | undefined;
  const refreshCanvas = (): void => {
    initializeCanvasForHighDPI(canvas);
    drawWheel(canvasId, model, getWheelDisplayRotation());
  };

  const scheduleRefresh = (): void => {
    if (appContext.getRuntimeState().spinning) {
      return;
    }

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
  ensure: ensureWheelMounted,
  destroy: destroyWheelMount,
  draw: drawWheel,
};
