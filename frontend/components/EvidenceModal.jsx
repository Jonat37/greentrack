"use client";

import { useEffect, useState } from "react";
import { getIPFSUrl } from "../utils/ipfs";

/* Converte ipfs://CID (ou CID puro) em URL de gateway */
function ipfsToGateway(uri) {
  if (!uri) return null;
  const cid = uri.replace(/^ipfs:\/\//, "");
  return getIPFSUrl(cid);
}

async function fetchMeta(cid) {
  if (!cid) return null;
  try {
    const res = await fetch(getIPFSUrl(cid));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ── Gatilho clicável que abre o modal de evidências do lote ─────────────── */
export function EvidenceLink({ cidEntrada, cidProcesso, children, style, className }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        style={{ background: "none", cursor: "pointer", ...style }}
      >
        {children}
      </button>
      {open && <EvidenceModal cidEntrada={cidEntrada} cidProcesso={cidProcesso} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ── Modal: busca os JSONs das duas fases e mostra fotos + balanço ───────── */
export default function EvidenceModal({ cidEntrada, cidProcesso, onClose }) {
  const [estado, setEstado] = useState("loading"); // loading | ok | erro
  const [entrada, setEntrada] = useState(null);
  const [processo, setProcesso] = useState(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [me, mp] = await Promise.all([fetchMeta(cidEntrada), fetchMeta(cidProcesso)]);
      if (!ativo) return;
      setEntrada(me);
      setProcesso(mp);
      setEstado(me || mp ? "ok" : "erro");
    })();
    return () => { ativo = false; };
  }, [cidEntrada, cidProcesso]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fotoBalanca = ipfsToGateway(entrada?.evidencias?.foto_balanca);
  const fotoSaida = ipfsToGateway(processo?.evidencias?.foto_saida);
  const fotoRejeito = ipfsToGateway(processo?.evidencias?.foto_rejeito);

  const reciclado = processo?.pesoReciclado;
  const rejeito = processo?.pesoRejeito;
  const perda = processo?.pesoPerda;
  const entradaKg = entrada?.pesoEntrada;
  const taxa = entradaKg && reciclado != null ? ((reciclado / entradaKg) * 100).toFixed(1) : null;

  return (
    <div
      className="gt-fade-in"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(7,20,13,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16, overflowY: "auto" }}
    >
      <div
        className="gt-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#ffffff", borderRadius: "var(--radius-gt-xl)", padding: 28, width: "100%", maxWidth: 760, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 className="gt-display-md" style={{ color: "var(--color-gt-ink)" }}>Evidências do lote</h3>
            {entrada && (
              <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>
                {entrada.material}{entradaKg != null ? ` · entrada ${entradaKg} kg` : ""}{entrada.empresaId ? ` · ${entrada.empresaId}` : ""}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ fontSize: "1.5rem", lineHeight: 1, color: "var(--color-gt-ink-mute)", cursor: "pointer" }} aria-label="Fechar">×</button>
        </div>

        {estado === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 16 }}>
            <div className="gt-spinner" />
            <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)" }}>Carregando evidências do IPFS...</p>
          </div>
        )}

        {estado === "erro" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p className="gt-body-md" style={{ color: "var(--color-gt-ink)", marginBottom: 8 }}>Não foi possível carregar as evidências.</p>
            {cidEntrada && <a href={getIPFSUrl(cidEntrada)} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ fontSize: "0.875rem" }}>Abrir metadados de entrada ↗</a>}
          </div>
        )}

        {estado === "ok" && (
          <>
            {/* Balanço de massa */}
            {reciclado != null && (
              <div style={{ background: "var(--color-gt-canvas-soft)", border: "1px solid var(--color-gt-hairline)", borderRadius: "var(--radius-gt-md)", padding: 16, marginBottom: 20 }}>
                <p className="gt-micro" style={{ fontWeight: 700, color: "var(--color-gt-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Balanço de massa{taxa ? ` · taxa de reciclagem ${taxa}%` : ""}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  <Balanco label="Entrada" valor={entradaKg} cor="var(--color-gt-ink)" />
                  <Balanco label="Reciclado" valor={reciclado} cor="var(--color-gt-forest)" />
                  <Balanco label="Rejeito" valor={rejeito} cor="var(--color-gt-ink-mute)" />
                  <Balanco label="Perda" valor={perda} cor="var(--color-gt-ink-mute)" />
                </div>
              </div>
            )}

            {/* Fotos */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <Foto titulo="Entrada — tíquete da balança" url={fotoBalanca} />
              <Foto titulo="Processo — saída reciclada" url={fotoSaida} />
              <Foto titulo="Processo — rejeito" url={fotoRejeito} />
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--color-gt-hairline)", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
              <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)" }}>
                Imagens ancoradas no IPFS — o hash on-chain garante a integridade.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                {cidEntrada && <a href={getIPFSUrl(cidEntrada)} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ fontSize: "0.75rem" }}>JSON entrada ↗</a>}
                {cidProcesso && <a href={getIPFSUrl(cidProcesso)} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ fontSize: "0.75rem" }}>JSON processo ↗</a>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Balanco({ label, valor, cor }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: "1.125rem", fontWeight: 560, color: cor, lineHeight: 1 }}>{valor != null ? valor : "—"}<span style={{ fontSize: "0.6875rem", fontWeight: 480, color: "var(--color-gt-ink-faint)", marginLeft: 2 }}>kg</span></p>
      <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 2 }}>{label}</p>
    </div>
  );
}

function Foto({ titulo, url }) {
  const [erro, setErro] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p className="gt-micro" style={{ fontWeight: 700, color: "var(--color-gt-ink-mute)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{titulo}</p>
      {!url || erro ? (
        <div style={{ aspectRatio: "4/3", background: "var(--color-gt-canvas-soft)", border: "1px solid var(--color-gt-hairline)", borderRadius: "var(--radius-gt-md)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="gt-caption" style={{ color: "var(--color-gt-ink-faint)" }}>Sem imagem</span>
        </div>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={titulo}
            onError={() => setErro(true)}
            style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: "var(--radius-gt-md)", border: "1px solid var(--color-gt-hairline)", display: "block" }}
          />
        </a>
      )}
    </div>
  );
}
