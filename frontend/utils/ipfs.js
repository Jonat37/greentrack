import axios from "axios";

const PINATA_BASE = "https://api.pinata.cloud";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
  };
}

/**
 * Faz upload de um arquivo para o IPFS via Pinata
 * @param {File} arquivo - Arquivo a ser enviado
 * @returns {Promise<string>} CID do arquivo no IPFS
 */
export async function uploadArquivoIPFS(arquivo) {
  try {
    const form = new FormData();
    form.append("file", arquivo);

    const { data } = await axios.post(`${PINATA_BASE}/pinning/pinFileToIPFS`, form, {
      headers: {
        ...getHeaders(),
        "Content-Type": "multipart/form-data",
      },
    });

    return data.IpfsHash;
  } catch (error) {
    throw new Error(`Erro ao fazer upload do arquivo para IPFS: ${error.message}`);
  }
}

/**
 * Faz upload de um objeto JSON para o IPFS via Pinata
 * @param {Object} objeto - Objeto a ser serializado e enviado
 * @param {string} nome - Nome para identificar o pin no Pinata
 * @returns {Promise<string>} CID do JSON no IPFS
 */
export async function uploadJSONIPFS(objeto, nome) {
  try {
    const { data } = await axios.post(
      `${PINATA_BASE}/pinning/pinJSONToIPFS`,
      {
        pinataContent: objeto,
        pinataMetadata: { name: nome },
      },
      { headers: getHeaders() }
    );

    return data.IpfsHash;
  } catch (error) {
    throw new Error(`Erro ao fazer upload do JSON para IPFS: ${error.message}`);
  }
}

/**
 * Cria e faz upload dos metadados de uma pesagem para o IPFS
 * @param {Object} params
 * @param {string} params.cidFotoBalanca - CID da foto da balança
 * @param {string} params.cidFotoFardos - CID da foto dos fardos
 * @param {string} params.material - Tipo de material
 * @param {number} params.pesoKg - Peso em kg
 * @param {string} params.cooperativaId - Endereço da cooperativa
 * @param {string} params.empresaId - ID da empresa
 * @param {string} params.timestamp - Timestamp ISO da pesagem
 * @returns {Promise<string>} CID do JSON de metadados
 */
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

/**
 * Retorna a URL pública do gateway Pinata para um CID
 * @param {string} cid - CID do conteúdo no IPFS
 * @returns {string} URL acessível via HTTP
 */
export function getIPFSUrl(cid) {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
