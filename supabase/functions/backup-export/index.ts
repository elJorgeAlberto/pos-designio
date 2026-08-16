import { createClient } from "jsr:@supabase/supabase-js@2";

// Weekly, platform-wide backup — dumps every table to a timestamped JSON
// file in the private 'backups' Storage bucket. Called by pg_cron via
// pg_net (see supabase/migrations/20260816115310_backups_infra.sql),
// never by a tenant. Authenticated with the service_role key, both as
// the Edge Function's own bearer token and to read/write with RLS
// bypassed.

const TABLES = [
  "companies",
  "users",
  "super_admins",
  "business_types",
  "branches",
  "cash_registers",
  "roles",
  "permissions",
  "role_permissions",
  "user_branches",
  "products",
  "product_stock",
  "inventory_movements",
  "sales",
  "sale_items",
  "sale_payments",
  "clients",
  "collections",
  "cash_register_sessions",
  "ticket_settings",
  "audit_log",
];

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey,
  );

  const dump: Record<string, unknown> = {};
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      return Response.json(
        { error: `Failed exporting ${table}: ${error.message}` },
        { status: 500 },
      );
    }
    dump[table] = data;
  }

  const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`;
  const { error: uploadError } = await supabase.storage
    .from("backups")
    .upload(filename, JSON.stringify(dump), {
      contentType: "application/json",
      upsert: true,
    });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  return Response.json({ ok: true, filename, tables: TABLES.length });
});
