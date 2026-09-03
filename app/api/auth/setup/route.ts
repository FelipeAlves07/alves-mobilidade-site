import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Endpoint de provisionamento desativado. Crie usuários pelo Supabase Auth." },
    { status: 410 },
  );
}
