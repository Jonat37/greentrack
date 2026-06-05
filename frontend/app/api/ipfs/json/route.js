import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const { objeto, nome } = await request.json();

    if (!objeto) {
      return NextResponse.json({ error: "Objeto não fornecido" }, { status: 400 });
    }

    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: "PINATA_JWT não configurado no ambiente" },
        { status: 500 }
      );
    }

    const { data } = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        pinataContent: objeto,
        pinataMetadata: { name: nome || `json_${Date.now()}` },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
      }
    );

    return NextResponse.json({ cid: data.IpfsHash });
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error("Erro upload JSON IPFS:", detail);
    return NextResponse.json(
      { error: `Erro ao fazer upload do JSON: ${JSON.stringify(detail)}` },
      { status: 500 }
    );
  }
}
