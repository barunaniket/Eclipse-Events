// app/api/admin/clear-receipts/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const json = (body: any, init?: ResponseInit) => NextResponse.json(body, init);

type StorageEntry = { name: string; id?: string; updated_at?: string; metadata?: any };

async function listAllFiles(prefix: string) {
  const files: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from("receipts")
      .list(prefix, { limit, offset });

    if (error) {
      throw new Error(error.message || "Failed to list receipts bucket.");
    }

    const entries = (data ?? []) as StorageEntry[];
    if (entries.length === 0) break;

    for (const entry of entries) {
      if (entry.name && entry.name !== ".emptyFolderPlaceholder") {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        files.push(path);
      }
    }

    if (entries.length < limit) break;
    offset += limit;
  }

  return files;
}

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

    const allFiles = new Set<string>();
    const rootFiles = await listAllFiles("");
    rootFiles.forEach(f => allFiles.add(f));
    const publicFiles = await listAllFiles("public");
    publicFiles.forEach(f => allFiles.add(f));

    const fileList = Array.from(allFiles);
    const batchSize = 100;
    let deleted = 0;

    for (let i = 0; i < fileList.length; i += batchSize) {
      const batch = fileList.slice(i, i + batchSize);
      const { error: removeError } = await supabaseAdmin.storage
        .from("receipts")
        .remove(batch);
      if (removeError) {
        return json({ error: removeError.message || "Failed to clear receipts bucket." }, { status: 500 });
      }
      deleted += batch.length;
    }

    return json({ success: true, deleted });
  } catch (error: any) {
    return json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
