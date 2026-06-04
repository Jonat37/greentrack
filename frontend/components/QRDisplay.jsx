"use client";

import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRDisplay({ empresaId, compact = false }) {
  const [copiado, setCopiado] = useState(false);
  const svgRef = useRef(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const empresaUrl = `${appUrl}/empresa/${empresaId}`;

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(empresaUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback para navegadores sem clipboard API
      const input = document.createElement("input");
      input.value = empresaUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
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
    const img = new Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.download = `greentrack-qr-${empresaId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  }

  if (compact) {
    return (
      <div className="flex justify-center">
        <QRCodeSVG value={empresaUrl} size={100} bgColor="#ffffff" fgColor="#16a34a" level="M" includeMargin />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center gap-4 w-full max-w-xs">
      <div ref={svgRef}>
        <QRCodeSVG
          value={empresaUrl}
          size={180}
          bgColor="#ffffff"
          fgColor="#16a34a"
          level="M"
          includeMargin
        />
      </div>

      <p className="text-sm text-gray-500 text-center">
        Escaneie para verificar o impacto
      </p>

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
