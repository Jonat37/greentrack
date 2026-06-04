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
          fgColor="#16a34a"
          level="M"
          includeMargin
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center gap-4 w-full max-w-xs">
      <div ref={svgRef}>
        <QRCodeSVG
          value={finalUrl}
          size={180}
          bgColor="#ffffff"
          fgColor="#16a34a"
          level="M"
          includeMargin
        />
      </div>
      <p className="text-xs text-gray-400 text-center break-all">{finalUrl}</p>
      <div className="flex gap-2 w-full">
        <button
          onClick={copiarLink}
          className="flex-1 border border-green-600 text-green-700 hover:bg-green-50 text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {copiado ? "Copiado!" : "Copiar link"}
        </button>
        <button
          onClick={baixarQR}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          Baixar QR
        </button>
      </div>
    </div>
  );
}
