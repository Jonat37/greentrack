import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 });
    }

    if (!process.env.PINATA_JWT) {
      return NextResponse.json(
        { error: "PINATA_JWT não configurado no ambiente" },
        { status: 500 }
      );
    }

    const pinataForm = new FormData();
    pinataForm.append("file", file);

    const { data } = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      pinataForm,
      {
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return NextResponse.json({ cid: data.IpfsHash });
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error("Erro upload IPFS:", detail);
    return NextResponse.json(
      { error: `Erro ao fazer upload: ${JSON.stringify(detail)}` },
      { status: 500 }
    );
  }
}
