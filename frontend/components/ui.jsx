"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ── Logo wordmark (SVG leaf + GreenTrack) ───────────────────────────────── */
export function Logo({ light = false, size = 22 }) {
  return (
    <span
      className="flex items-center gap-2 select-none"
      style={{ fontWeight: 700, fontSize: "1.125rem", letterSpacing: "-0.02em" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2C7.5 2 4 6 4 10.5c0 4 2.5 7 6 8.5V22h4v-3c3.5-1.5 6-4.5 6-8.5C20 6 16.5 2 12 2z"
          fill={light ? "#9fdfba" : "var(--color-gt-forest)"}
        />
        <path
          d="M12 8c0 0-3 2-3 5h6c0-3-3-5-3-5z"
          fill={light ? "var(--color-gt-forest)" : "#9fdfba"}
        />
      </svg>
      <span style={{ color: light ? "#ffffff" : "var(--color-gt-forest)" }}>GreenTrack</span>
    </span>
  );
}

/* ── Dark top nav (forest) with role chip + right slot ───────────────────── */
export function TopNav({ chip, address, right, maxWidth = 1080 }) {
  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;
  return (
    <nav style={{ background: "var(--color-gt-forest)", padding: "16px 24px" }}>
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link href="/" style={{ transition: "opacity 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Logo light />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {chip && (
            <span
              style={{
                background: "var(--color-gt-canopy-mid)",
                color: "#ffffff",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 9999,
                letterSpacing: "0.02em",
              }}
            >
              {chip}
            </span>
          )}
          {short && (
            <span style={{ color: "var(--color-gt-on-dark-mute)", fontSize: "0.75rem", fontFamily: "monospace" }}>
              {short}
            </span>
          )}
          {right}
        </div>
      </div>
    </nav>
  );
}

/* ── Animated counter — counts up to `value` when scrolled into view ──────── */
export function AnimatedCounter({ value = 0, duration = 1100, suffix = "", className, style }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const target = Number(value) || 0;
      if (target === 0) { setDisplay(0); return; }
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        // easeOutExpo
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setDisplay(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className} style={style}>
      {display.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

/* ── Reveal-on-scroll wrapper ────────────────────────────────────────────── */
export function Reveal({ children, delay = 0, as: Tag = "div", className = "", style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("gt-in");
            obs.unobserve(el);
          }
        }),
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={`gt-reveal ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}

/* ── Spinner with label ──────────────────────────────────────────────────── */
export function Loader({ label = "Consultando a blockchain..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "96px 0", gap: 16 }}>
      <div className="gt-spinner" />
      <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)" }}>{label}</p>
    </div>
  );
}

/* ── Status badge ────────────────────────────────────────────────────────── */
const STATUS_TINT = {
  ok:      { bg: "rgba(159,223,186,0.18)", color: "#0e2118", border: "1px solid rgba(159,223,186,0.5)" },
  pending: { bg: "rgba(180,130,0,0.10)",   color: "#7a5800", border: "1px solid rgba(180,130,0,0.25)" },
  error:   { bg: "rgba(180,30,30,0.08)",   color: "#8b1a1a", border: "1px solid rgba(180,30,30,0.22)" },
  neutral: { bg: "rgba(14,33,24,0.05)",    color: "var(--color-gt-ink-mute)", border: "1px solid var(--color-gt-hairline)" },
};
export function Badge({ tone = "neutral", children }) {
  const t = STATUS_TINT[tone] || STATUS_TINT.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: "0.6875rem",
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 9999,
        letterSpacing: "0.02em",
        ...t,
      }}
    >
      {children}
    </span>
  );
}

/* ── Inline error / loading notice ───────────────────────────────────────── */
export function Notice({ tone = "error", children, onClose }) {
  const t = STATUS_TINT[tone === "loading" ? "pending" : tone] || STATUS_TINT.error;
  return (
    <div
      className={tone === "loading" ? "gt-slide-down" : "gt-slide-down"}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        borderRadius: "var(--radius-gt-sm)",
        padding: "12px 14px",
        fontSize: "0.875rem",
        ...t,
        animation: tone === "loading" ? "gt-pulse-soft 1.6s ease-in-out infinite" : undefined,
      }}
    >
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1, color: "inherit" }}>×</button>
      )}
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────────────────────── */
export function SectionLabel({ children }) {
  return (
    <p
      className="gt-micro"
      style={{
        color: "var(--color-gt-ink-mute)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 12,
      }}
    >
      {children}
    </p>
  );
}
