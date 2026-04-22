"use client";

import React from "react";
import { Calendar, MapPin, Trophy, Users, Radio, RadioTower, Edit2, Trash2, Eye } from "lucide-react";

export type EventStatus = 'draft' | 'active' | 'archived';

export interface EventRecord {
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
  teamCount?: number;
}

interface EventCardProps {
  event: EventRecord;
  onEdit: (event: EventRecord) => void;
  onDelete: (id: string, name: string) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onToggleRegistration: (id: string, current: boolean) => void;
}

export function EventCard({ event, onEdit, onDelete, onToggleActive, onToggleRegistration }: EventCardProps) {
  const formattedDate = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Date TBD";

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl hover:border-white/20 transition-colors">
      {/* Header stripe */}
      <div className={`h-1 w-full ${event.isActive ? "bg-gradient-to-r from-green-500 to-cyan-500" : "bg-gradient-to-r from-gray-700 to-gray-600"}`} />

      <div className="p-5 flex flex-col gap-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-white truncate">{event.name}</h3>
              <span className={`text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border ${
                event.isActive
                  ? "bg-green-600/20 text-green-400 border-green-500/30"
                  : "bg-gray-700/40 text-gray-500 border-gray-600/30"
              }`}>
                {event.isActive ? "Active" : "Draft"}
              </span>
              <span className={`text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border ${
                event.registrationOpen
                  ? "bg-cyan-600/20 text-cyan-400 border-cyan-500/30"
                  : "bg-red-600/20 text-red-400 border-red-500/30"
              }`}>
                Reg {event.registrationOpen ? "Open" : "Closed"}
              </span>
              {typeof event.teamCount === "number" && (
                <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border bg-purple-600/20 text-purple-400 border-purple-500/30">
                  {event.teamCount} teams
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono">/{event.slug}</p>
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} className="text-cyan-500 flex-shrink-0" />
            {formattedDate}
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5 truncate">
              <MapPin size={13} className="text-purple-400 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
          {event.prizePool && (
            <span className="flex items-center gap-1.5">
              <Trophy size={13} className="text-yellow-400 flex-shrink-0" />
              {event.prizePool}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users size={13} className="text-green-400 flex-shrink-0" />
            {event.minTeamSize}–{event.maxTeamSize} per team
          </span>
        </div>

        {event.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{event.description}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          <button
            onClick={() => onToggleActive(event.id, event.isActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
              event.isActive
                ? "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                : "bg-gray-700/30 text-gray-500 border-gray-600/20 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30"
            }`}
          >
            {event.isActive ? <RadioTower size={13} className="animate-pulse" /> : <Radio size={13} />}
            {event.isActive ? "Set Offline" : "Set Active"}
          </button>

          <button
            onClick={() => onToggleRegistration(event.id, event.registrationOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
              event.registrationOpen
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/30"
                : "bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30"
            }`}
          >
            <Eye size={13} />
            {event.registrationOpen ? "Close Reg" : "Open Reg"}
          </button>

          <button
            onClick={() => onEdit(event)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white ml-auto"
          >
            <Edit2 size={13} /> Edit
          </button>

          <button
            onClick={() => onDelete(event.id, event.name)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border bg-red-600/10 text-red-400 border-red-500/20 hover:bg-red-600/30"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
