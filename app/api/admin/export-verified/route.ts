// app/api/admin/export-verified/route.ts
import { supabaseAdmin } from "@/lib/supabase-admin";
import * as XLSX from "xlsx";

const HEADERS = [
  "team_number",
  "team_name",
  "track",
  "candidate_name",
  "candidate_email",
  "phone",
  "srn",
  "cycle",
  "is_leader",
  "member_index",
  "receipt_url"
];

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user || user.user_metadata?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403 });
    }

    const { data: teams, error } = await supabaseAdmin
      .from("teams")
      .select(`
        id,
        team_name,
        team_number,
        payment_status,
        tracks (title),
        candidates (id, full_name, email, phone, srn, cycle, is_leader, member_index),
        payment_receipts (member_index, receipt_url)
      `)
      .eq("payment_status", "approved")
      .order("team_number", { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message || "Failed to fetch verified teams." }), { status: 500 });
    }

    const rows: Record<string, any>[] = [];
    (teams ?? []).forEach((team: any) => {
      const receiptMap = new Map<number, string>();
      (team.payment_receipts ?? []).forEach((r: any) => {
        if (typeof r.member_index === "number") {
          receiptMap.set(r.member_index, r.receipt_url);
        }
      });

      (team.candidates ?? [])
        .slice()
        .sort((a: any, b: any) => (a.member_index ?? 0) - (b.member_index ?? 0))
        .forEach((candidate: any) => {
          rows.push({
            team_number: team.team_number ?? "",
            team_name: team.team_name ?? "",
            track: team.tracks?.title ?? "",
            candidate_name: candidate.full_name ?? "",
            candidate_email: candidate.email ?? "",
            phone: candidate.phone ?? "",
            srn: candidate.srn ?? "",
            cycle: candidate.cycle ?? "",
            is_leader: candidate.is_leader ? "yes" : "no",
            member_index: candidate.member_index ?? "",
            receipt_url: receiptMap.get(candidate.member_index) ?? ""
          });
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Verified");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const fileName = `verified-teams-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Internal server error" }), { status: 500 });
  }
}
