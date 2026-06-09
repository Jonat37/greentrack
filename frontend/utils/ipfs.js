import axios from "axios";

export async function uploadArquivoIPFS(arquivo) {
  try {
    const formData = new FormData();
    formData.append("file", arquivo);

    const { data } = await axios.post("/api/ipfs/upload", formData);
    return data.cid;
  } catch (error) {
    throw new Error(`Erro ao fazer upload do arquivo para IPFS: ${error.message}`);
  }
}

export async function uploadJSONIPFS(objeto, nome) {
  try {
    const { data } = await axios.post("/api/ipfs/json", { objeto, nome });
    return data.cid;
  } catch (error) {
    throw new Error(`Erro ao fazer upload do JSON para IPFS: ${error.message}`);
  }
}

// Fase 1 — metadados da ENTRADA do lote (pesagem de recebimento)
export async function criarMetadataEntrada({
  cidFotoBalanca,
  material,
  pesoEntrada,
  empresaId,
  localColeta,
  dataColeta,
  timestamp,
}) {
  try {
    const metadata = {
      versao: "2.0",
      tipo: "lote_entrada",
      material,
      pesoEntrada,
      empresaId,
      localColeta,
      dataColeta,
      timestamp,
      evidencias: {
        foto_balanca: `ipfs://${cidFotoBalanca}`,
      },
    };
    return await uploadJSONIPFS(metadata, `lote_entrada_${Date.now()}`);
  } catch (error) {
    throw new Error(`Erro ao criar metadados da entrada: ${error.message}`);
  }
}

// Fase 2 — metadados do PROCESSAMENTO (balanço de massa + evidências de saída)
export async function criarMetadataProcesso({
  cidFotoSaida,
  cidFotoRejeito,
  pesoReciclado,
  pesoRejeito,
  pesoPerda,
  timestamp,
}) {
  try {
    const metadata = {
      versao: "2.0",
      tipo: "lote_processo",
      pesoReciclado,
      pesoRejeito,
      pesoPerda,
      timestamp,
      evidencias: {
        foto_saida: `ipfs://${cidFotoSaida}`,
        foto_rejeito: `ipfs://${cidFotoRejeito}`,
      },
    };
    return await uploadJSONIPFS(metadata, `lote_processo_${Date.now()}`);
  } catch (error) {
    throw new Error(`Erro ao criar metadados do processamento: ${error.message}`);
  }
}

export function getIPFSUrl(cid) {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
