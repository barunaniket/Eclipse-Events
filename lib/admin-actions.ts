import { supabaseAdmin } from '@/lib/supabase-admin';

type AdminAction = 'approve' | 'reject';

export const logAdminAction = async ({
  action,
  adminId,
  adminEmail,
  teamId,
  metadata,
}: {
  action: AdminAction;
  adminId: string;
  adminEmail: string | undefined;
  teamId: string;
  metadata?: Record<string, unknown>;
}) => {
  const { error } = await supabaseAdmin.from('admin_actions').insert({
    action,
    admin_id: adminId,
    admin_email: adminEmail || null,
    team_id: teamId,
    metadata: metadata || {},
  });

  if (error) {
    console.warn('Failed to persist admin action log.', error.message);
  }
};
