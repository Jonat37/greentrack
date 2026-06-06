"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "../../contexts/WalletContext";
import { getLedgerReadOnly } from "../../utils/contract";

function Logo({ light = false }) {
  return (
    <span
      className="flex items-center gap-2 select-none"
      style={{ fontWeight: 700, fontSize: "1.125rem", letterSpacing: "-0.02em" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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

const BADGE_STYLES = {
  admin:        { bg: "rgba(159,223,186,0.15)", color: "#0e2118", border: "1px solid rgba(159,223,186,0.4)" },
  auditor:      { bg: "rgba(14,33,24,0.06)",    color: "#0e2118", border: "1px solid var(--color-gt-hairline)" },
  cooperativa:  { bg: "rgba(14,33,24,0.06)",    color: "#0e2118", border: "1px solid var(--color-gt-hairline)" },
  pendente:     { bg: "rgba(180,130,0,0.08)",   color: "#7a5800", border: "1px solid rgba(180,130,0,0.2)" },
  rejeitado:    { bg: "rgba(180,30,30,0.07)",   color: "#8b1a1a", border: "1px solid rgba(180,30,30,0.2)" },
  bloqueado:    { bg: "rgba(180,30,30,0.07)",   color: "#8b1a1a", border: "1px solid rgba(180,30,30,0.2)" },
  sem_role:     { bg: "rgba(0,0,0,0.04)",       color: "var(--color-gt-ink-mute)", border: "1px solid var(--color-gt-hairline)" },
};

export default function LoginPage() {
  const { address, roles, loading, loaded, conectar } = useWallet();
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [statusExtra, setStatusExtra] = useState(null);

  useEffect(() => {
    if (!loaded || !address) return;
    if (roles.isAdmin)       { router.push("/admin");      return; }
    if (roles.isAuditor)     { router.push("/auditor");    return; }
    if (roles.isCooperativa) { router.push("/cooperativa"); return; }

    async function verificarPendente() {
      try {
        const ledger = getLedgerReadOnly();
        const auditor = await ledger.auditores(address);
        if (auditor.carteira !== "0x0000000000000000000000000000000000000000") {
          const s = Number(auditor.status);
          if (s === 0) setStatusExtra("auditor-pendente");
          else if (s === 2) setStatusExtra("auditor-rejeitado");
          else if (s === 3) setStatusExtra("auditor-bloqueado");
          return;
        }
        const coop = await ledger.cooperativas(address);
        if (coop.carteira !== "0x0000000000000000000000000000000000000000") {
          setStatusExtra("cooperativa-sem-role");
        }
      } catch {}
    }
    verificarPendente();
  }, [address, roles, loaded, router]);

  async function handleConectar() {
    setErro("");
    setStatusExtra(null);
    try { await conectar(); }
    catch (e) { setErro(e.message); }
  }

  const enderecoFormatado = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  function getBadge() {
    if (!address) return null;
    if (roles.isAdmin)       return { label: "Administrador",                style: BADGE_STYLES.admin };
    if (roles.isAuditor)     return { label: "Auditor aprovado",             style: BADGE_STYLES.auditor };
    if (roles.isCooperativa) return { label: "Cooperativa ativa",            style: BADGE_STYLES.cooperativa };
    if (statusExtra === "auditor-pendente")   return { label: "Aguardando aprovação do administrador", style: BADGE_STYLES.pendente };
    if (statusExtra === "auditor-rejeitado")  return { label: "Solicitação rejeitada",                  style: BADGE_STYLES.rejeitado };
    if (statusExtra === "auditor-bloqueado")  return { label: "Acesso bloqueado",                       style: BADGE_STYLES.bloqueado };
    if (statusExtra === "cooperativa-sem-role") return { label: "Cooperativa cadastrada — contate o administrador", style: BADGE_STYLES.pendente };
    return { label: "Sem permissão cadastrada", style: BADGE_STYLES.sem_role };
  }

  const badge = getBadge();
  const temRole = roles.isAdmin || roles.isAuditor || roles.isCooperativa;
  const semCadastro = address && !temRole && !statusExtra;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>

      {/* Nav */}
      <nav style={{ background: "var(--color-gt-forest)", padding: "16px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/"><Logo light /></Link>
          <Link
            href="/dashboard"
            className="gt-caption"
            style={{ color: "var(--color-gt-on-dark-mute)", transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--color-gt-on-dark-mute)"}
          >
            Dashboard público
          </Link>
        </div>
      </nav>

      {/* Card */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
        <div
          style={{
            background: "#ffffff",
            borderRadius: "var(--radius-gt-xl)",
            border: "1px solid var(--color-gt-hairline)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            padding: "48px 40px",
            width: "100%",
            maxWidth: 440,
          }}
        >
          {/* Logo in card */}
          <div style={{ marginBottom: 24 }}>
            <Logo />
          </div>

          <h1 className="gt-display-lg" style={{ color: "var(--color-gt-ink)", marginBottom: 8 }}>
            Entrar na plataforma
          </h1>
          <p className="gt-body-md" style={{ color: "var(--color-gt-ink-mute)", marginBottom: 32 }}>
            Conecte sua carteira MetaMask para acessar ou cadastrar-se.
          </p>

          {erro && (
            <div
              style={{
                marginBottom: 20,
                background: "rgba(180,30,30,0.07)",
                border: "1px solid rgba(180,30,30,0.2)",
                borderRadius: "var(--radius-gt-sm)",
                padding: "12px 14px",
                color: "#8b1a1a",
                fontSize: "0.875rem",
              }}
            >
              {erro}
            </div>
          )}

          {!address ? (
            <button
              onClick={handleConectar}
              disabled={loading}
              className="btn-forest"
              style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Conectando..." : "Conectar MetaMask"}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Endereço */}
              <div
                style={{
                  background: "var(--color-gt-canvas-soft)",
                  borderRadius: "var(--radius-gt-sm)",
                  border: "1px solid var(--color-gt-hairline)",
                  padding: "12px 14px",
                }}
              >
                <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Carteira conectada
                </p>
                <p style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-gt-ink)", letterSpacing: "0.03em" }}>
                  {enderecoFormatado}
                </p>
              </div>

              {/* Badge de role */}
              {badge && (
                <div
                  style={{
                    borderRadius: "var(--radius-gt-sm)",
                    padding: "10px 14px",
                    textAlign: "center",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    ...badge.style,
                  }}
                >
                  {badge.label}
                </div>
              )}

              {statusExtra === "auditor-pendente" && (
                <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", textAlign: "center" }}>
                  Sua solicitação foi enviada. Um administrador precisa aprovar sua carteira antes de você acessar o painel.
                </p>
              )}

              {temRole && (
                <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)", textAlign: "center" }}>
                  Redirecionando...
                </p>
              )}
            </div>
          )}

          {/* Cadastro */}
          {(!address || semCadastro) && (
            <div
              style={{
                marginTop: 32,
                paddingTop: 24,
                borderTop: "1px solid var(--color-gt-hairline)",
              }}
            >
              <p
                className="gt-micro"
                style={{
                  color: "var(--color-gt-ink-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                Novo por aqui?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link
                  href="/cadastro/cooperativa"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "11px 16px",
                    borderRadius: "var(--radius-gt-md)",
                    border: "1.5px solid var(--color-gt-forest)",
                    color: "var(--color-gt-forest)",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--color-gt-canvas-soft)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Cadastrar Cooperativa
                </Link>
                <Link
                  href="/cadastro/auditor"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "11px 16px",
                    borderRadius: "var(--radius-gt-md)",
                    border: "1.5px solid var(--color-gt-hairline)",
                    color: "var(--color-gt-ink-mute)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-gt-forest)"; e.currentTarget.style.color = "var(--color-gt-forest)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-gt-hairline)"; e.currentTarget.style.color = "var(--color-gt-ink-mute)"; }}
                >
                  Solicitar acesso como Auditor
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
