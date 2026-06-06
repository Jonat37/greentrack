"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLedgerReadOnly, getSealReadOnly } from "../utils/contract";

/* ── Logo wordmark ────────────────────────────────────────────────────────── */
function Logo({ light = false }) {
  return (
    <span
      className="flex items-center gap-2 select-none"
      style={{ fontWeight: 700, fontSize: "1.125rem", letterSpacing: "-0.02em" }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2C7.5 2 4 6 4 10.5c0 4 2.5 7 6 8.5V22h4v-3c3.5-1.5 6-4.5 6-8.5C20 6 16.5 2 12 2z"
          fill={light ? "#9fdfba" : "var(--color-gt-forest)"}
        />
        <path
          d="M12 8c0 0-3 2-3 5h6c0-3-3-5-3-5z"
          fill={light ? "var(--color-gt-forest)" : "#9fdfba"}
        />
      </svg>
      <span style={{ color: light ? "#ffffff" : "var(--color-gt-forest)" }}>
        GreenTrack
      </span>
    </span>
  );
}

/* ── Metric card ─────────────────────────────────────────────────────────── */
function MetricCard({ value, label, unit }) {
  return (
    <div
      className="flex flex-col gap-1 p-8"
      style={{
        background: "#ffffff",
        borderRadius: "var(--radius-gt-lg)",
        border: "1px solid var(--color-gt-hairline)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <p
        style={{
          fontSize: "clamp(2rem, 4vw, 2.75rem)",
          fontWeight: 560,
          lineHeight: 1,
          color: "var(--color-gt-forest)",
          letterSpacing: "-0.03em",
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: "1rem", fontWeight: 480, marginLeft: 4, color: "var(--color-gt-ink-mute)" }}>
            {unit}
          </span>
        )}
      </p>
      <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>
        {label}
      </p>
    </div>
  );
}

/* ── Step card ───────────────────────────────────────────────────────────── */
function Passo({ numero, titulo, descricao }) {
  return (
    <div
      className="flex flex-col gap-4 p-6"
      style={{
        background: "var(--color-gt-canvas-soft)",
        borderRadius: "var(--radius-gt-md)",
        border: "1px solid var(--color-gt-hairline)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9999,
          background: "var(--color-gt-forest)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "0.9rem",
          flexShrink: 0,
        }}
      >
        {numero}
      </div>
      <div>
        <p className="gt-display-md" style={{ color: "var(--color-gt-ink)", marginBottom: 6 }}>
          {titulo}
        </p>
        <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>
          {descricao}
        </p>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Home() {
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarMetricas() {
      try {
        const ledger = getLedgerReadOnly();
        const seal = getSealReadOnly();
        const [totalPesagens, totalKg, nextTokenId] = await Promise.all([
          ledger.totalPesagens(),
          ledger.totalKgValidadoGlobal(),
          seal.nextTokenId(),
        ]);
        setMetricas({
          totalPesagens: Number(totalPesagens),
          totalKg: Number(totalKg),
          totalSelos: Number(nextTokenId),
        });
      } catch {
        setMetricas({ totalPesagens: 0, totalKg: 0, totalSelos: 0 });
      } finally {
        setLoading(false);
      }
    }
    carregarMetricas();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Canvas 1: Forest dark hero ─────────────────────────────────────── */}
      <div style={{ background: "var(--color-gt-forest)" }}>

        {/* Nav */}
        <nav
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Logo light />
          <Link href="/login" className="btn-forest" style={{ background: "var(--color-gt-canopy-mid)", color: "#ffffff", borderRadius: "var(--radius-gt-md)" }}>
            Entrar na Plataforma
          </Link>
        </nav>

        {/* Hero */}
        <section
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "80px 24px 100px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Atmospheric backdrop — radial mint-green wash */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -80,
              right: -120,
              width: 520,
              height: 520,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(159,223,186,0.13) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: -60,
              left: -80,
              width: 360,
              height: 360,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(19,74,34,0.45) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", maxWidth: 640 }}>
            <p
              className="gt-micro"
              style={{
                color: "var(--color-gt-on-dark-mute)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 20,
              }}
            >
              Ethereum Sepolia · Web3 Impact
            </p>

            <h1
              className="gt-display-xxl"
              style={{ color: "#ffffff", marginBottom: 24 }}
            >
              Reciclagem com lastro real na blockchain
            </h1>

            <p
              className="gt-body-lg"
              style={{ color: "var(--color-gt-on-dark-mute)", marginBottom: 40, maxWidth: 520 }}
            >
              Cada quilo triado vira um registro imutável e auditável.
              Pesagens validadas geram <strong style={{ color: "var(--color-gt-leaf-soft)" }}>NFTs Selo Verde</strong> — certificação de impacto verificável por QR Code.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/login" className="btn-pill-hero">
                Entrar / Cadastrar
              </Link>
              <Link href="/dashboard" className="btn-outline-dark">
                Dashboard Público
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ── Canvas 2: White body ───────────────────────────────────────────── */}
      <div style={{ background: "#ffffff", flex: 1 }}>

        {/* Metrics */}
        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "72px 24px" }}>
          <p
            className="gt-micro"
            style={{
              color: "var(--color-gt-ink-mute)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Dados em tempo real
          </p>
          <h2
            className="gt-display-xl"
            style={{ color: "var(--color-gt-ink)", marginBottom: 40 }}
          >
            Impacto registrado na rede
          </h2>

          {loading ? (
            <p className="gt-body-md" style={{ color: "var(--color-gt-ink-faint)" }}>
              Carregando dados da blockchain...
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <MetricCard
                value={metricas.totalPesagens.toLocaleString("pt-BR")}
                label="Pesagens registradas"
              />
              <MetricCard
                value={metricas.totalKg.toLocaleString("pt-BR")}
                unit="kg"
                label="Total de kg validados"
              />
              <MetricCard
                value={metricas.totalSelos.toLocaleString("pt-BR")}
                label="Selos Verdes emitidos"
              />
            </div>
          )}
        </section>

        {/* Como funciona */}
        <section style={{ background: "var(--color-gt-canvas-soft)", padding: "72px 24px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <p
              className="gt-micro"
              style={{
                color: "var(--color-gt-ink-mute)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Fluxo
            </p>
            <h2
              className="gt-display-xl"
              style={{ color: "var(--color-gt-ink)", marginBottom: 40 }}
            >
              Como funciona
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              <Passo
                numero="1"
                titulo="Cooperativa registra"
                descricao="A cooperativa cadastra-se e registra pesagens de materiais recicláveis com fotos do tíquete e dos fardos como evidência no IPFS."
              />
              <Passo
                numero="2"
                titulo="Auditor valida"
                descricao="Auditores aprovados pelo administrador verificam as evidências e validam cada pesagem diretamente na blockchain."
              />
              <Passo
                numero="3"
                titulo="Selo Verde emitido"
                descricao="A cada meta de kg validados, um NFT Selo Verde é emitido automaticamente. O certificado é verificável por QR Code, sem login."
              />
            </div>
          </div>
        </section>

        {/* Diferenciais */}
        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "72px 24px" }}>
          <h2
            className="gt-display-xl"
            style={{ color: "var(--color-gt-ink)", marginBottom: 40 }}
          >
            Por que blockchain?
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {[
              { titulo: "Imutabilidade", desc: "Registros não podem ser editados ou apagados. O histórico é permanente na Ethereum Sepolia." },
              { titulo: "Separação de papéis", desc: "Quem pesa não valida. O conflito de interesse é bloqueado pelo próprio contrato." },
              { titulo: "Evidência ancorada", desc: "Fotos no IPFS com hash on-chain. Qualquer alteração na foto quebra a correspondência." },
              { titulo: "Verificação aberta", desc: "Qualquer pessoa audita pelo QR Code ou pelo Etherscan, sem login, sem intermediário." },
            ].map((d) => (
              <div
                key={d.titulo}
                style={{
                  padding: "24px",
                  borderRadius: "var(--radius-gt-md)",
                  background: "#ffffff",
                  border: "1px solid var(--color-gt-hairline)",
                }}
              >
                <p className="gt-display-md" style={{ color: "var(--color-gt-ink)", marginBottom: 8 }}>
                  {d.titulo}
                </p>
                <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>
                  {d.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Canvas 3: Canopy CTA band ──────────────────────────────────────── */}
      <section
        style={{
          background: "var(--color-gt-canopy)",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2
            className="gt-display-lg"
            style={{ color: "#ffffff", marginBottom: 12 }}
          >
            Faça parte da rede de impacto
          </h2>
          <p
            className="gt-body-lg"
            style={{ color: "var(--color-gt-on-dark-mute)", marginBottom: 32 }}
          >
            Cooperativas e auditores podem se cadastrar gratuitamente.
          </p>
          <Link href="/login" className="btn-on-canopy">
            Acessar Plataforma
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "#ffffff",
          borderTop: "1px solid var(--color-gt-hairline)",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>
          GreenTrack · Certificação ambiental na blockchain Ethereum Sepolia
        </p>
      </footer>
    </div>
  );
}
