"use client";

import { AnimatedCounter } from "./ui";

export default function SealCard({ empresaId, totalKg, totalPesagens, selosEmitidos }) {
  const KG_POR_SELO = 1000;
  const kgNoProximo = totalKg % KG_POR_SELO;
  const progresso = Math.min((kgNoProximo / KG_POR_SELO) * 100, 100);
  const faltam = KG_POR_SELO - kgNoProximo;

  return (
    <div className="gt-card" style={{ overflow: "hidden", width: "100%", maxWidth: 420 }}>
      {/* Header — forest band */}
      <div style={{ background: "var(--color-gt-forest)", padding: "20px 24px", color: "#ffffff" }}>
        <p className="gt-micro" style={{ color: "var(--color-gt-leaf-soft)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Selo de Impacto Verde
        </p>
        <p className="gt-caption" style={{ color: "var(--color-gt-on-dark-mute)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {empresaId}
        </p>
      </div>

      {/* Métricas */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
          {[
            { value: totalKg, label: "kg reciclados", color: "var(--color-gt-forest)" },
            { value: totalPesagens, label: "pesagens", color: "var(--color-gt-ink)" },
            { value: selosEmitidos, label: "selos emitidos", color: "var(--color-gt-forest)" },
          ].map((m) => (
            <div key={m.label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.625rem", fontWeight: 560, color: m.color, letterSpacing: "-0.02em", lineHeight: 1 }}>
                <AnimatedCounter value={m.value} />
              </p>
              <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* Barra de progresso */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-gt-ink-mute)", marginBottom: 6 }}>
            <span>Progresso para o próximo selo</span>
            <span>{Math.round(progresso)}%</span>
          </div>
          <div style={{ width: "100%", background: "var(--color-gt-hairline)", borderRadius: 9999, height: 10, overflow: "hidden" }}>
            <div
              style={{
                background: "linear-gradient(90deg, var(--color-gt-forest), var(--color-gt-leaf-soft))",
                height: 10,
                borderRadius: 9999,
                width: `${progresso}%`,
                transition: "width 0.9s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          </div>
        </div>

        <p className="gt-caption" style={{ textAlign: "center", color: "var(--color-gt-ink-mute)", marginTop: 12 }}>
          {kgNoProximo === 0 && totalKg > 0 ? (
            <span style={{ color: "var(--color-gt-forest)", fontWeight: 600 }}>Novo selo disponível para emissão!</span>
          ) : (
            <>Faltam <strong style={{ color: "var(--color-gt-ink)" }}>{faltam} kg</strong> para o próximo Selo Verde</>
          )}
        </p>
      </div>
    </div>
  );
}
