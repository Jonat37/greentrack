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

export async function criarMetadataPesagem({
  cidFotoBalanca,
  cidFotoFardos,
  material,
  pesoKg,
  cooperativaId,
  empresaId,
  timestamp,
}) {
  try {
    const metadata = {
      versao: "1.0",
      tipo: "pesagem_reciclagem",
      material,
      pesoKg,
      cooperativaId,
      empresaId,
      timestamp,
      evidencias: {
        foto_balanca: `ipfs://${cidFotoBalanca}`,
        foto_fardos: `ipfs://${cidFotoFardos}`,
      },
    };

    return await uploadJSONIPFS(metadata, `pesagem_${Date.now()}`);
  } catch (error) {
    throw new Error(`Erro ao criar metadados da pesagem: ${error.message}`);
  }
}

export function getIPFSUrl(cid) {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
