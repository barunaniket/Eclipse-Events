// lib/events.ts

export type EventStatus = 'draft' | 'active' | 'archived';

export interface EventTrack {
  id: string;
  title: string;
  description: string;
  maxTeams: number;
  currentCount: number;
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string;
  location: string;
  eventDate: string | null;
  startTime: string;
  endTime: string;
  prizePool: string;
  sponsors: string;
  isActive: boolean;
  registrationOpen: boolean;
  maxTeamSize: number;
  minTeamSize: number;
  bannerText: string;
  createdAt: string;
  updatedAt: string;
  // Derived from related tables
  teamCount?: number;
  tracks?: EventTrack[];
}

export interface CreateEventInput {
  name: string;
  slug: string;
  description: string;
  location: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  prizePool: string;
  sponsors: string;
  maxTeamSize: number;
  minTeamSize: number;
  bannerText: string;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  isActive?: boolean;
  registrationOpen?: boolean;
}

// Slugify a name to URL-safe slug
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Validate event input — returns array of error strings
export function validateEventInput(input: Partial<CreateEventInput>): string[] {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length < 3) {
    errors.push('Event name must be at least 3 characters.');
  }
  if (!input.slug || !/^[a-z0-9-]+$/.test(input.slug)) {
    errors.push('Slug must only contain lowercase letters, numbers, and hyphens.');
  }
  if (input.maxTeamSize !== undefined && input.minTeamSize !== undefined) {
    if (input.maxTeamSize < input.minTeamSize) {
      errors.push('Max team size must be >= min team size.');
    }
    if (input.minTeamSize < 1) {
      errors.push('Min team size must be at least 1.');
    }
    if (input.maxTeamSize > 10) {
      errors.push('Max team size cannot exceed 10.');
    }
  }

  return errors;
}

// Map raw Supabase row → Event type
export function mapEvent(row: any): Event {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    location: row.location ?? '',
    eventDate: row.event_date ?? null,
    startTime: row.start_time ?? '',
    endTime: row.end_time ?? '',
    prizePool: row.prize_pool ?? '',
    sponsors: row.sponsors ?? '',
    isActive: row.is_active ?? false,
    registrationOpen: row.registration_open ?? true,
    maxTeamSize: row.max_team_size ?? 4,
    minTeamSize: row.min_team_size ?? 2,
    bannerText: row.banner_text ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    teamCount: row.teams?.[0]?.count ?? 0,
  };
}
