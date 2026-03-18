// app/api/admin/clear-db/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const json = (body: any, init?: ResponseInit) => NextResponse.json(body, init);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "");
    if (!accessToken) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user || user.user_metadata?.role !== "admin") {
      return json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { error: resetError } = await supabaseAdmin.rpc("reset_registration_data");
    if (resetError) {
      return json({ error: resetError.message || "Failed to reset registration data." }, { status: 500 });
    }

    let page = 1;
    const perPage = 1000;
    let deleted = 0;
    let scanned = 0;

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        return json({ error: error.message || "Failed to list auth users." }, { status: 500 });
      }
      const users = data?.users ?? [];
      if (users.length === 0) break;

      for (const u of users) {
        scanned += 1;
        if (u.user_metadata?.role === "candidate") {
          const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(u.id);
          if (!delError) deleted += 1;
        }
      }

      if (users.length < perPage) break;
      page += 1;
    }

    return json({ success: true, authUsersScanned: scanned, authUsersDeleted: deleted });
  } catch (error: any) {
    return json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
