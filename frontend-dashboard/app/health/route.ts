import { NextResponse } from "next/server";

/** Respuesta mínima para health checks de Render u otros balanceadores. */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, service: "folio-dashboard" }, { status: 200 });
}
