import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 });
    }

    const pinataForm = new FormData();
    pinataForm.append("file", file);

    const { data } = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      pinataForm,
      {
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return NextResponse.json({ cid: data.IpfsHash });
  } catch (error) {
    return NextResponse.json(
      { error: `Erro ao fazer upload: ${error.message}` },
      { status: 500 }
    );
  }
}
