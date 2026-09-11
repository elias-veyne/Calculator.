/**
 * NeonBackground.kt-compose  →  NeonBackground.tsx
 * ============================================================
 * Living animé night-sky: three drifting aurora blobs (theme
 * colored, GPU-composited), twinkling stars + rising neon embers
 * on a canvas, periodic shooting stars and a floating moon glow.
 * Pointer-events are disabled — pure atmosphere.
 * ============================================================
 */
import { useEffect, useRef, useState } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

interface Ember {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  alpha: number;
  pulse: number;
  color: string;
}

interface Shooting {
  id: number;
  x: number;
  y: number;
}

const EMBER_COLORS = ["0, 240, 255", "178, 107, 255", "255, 79, 216"];

export function NeonBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shooting, setShooting] = useState<Shooting[]>([]);

  /* twinkling stars + rising neon embers */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    let stars: Star[] = [];
    let embers: Ember[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const seed = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      stars = Array.from({ length: 90 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        r: Math.random() * 1.1 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.6,
      }));
      embers = Array.from({ length: Math.min(34, Math.max(16, Math.floor(w / 28))) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 0.6,
        speed: Math.random() * 0.32 + 0.05,
        drift: (Math.random() - 0.5) * 0.28,
        alpha: Math.random() * 0.45 + 0.15,
        pulse: Math.random() * Math.PI * 2,
        color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
      }));
    };

    const resize = () => {
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const step = () => {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      for (const s of stars) {
        const a = 0.22 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx.fillStyle = `rgba(220, 225, 255, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const p of embers) {
        p.y -= p.speed;
        p.x += p.drift + Math.sin(t * 1.6 + p.pulse) * 0.14;
        if (p.y < -10) {
          p.y = canvas.clientHeight + 10;
          p.x = Math.random() * canvas.clientWidth;
        }
        if (p.x < -10) p.x = canvas.clientWidth + 10;
        if (p.x > canvas.clientWidth + 10) p.x = -10;

        const a = p.alpha * (0.7 + 0.3 * Math.sin(t * 2 + p.pulse));
        const radius = p.size * 5;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        g.addColorStop(0, `rgba(${p.color}, ${a})`);
        g.addColorStop(1, `rgba(${p.color}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* shooting stars on a randomized cadence */
  useEffect(() => {
    const spawn = () => {
      setShooting((s) => [
        ...s.slice(-2),
        { id: Date.now() + Math.random(), x: 15 + Math.random() * 70, y: 4 + Math.random() * 30 },
      ]);
    };
    const first = window.setTimeout(spawn, 1800);
    const iv = window.setInterval(spawn, 7500 + Math.random() * 5000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(iv);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* theme-colored aurora waves */}
      <div
        className="aurora-blob aurora-1"
        style={{
          width: "46vw",
          height: "46vw",
          minWidth: 380,
          minHeight: 380,
          left: "-8%",
          top: "-14%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--c-purple) 32%, transparent), transparent 70%)",
        }}
      />
      <div
        className="aurora-blob aurora-2"
        style={{
          width: "40vw",
          height: "40vw",
          minWidth: 340,
          minHeight: 340,
          right: "-10%",
          top: "6%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--c-cyan) 26%, transparent), transparent 70%)",
          animationDelay: "-8s",
        }}
      />
      <div
        className="aurora-blob aurora-3"
        style={{
          width: "52vw",
          height: "52vw",
          minWidth: 420,
          minHeight: 420,
          left: "24%",
          bottom: "-26%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--c-pink) 24%, transparent), transparent 70%)",
          animationDelay: "-14s",
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* shooting stars */}
      {shooting.map((s) => (
        <span
          key={s.id}
          className="shooting-star"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
          onAnimationEnd={() => setShooting((cur) => cur.filter((x) => x.id !== s.id))}
        />
      ))}

      {/* drifting moon glow */}
      <div className="absolute -top-28 left-1/2 -translate-x-1/2">
        <div
          className="moon-drift h-[440px] w-[440px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(150,125,255,0.16) 0%, rgba(150,125,255,0.05) 45%, transparent 72%)",
          }}
        />
      </div>
    </div>
  );
}
