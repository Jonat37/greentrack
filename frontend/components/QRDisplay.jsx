"use client";

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRDisplay({ empresaId, url, compact = false }) {
  const [mounted, setMounted] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL || "";
  const finalUrl = url || `${appUrl}/empresa/${empresaId}`;

  // Skeleton enquanto o servidor renderiza (evita hydration mismatch)
  if (!mounted) {
    const size = compact ? 100 : 180;
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-gray-100 rounded animate-pulse"
      />
    );
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(finalUrl);
    } catch {
      const input = document.createElement("input");
      input.value = finalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function baixarQR() {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const size = 180;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(objectUrl);
      const link = document.createElement("a");
      link.download = `greentrack-qr-${empresaId || "selo"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = objectUrl;
  }

  if (compact) {
    return (
      <div className="flex justify-center">
        <QRCodeSVG
          value={finalUrl}
          size={100}
          bgColor="#ffffff"
          fgColor="#0e2118"
          level="M"
          includeMargin
        />
      </div>
    );
  }

  return (
    <div className="gt-card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 320 }}>
      <div ref={svgRef}>
        <QRCodeSVG
          value={finalUrl}
          size={180}
          bgColor="#ffffff"
          fgColor="#0e2118"
          level="M"
          includeMargin
        />
      </div>
      <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)", textAlign: "center", wordBreak: "break-all" }}>{finalUrl}</p>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <button
          onClick={copiarLink}
          style={{ flex: 1, border: "1.5px solid var(--color-gt-forest)", color: "var(--color-gt-forest)", fontSize: "0.875rem", fontWeight: 700, padding: "9px", borderRadius: "var(--radius-gt-md)", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-gt-canvas-soft)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {copiado ? "Copiado!" : "Copiar link"}
        </button>
        <button onClick={baixarQR} className="btn-forest" style={{ flex: 1, justifyContent: "center", fontSize: "0.875rem", padding: "9px" }}>
          Baixar QR
        </button>
      </div>
    </div>
  );
}
