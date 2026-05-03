import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { mpPreapprovalId } = await req.json();

    if (!mpPreapprovalId) {
      return NextResponse.json({ error: "ID faltante" }, { status: 400 });
    }

    const preapproval = new PreApproval(mp);

    await preapproval.update({
      id: mpPreapprovalId,
      body: {
        status: "cancelled",
      },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Cancel error:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}