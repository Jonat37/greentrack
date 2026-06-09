"use client";

import { useEffect, useState } from "react";
import { getIPFSUrl } from "../utils/ipfs";

/* Converte ipfs://CID (ou CID puro) em URL de gateway */
function ipfsToGateway(uri) {
  if (!uri) return null;
  const cid = uri.replace(/^ipfs:\/\//, "");
  return getIPFSUrl(cid);
}

/* ── Gatilho clicável que abre o modal de evidências ─────────────────────── */
export function EvidenceLink({ cid, children, style, className }) {
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
      {open && <EvidenceModal cid={cid} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ── Modal que busca o JSON de metadados e mostra as fotos ────────────────── */
export default function EvidenceModal({ cid, onClose }) {
  const [estado, setEstado] = useState("loading"); // loading | ok | erro
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const res = await fetch(getIPFSUrl(cid));
        if (!res.ok) throw new Error("Falha ao buscar metadados");
        const json = await res.json();
        if (!ativo) return;
        setMeta(json);
        setEstado("ok");
      } catch {
        if (ativo) setEstado("erro");
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [cid]);

  // Fecha com ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const balanca = ipfsToGateway(meta?.evidencias?.foto_balanca);
  const fardos = ipfsToGateway(meta?.evidencias?.foto_fardos);

  return (
    <div
      className="gt-fade-in"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(7,20,13,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16, overflowY: "auto" }}
    >
      <div
        className="gt-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#ffffff", borderRadius: "var(--radius-gt-xl)", padding: 28, width: "100%", maxWidth: 720, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 className="gt-display-md" style={{ color: "var(--color-gt-ink)" }}>Evidências da pesagem</h3>
            {meta && (
              <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>
                {meta.material} · {meta.pesoKg} kg{meta.empresaId ? ` · ${meta.empresaId}` : ""}
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
            <a href={getIPFSUrl(cid)} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ fontSize: "0.875rem" }}>
              Abrir metadados no IPFS ↗
            </a>
          </div>
        )}

        {estado === "ok" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <Foto titulo="Tíquete da balança" url={balanca} />
              <Foto titulo="Fardos / material" url={fardos} />
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--color-gt-hairline)", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center" }}>
              <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)" }}>
                Imagens ancoradas no IPFS — o hash on-chain garante a integridade.
              </p>
              <a href={getIPFSUrl(cid)} target="_blank" rel="noopener noreferrer" className="gt-link" style={{ fontSize: "0.75rem" }}>
                Ver metadados (JSON) ↗
              </a>
            </div>
          </>
        )}
      </div>
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
          <span className="gt-caption" style={{ color: "var(--color-gt-ink-faint)" }}>Imagem indisponível</span>
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
