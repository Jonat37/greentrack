"use client";

export default function SealCard({ empresaId, totalKg, totalPesagens, selosEmitidos }) {
  const KG_POR_SELO = 1000;
  const kgNoProximo = totalKg % KG_POR_SELO;
  const progresso = Math.min((kgNoProximo / KG_POR_SELO) * 100, 100);
  const faltam = KG_POR_SELO - kgNoProximo;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-full max-w-md">
      {/* Header com gradiente verde */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🏅</span>
          <span className="text-sm font-semibold uppercase tracking-wider opacity-90">
            Selo de Impacto Verde
          </span>
        </div>
        <p className="text-xs opacity-75 truncate">{empresaId}</p>
      </div>

      {/* Métricas */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-green-700">{totalKg.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">kg reciclados</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-gray-700">{totalPesagens}</p>
            <p className="text-xs text-gray-500 mt-0.5">pesagens</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-emerald-600">{selosEmitidos}</p>
            <p className="text-xs text-gray-500 mt-0.5">selos emitidos</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progresso para o próximo selo</span>
            <span>{Math.round(progresso)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-3">
          {kgNoProximo === 0 && totalKg > 0 ? (
            <span className="text-green-600 font-semibold">Novo selo disponível para emissão!</span>
          ) : (
            <>
              Faltam <strong>{faltam} kg</strong> para o próximo Selo Verde
            </>
          )}
        </p>
      </div>
    </div>
  );
}
