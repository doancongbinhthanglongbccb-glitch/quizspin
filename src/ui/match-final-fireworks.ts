type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: 'spark' | 'confetti';
  rotation: number;
  spin: number;
  width: number;
  height: number;
};

const COLORS = ['#d4a017', '#f3e6b8', '#b42318', '#2d6a4f', '#c45c26', '#ffffff', '#8f1c14'];

let activeStop: (() => void) | null = null;
let activeCanvas: HTMLCanvasElement | null = null;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)] ?? COLORS[0];
}

function spawnBurst(particles: Particle[], x: number, y: number): void {
  const count = Math.floor(rand(28, 44));
  for (let i = 0; i < count; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(2.2, 7.4);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: rand(48, 78),
      size: rand(1.6, 3.2),
      color: pickColor(),
      kind: 'spark',
      rotation: 0,
      spin: 0,
      width: 0,
      height: 0,
    });
  }
}

function spawnConfetti(particles: Particle[], width: number): void {
  const count = Math.floor(rand(2, 5));
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x: rand(0, width),
      y: rand(-24, -6),
      vx: rand(-1.2, 1.2),
      vy: rand(1.8, 4.2),
      life: 0,
      maxLife: rand(120, 180),
      size: 0,
      color: pickColor(),
      kind: 'confetti',
      rotation: rand(0, Math.PI * 2),
      spin: rand(-0.12, 0.12),
      width: rand(5, 9),
      height: rand(8, 14),
    });
  }
}

function resizeCanvas(canvas: HTMLCanvasElement): { width: number; height: number; dpr: number } {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return { width, height, dpr };
}

function startFireworks(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return () => {};
  }

  let { width, height } = resizeCanvas(canvas);
  const particles: Particle[] = [];
  let frameId = 0;
  let burstTimer = 0;
  let confettiTimer = 0;
  let elapsed = 0;
  const durationMs = 12000;

  const onResize = (): void => {
    ({ width, height } = resizeCanvas(canvas));
  };

  window.addEventListener('resize', onResize);

  const tick = (): void => {
    elapsed += 16;
    burstTimer += 16;
    confettiTimer += 16;

    if (burstTimer >= rand(520, 760)) {
      burstTimer = 0;
      spawnBurst(particles, rand(width * 0.18, width * 0.82), rand(height * 0.18, height * 0.52));
    }

    if (confettiTimer >= 90) {
      confettiTimer = 0;
      spawnConfetti(particles, width);
    }

    ctx.clearRect(0, 0, width, height);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.life += 1;
      particle.vy += particle.kind === 'spark' ? 0.08 : 0.04;
      particle.vx *= particle.kind === 'spark' ? 0.985 : 0.998;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.spin;

      const alpha = 1 - particle.life / particle.maxLife;
      if (alpha <= 0 || particle.y > height + 24) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;

      if (particle.kind === 'spark') {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
      }

      ctx.restore();
    }

    if (elapsed < durationMs || particles.length > 0) {
      frameId = window.requestAnimationFrame(tick);
    }
  };

  spawnBurst(particles, width * 0.5, height * 0.34);
  spawnConfetti(particles, width);
  frameId = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(frameId);
    window.removeEventListener('resize', onResize);
    ctx.clearRect(0, 0, width, height);
  };
}

export function syncMatchFinalFireworks(root: ParentNode): void {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-match-final-fireworks]');
  if (!canvas) {
    activeStop?.();
    activeStop = null;
    activeCanvas = null;
    return;
  }

  if (canvas === activeCanvas) {
    return;
  }

  activeStop?.();
  activeCanvas = canvas;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    activeStop = null;
    return;
  }

  activeStop = startFireworks(canvas);
}

export function stopMatchFinalFireworks(): void {
  activeStop?.();
  activeStop = null;
  activeCanvas = null;
}
