import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const { objeto, nome } = await request.json();

    if (!objeto) {
      return NextResponse.json({ error: "Objeto não fornecido" }, { status: 400 });
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
    return NextResponse.json(
      { error: `Erro ao fazer upload do JSON: ${error.message}` },
      { status: 500 }
    );
  }
}
