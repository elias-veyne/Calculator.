/**
 * TiltPanel.kt-compose  →  TiltPanel.tsx
 * ============================================================
 * Wraps the calculator in a subtle 3D perspective that follows
 * the pointer (rotateX / rotateY + a moving glare highlight),
 * smoothed with requestAnimationFrame easing — the web twin of
 * the gyro-sensor parallax used by Android launchers.
 * ============================================================
 */
import { useEffect, useRef, type ReactNode } from "react";

export function TiltPanel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let hovering = false;
    let tx = 0, ty = 0; // target rotation
    let cx = 0, cy = 0; // current rotation
    let gx = 50, gy = 50; // target glare
    let cgx = 50, cgy = 50; // current glare

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      tx = -ny * 3.4;
      ty = nx * 4.6;
      gx = (nx * 0.5 + 0.5) * 100;
      gy = (ny * 0.5 + 0.5) * 100;
    };

    const loop = () => {
      cx += (tx - cx) * 0.09;
      cy += (ty - cy) * 0.09;
      cgx += (gx - cgx) * 0.12;
      cgy += (gy - cgy) * 0.12;
      el.style.transform = `perspective(1200px) rotateX(${cx.toFixed(2)}deg) rotateY(${cy.toFixed(2)}deg)`;
      el.style.setProperty("--gx", `${cgx.toFixed(1)}%`);
      el.style.setProperty("--gy", `${cgy.toFixed(1)}%`);
      const settled =
        Math.abs(tx - cx) < 0.02 && Math.abs(ty - cy) < 0.02 && Math.abs(gx - cgx) < 0.05;
      if (hovering || !settled) raf = requestAnimationFrame(loop);
    };

    const onEnter = () => {
      hovering = true;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      hovering = false;
      tx = 0;
      ty = 0;
      gx = 50;
      gy = 50;
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="relative">
      <div ref={ref} className="relative flex flex-col gap-3 will-change-transform">
        {/* glare highlight that follows the pointer */}
        <div
          className="pointer-events-none absolute inset-0 z-0 rounded-[2rem]"
          style={{
            background:
              "radial-gradient(640px circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.055), transparent 46%)",
          }}
        />
        {children}
      </div>
    </div>
  );
}
