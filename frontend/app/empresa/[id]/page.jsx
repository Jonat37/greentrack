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

        const idsValidados = await ledger.getLotesPorEmpresa(empresaId);
        const reciclado = Number(await ledger.recicladoPorEmpresa(empresaId));
        const entrada = Number(await ledger.entradaPorEmpresa(empresaId));
        const selosEmitidos = Number(await seal.totalSelosPorEmpresa(empresaId));
        const totalLotes = idsValidados.length;

        // Carregar detalhes dos lotes validados
        const lotes = await Promise.all(
          idsValidados.map(async (id) => {
            const l = await ledger.lotes(Number(id));
            return {
              id: Number(l.id),
              material: l.material,
              pesoReciclado: Number(l.pesoReciclado),
              pesoEntrada: Number(l.pesoEntrada),
              timestamp: Number(l.processadoEm || l.recebidoEm),
            };
          })
        );

        const taxa = entrada > 0 ? (reciclado / entrada) * 100 : 0;
        setDados({ reciclado, entrada, taxa, selosEmitidos, totalLotes, lotes });
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
              <SealCard empresaId={empresaId} totalKg={dados.reciclado} totalPesagens={dados.totalLotes} selosEmitidos={dados.selosEmitidos} />
              <QRDisplay empresaId={empresaId} />
            </Reveal>

            <Reveal delay={120} style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Balanço de massa agregado */}
              <div className="gt-card" style={{ padding: 24 }}>
                <h2 className="gt-display-md" style={{ color: "var(--color-gt-ink)", marginBottom: 16 }}>Balanço de massa certificado</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  <BalBox label="Entrada" valor={dados.entrada} cor="var(--color-gt-ink)" />
                  <BalBox label="Reciclado" valor={dados.reciclado} cor="var(--color-gt-forest)" />
                  <BalBox label="Taxa" valor={`${dados.taxa.toFixed(1)}%`} cor="var(--color-gt-forest)" raw />
                </div>
              </div>

              {/* Lotes validados */}
              <div className="gt-card" style={{ padding: 24 }}>
                <h2 className="gt-display-md" style={{ color: "var(--color-gt-ink)", marginBottom: 16 }}>
                  Lotes Validados ({dados.lotes.length})
                </h2>
                {dados.lotes.length === 0 ? (
                  <p className="gt-caption" style={{ color: "var(--color-gt-ink-faint)" }}>Nenhum lote validado ainda.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {dados.lotes.map((l) => (
                      <div key={l.id} className="gt-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-gt-hairline)", padding: "10px 0" }}>
                        <div>
                          <span className="gt-body-md" style={{ fontWeight: 600, color: "var(--color-gt-ink)" }}>#{l.id} — {l.material}</span>
                          <p className="gt-micro" style={{ color: "var(--color-gt-ink-faint)" }}>{new Date(l.timestamp * 1000).toLocaleDateString("pt-BR")} · entrada {l.pesoEntrada} kg</p>
                        </div>
                        <span style={{ color: "var(--color-gt-forest)", fontWeight: 700, fontSize: "0.875rem" }}>{l.pesoReciclado} kg</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

function BalBox({ label, valor, cor, raw }) {
  return (
    <div style={{ background: "var(--color-gt-canvas-soft)", borderRadius: "var(--radius-gt-md)", padding: 14, textAlign: "center" }}>
      <p style={{ fontSize: "1.375rem", fontWeight: 560, color: cor, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {raw ? valor : <>{valor.toLocaleString("pt-BR")}<span style={{ fontSize: "0.6875rem", color: "var(--color-gt-ink-faint)", marginLeft: 2 }}>kg</span></>}
      </p>
      <p className="gt-micro" style={{ color: "var(--color-gt-ink-mute)", marginTop: 4 }}>{label}</p>
    </div>
  );
}
