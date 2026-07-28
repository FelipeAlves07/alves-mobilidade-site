import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 400 });
  }

  const { data: deleted, error } = await supabase
    .from("contacts")
    .delete()
    .eq("origin", "WhatsApp")
    .select("id, name, phone");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: deleted?.length ?? 0, contacts: deleted });
}

export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 400 });
  }

  const { leads } = await request.json();

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "Envie um array de leads" }, { status: 400 });
  }

  const results: { imported: number; skipped: number; errors: string[] } = { imported: 0, skipped: 0, errors: [] };

  for (const lead of leads) {
    if (!lead.name || !lead.phone) {
      results.skipped++;
      continue;
    }

    const phone = lead.phone.replace(/\D/g, "");

    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      results.skipped++;
      continue;
    }

    const { error } = await supabase.from("contacts").insert({
      name: lead.name.trim(),
      phone,
      type: "Outro",
      origin: "WhatsApp",
      lead_status: "Novo contato",
      notes: lead.notes || "Importado automaticamente do WhatsApp",
      next_action: "Enviar apresentação da Alves",
      next_date: new Date().toISOString().split("T")[0],
    });

    if (error) {
      results.errors.push(`${lead.name}: ${error.message}`);
    } else {
      results.imported++;
    }
  }

  return NextResponse.json(results);
}
