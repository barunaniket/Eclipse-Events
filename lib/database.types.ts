export type QRMode = 'is_present' | 'lunch_received' | 'snacks_received';

export type MemberFormData = {
  name: string;
  email: string;
  phone: string;
  srn: string;
};

export type CandidateSummary = {
  id: string;
  is_present: boolean;
  lunch_received: boolean;
  snacks_received: boolean;
};

export type CandidateDetails = CandidateSummary & {
  full_name: string;
  srn: string;
  is_leader: boolean;
  email?: string;
};

export type TrackSummary = {
  title: string;
};

export type TeamSummary = {
  id: string;
  team_name: string;
  team_number: number;
  team_size: number;
  payment_status?: string;
  receipt_url?: string;
  tracks: TrackSummary | null;
  candidates: CandidateSummary[];
};

export type TeamDetails = {
  id: string;
  team_name: string;
  team_number: number;
  tracks: TrackSummary | null;
  candidates: CandidateDetails[];
};

export type AdminTeamRecord = {
  id: string;
  team_name: string;
  team_number: number;
  team_size: number;
  payment_status: 'pending' | 'approved';
  receipt_url: string;
  tracks: TrackSummary | null;
  candidates: Array<Required<Pick<CandidateDetails, 'id' | 'full_name' | 'srn' | 'is_leader'>> & { email: string }>;
};
