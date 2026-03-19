// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPendingRegistrationEmail } from '@/lib/mailer';
import { z } from 'zod';

const CYCLE_PREFIX = "PES2UG25";
const BUILD_TAG =
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_HASH ??
  process.env.GITHUB_SHA ??
  'unknown';

const json = (body: any, init?: ResponseInit) => {
  const res = NextResponse.json(body, init);
  res.headers.set('x-build-tag', BUILD_TAG);
  res.headers.set('cache-control', 'no-store');
  return res;
};

const srnRegex = /^PES[12](?:UG|PG)\d{2}(?:CS|EC|AM)\d{3}$/i;
const phoneRegex = /^(?:([+]\d{1,4})[-.\s]?)?(?:[(](\d{1,3})[)][-.\s]?)?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9})$/;

const memberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  phone: z.string().trim().regex(phoneRegex, "Invalid phone number format"),
  srn: z.string().trim().toUpperCase().regex(srnRegex, "Invalid SRN format"),
  cycle: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.srn.startsWith(CYCLE_PREFIX) && (!data.cycle || !["physics", "chemistry"].includes(data.cycle))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Cycle selection is required for SRN ${data.srn}.`,
      path: ["cycle"]
    });
  }
});

const registrationSchema = z.object({
  teamName: z.string().trim().min(1, "Team name is required").max(100),
  trackId: z.string().uuid("Invalid track ID format"),
  teamSize: z.number().int().min(1).max(4),
  receiptUrls: z.array(z.string().url("Invalid receipt URL")),
  members: z.array(memberSchema),
}).refine(data => data.receiptUrls.length === data.teamSize && data.members.length === data.teamSize, {
  message: "Receipts and members count must match team size."
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

    const validationResult = registrationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return json({ error: validationResult.error.errors[0].message, details: validationResult.error.errors }, { status: 400 });
    }
    const payload = validationResult.data;

    // Call the single atomic PostgreSQL function
    const { data: teamData, error: dbError } = await supabaseAdmin.rpc('register_full_team', {
      payload: payload
    });

    if (dbError) {
      console.error("Database Error:", dbError);
      if (dbError.code === '23505') { 
        const field = dbError.message.includes('email') ? 'Email' : 'SRN';
        return json({ error: `${field} is already registered.` }, { status: 400 });
      }
      if (dbError.message.includes('TRACK_FULL')) {
        return json({ error: "This track just reached its maximum capacity." }, { status: 400 });
      }
      return json({ error: "Database error occurred.", dbDetails: dbError.message }, { status: 500 });
    }

    // Fire-and-forget emails
    Promise.allSettled(
      payload.members.map((member) => 
        sendPendingRegistrationEmail(member.name, member.email, payload.teamName)
      )
    ).catch(console.error);

    return json({
      success: true,
      teamNumber: teamData.team_number,
      teamName: payload.teamName,
      status: 'pending'
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return json({ error: "Internal server error.", details: error.message }, { status: 500 });
  }
}
