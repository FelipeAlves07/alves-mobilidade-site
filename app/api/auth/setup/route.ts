import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = "admin@alvesmobilidade.com.br";
  const password = "alves2026";
  const name = "Admin";

  const { data: existing } = await admin.auth.admin.listUsers();
  const adminUser = existing?.users?.find((u) => u.email === email);

  if (adminUser) {
    if (!adminUser.email_confirmed_at) {
      await admin.auth.admin.updateUserById(adminUser.id, { email_confirm: true });
      return NextResponse.json({ message: "Admin user already exists — email confirmed" });
    }
    return NextResponse.json({ message: "Admin user already exists and confirmed" });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Admin user created", id: data.user?.id });
}
