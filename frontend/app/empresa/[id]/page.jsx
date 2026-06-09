"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SealCard from "../../../components/SealCard";
import QRDisplay from "../../../components/QRDisplay";
import { getLedgerReadOnly, getSealReadOnly } from "../../../utils/contract";
import { TopNav, Reveal, Loader, Notice } from "../../../components/ui";

export default function EmpresaPage() {
  const { id: empresaId } = useParams();

  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!empresaId) return;

    async function carregar() {
      try {
        const ledger = getLedgerReadOnly();
        const seal = getSealReadOnly();

        const idsValidados = await ledger.getPesagensPorEmpresa(empresaId);
        const totalKg = Number(await ledger.kgPorEmpresa(empresaId));
        const selosEmitidos = Number(await seal.totalSelosPorEmpresa(empresaId));
        const totalPesagens = idsValidados.length;

        // Carregar detalhes das pesagens validadas
        const pesagens = await Promise.all(
          idsValidados.map(async (id) => {
            const p = await ledger.pesagens(Number(id));
            return {
              id: Number(p.id),
              material: p.material,
              pesoKg: Number(p.pesoKg),
              timestamp: Number(p.timestamp),
            };
          })
        );

        setDados({ totalKg, selosEmitidos, totalPesagens, pesagens });
      } catch (e) {
        setErro("Erro ao carregar dados: " + e.message);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [empresaId]);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-gt-canvas-soft)" }}>
      <TopNav
        maxWidth={1080}
        right={<span className="gt-caption" style={{ color: "var(--color-gt-on-dark-mute)" }}>Certificado de Impacto</span>}
      />

      <main style={{ flex: 1, maxWidth: 1080, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        <Reveal style={{ marginBottom: 32 }}>
          <h1 className="gt-display-xl" style={{ color: "var(--color-gt-ink)" }}>Impacto Ambiental</h1>
          <p className="gt-caption" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4, fontFamily: "monospace", wordBreak: "break-all" }}>{empresaId}</p>
        </Reveal>

        {erro && <div style={{ marginBottom: 24 }}><Notice tone="error">{erro}</Notice></div>}

        {loading ? (
          <Loader />
        ) : dados ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
            <Reveal style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <SealCard empresaId={empresaId} totalKg={dados.totalKg} totalPesagens={dados.totalPesagens} selosEmitidos={dados.selosEmitidos} />
              <QRDisplay empresaId={empresaId} />
            </Reveal>

            <Reveal delay={120} className="gt-card" style={{ flex: 1, minWidth: 280, padding: 24 }}>
              <h2 className="gt-display-md" style={{ color: "var(--color-gt-ink)", marginBottom: 16 }}>
                Pesagens Validadas ({dados.pesagens.length})
              </h2>
              {dados.pesagens.length === 0 ? (
                <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)" }}>Nenhuma pesagem validada ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {dados.pesagens.map((p) => (
                    <div key={p.id} className="gt-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-gt-hairline)", padding: "10px 0" }}>
                      <div>
                        <span className="gt-body-md" style={{ fontWeight: 600, color: "var(--color-gt-ink)" }}>#{p.id} — {p.material}</span>
                        <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)" }}>{new Date(p.timestamp * 1000).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <span style={{ color: "var(--color-gt-forest)", fontWeight: 700, fontSize: "0.875rem" }}>{p.pesoKg} kg</span>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>
          </div>
        ) : (
          <Notice tone="pending">Empresa não encontrada ou sem dados registrados.</Notice>
        )}
      </main>

      <footer style={{ background: "var(--color-gt-canopy)", padding: "24px", textAlign: "center" }}>
        <p className="gt-caption" style={{ color: "var(--color-gt-on-dark-mute)" }}>
          GreenTrack · Verificação pública e imutável na blockchain
        </p>
      </footer>
    </div>
  );
}
