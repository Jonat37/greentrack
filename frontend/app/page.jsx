"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLedgerReadOnly, getSealReadOnly } from "../utils/contract";
import { Logo, AnimatedCounter, Reveal, SectionLabel } from "../components/ui";

/* ── Metric card ─────────────────────────────────────────────────────────── */
function MetricCard({ value, label, unit }) {
  return (
    <div className="gt-card gt-card-hover" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 4 }}>
      <p
        style={{
          fontSize: "clamp(2rem, 4vw, 2.75rem)",
          fontWeight: 560,
          lineHeight: 1,
          color: "var(--color-gt-forest)",
          letterSpacing: "-0.03em",
        }}
      >
        <AnimatedCounter value={value} />
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
      className="gt-card-hover"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 24,
        background: "#ffffff",
        borderRadius: "var(--radius-gt-md)",
        border: "1px solid var(--color-gt-hairline)",
        transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s, border-color 0.2s",
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 9999,
          background: "var(--color-gt-forest)", color: "#ffffff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "0.9rem", flexShrink: 0,
        }}
      >
        {numero}
      </div>
      <div>
        <p className="gt-display-md" style={{ color: "var(--color-gt-ink)", marginBottom: 6 }}>{titulo}</p>
        <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>{descricao}</p>
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
        <nav style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="gt-fade-in"><Logo light /></div>
          <Link
            href="/login"
            className="gt-fade-in"
            style={{
              background: "var(--color-gt-canopy-mid)", color: "#ffffff",
              padding: "10px 18px", borderRadius: "var(--radius-gt-md)",
              fontWeight: 700, fontSize: "0.9rem", transition: "filter 0.15s, transform 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
          >
            Entrar na Plataforma
          </Link>
        </nav>

        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "80px 24px 100px", position: "relative", overflow: "hidden" }}>
          {/* Atmospheric backdrop */}
          <div aria-hidden style={{ position: "absolute", top: -80, right: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(159,223,186,0.13) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", bottom: -60, left: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(19,74,34,0.45) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ position: "relative", maxWidth: 640 }}>
            <p className="gt-micro gt-fade-up" style={{ color: "var(--color-gt-on-dark-mute)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
              Ethereum Sepolia · Web3 Impact
            </p>
            <h1 className="gt-display-xxl gt-fade-up" style={{ color: "#ffffff", marginBottom: 24, animationDelay: "0.06s" }}>
              Reciclagem com lastro real na blockchain
            </h1>
            <p className="gt-body-lg gt-fade-up" style={{ color: "var(--color-gt-on-dark-mute)", marginBottom: 40, maxWidth: 520, animationDelay: "0.12s" }}>
              Cada quilo triado vira um registro imutável e auditável.
              Pesagens validadas geram <strong style={{ color: "var(--color-gt-leaf-soft)" }}>NFTs Selo Verde</strong> — certificação de impacto verificável por QR Code.
            </p>
            <div className="gt-fade-up" style={{ display: "flex", gap: 12, flexWrap: "wrap", animationDelay: "0.18s" }}>
              <Link href="/login" className="btn-pill-hero">Entrar / Cadastrar</Link>
              <Link href="/dashboard" className="btn-outline-dark">Dashboard Público</Link>
            </div>
          </div>
        </section>
      </div>

      {/* ── Canvas 2: White body ───────────────────────────────────────────── */}
      <div style={{ background: "#ffffff", flex: 1 }}>

        {/* Metrics */}
        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "72px 24px" }}>
          <Reveal>
            <SectionLabel>Dados em tempo real</SectionLabel>
            <h2 className="gt-display-xl" style={{ color: "var(--color-gt-ink)", marginBottom: 40 }}>
              Impacto registrado na rede
            </h2>
          </Reveal>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[0, 1, 2].map((i) => <div key={i} className="gt-skeleton" style={{ height: 124, borderRadius: "var(--radius-gt-lg)" }} />)}
            </div>
          ) : (
            <div className="gt-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <MetricCard value={metricas.totalPesagens} label="Pesagens registradas" />
              <MetricCard value={metricas.totalKg} unit="kg" label="Total de kg validados" />
              <MetricCard value={metricas.totalSelos} label="Selos Verdes emitidos" />
            </div>
          )}
        </section>

        {/* Como funciona */}
        <section style={{ background: "var(--color-gt-canvas-soft)", padding: "72px 24px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Reveal>
              <SectionLabel>Fluxo</SectionLabel>
              <h2 className="gt-display-xl" style={{ color: "var(--color-gt-ink)", marginBottom: 40 }}>Como funciona</h2>
            </Reveal>
            <Reveal delay={80}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                <Passo numero="1" titulo="Cooperativa registra" descricao="A cooperativa cadastra-se e registra pesagens de materiais recicláveis com fotos do tíquete e dos fardos como evidência no IPFS." />
                <Passo numero="2" titulo="Auditor valida" descricao="Auditores aprovados pelo administrador verificam as evidências e validam cada pesagem diretamente na blockchain." />
                <Passo numero="3" titulo="Selo Verde emitido" descricao="A cada meta de kg validados, um NFT Selo Verde é emitido automaticamente. O certificado é verificável por QR Code, sem login." />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Diferenciais */}
        <section style={{ maxWidth: 1080, margin: "0 auto", padding: "72px 24px" }}>
          <Reveal>
            <h2 className="gt-display-xl" style={{ color: "var(--color-gt-ink)", marginBottom: 40 }}>Por que blockchain?</h2>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              {[
                { titulo: "Imutabilidade", desc: "Registros não podem ser editados ou apagados. O histórico é permanente na Ethereum Sepolia." },
                { titulo: "Separação de papéis", desc: "Quem pesa não valida. O conflito de interesse é bloqueado pelo próprio contrato." },
                { titulo: "Evidência ancorada", desc: "Fotos no IPFS com hash on-chain. Qualquer alteração na foto quebra a correspondência." },
                { titulo: "Verificação aberta", desc: "Qualquer pessoa audita pelo QR Code ou pelo Etherscan, sem login, sem intermediário." },
              ].map((d) => (
                <div
                  key={d.titulo}
                  className="gt-card-hover"
                  style={{ padding: 24, borderRadius: "var(--radius-gt-md)", background: "#ffffff", border: "1px solid var(--color-gt-hairline)", transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s, border-color 0.2s" }}
                >
                  <p className="gt-display-md" style={{ color: "var(--color-gt-ink)", marginBottom: 8 }}>{d.titulo}</p>
                  <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>{d.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      </div>

      {/* ── Canvas 3: Canopy CTA band ──────────────────────────────────────── */}
      <section style={{ background: "var(--color-gt-canopy)", padding: "80px 24px", textAlign: "center" }}>
        <Reveal>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <h2 className="gt-display-lg" style={{ color: "#ffffff", marginBottom: 12 }}>Faça parte da rede de impacto</h2>
            <p className="gt-body-lg" style={{ color: "var(--color-gt-on-dark-mute)", marginBottom: 32 }}>
              Cooperativas e auditores podem se cadastrar gratuitamente.
            </p>
            <Link href="/login" className="btn-on-canopy">Acessar Plataforma</Link>
          </div>
        </Reveal>
      </section>

      <footer style={{ background: "#ffffff", borderTop: "1px solid var(--color-gt-hairline)", padding: 24, textAlign: "center" }}>
        <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)" }}>
          GreenTrack · Certificação ambiental na blockchain Ethereum Sepolia
        </p>
      </footer>
    </div>
  );
}
