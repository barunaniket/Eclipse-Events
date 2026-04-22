"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Plus, AlertCircle } from "lucide-react";
import type { EventRecord } from "./EventCard";

// Slugify helper
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface EventManagerProps {
  /** If provided, the modal is in edit mode for this event */
  editingEvent?: EventRecord | null;
  onClose: () => void;
  onSaved: () => void;
  getAuthHeader: () => Promise<Record<string, string>>;
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  location: "",
  eventDate: "",
  startTime: "08:00",
  endTime: "18:00",
  prizePool: "",
  sponsors: "",
  maxTeamSize: 4,
  minTeamSize: 2,
  bannerText: "",
};

export function EventManager({ editingEvent, onClose, onSaved, getAuthHeader }: EventManagerProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const isEdit = !!editingEvent;

  // Populate form when editing
  useEffect(() => {
    if (editingEvent) {
      setForm({
        name: editingEvent.name,
        slug: editingEvent.slug,
        description: editingEvent.description ?? "",
        location: editingEvent.location ?? "",
        eventDate: editingEvent.eventDate?.slice(0, 10) ?? "",
        startTime: editingEvent.startTime ?? "08:00",
        endTime: editingEvent.endTime ?? "18:00",
        prizePool: editingEvent.prizePool ?? "",
        sponsors: editingEvent.sponsors ?? "",
        maxTeamSize: editingEvent.maxTeamSize ?? 4,
        minTeamSize: editingEvent.minTeamSize ?? 2,
        bannerText: editingEvent.bannerText ?? "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setErrors([]);
  }, [editingEvent]);

  const handleNameChange = (val: string) => {
    setForm((f) => ({ ...f, name: val, slug: slugify(val) }));
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.name.trim() || form.name.trim().length < 3) errs.push("Event name must be at least 3 characters.");
    if (!form.slug || !/^[a-z0-9-]+$/.test(form.slug)) errs.push("Slug must only contain lowercase letters, numbers, and hyphens.");
    if (form.maxTeamSize < form.minTeamSize) errs.push("Max team size must be >= min team size.");
    if (form.minTeamSize < 1) errs.push("Min team size must be at least 1.");
    if (form.maxTeamSize > 10) errs.push("Max team size cannot exceed 10.");
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setIsSaving(true);
    try {
      const headers = await getAuthHeader();
      const body = {
        ...form,
        eventDate: form.eventDate || null,
        ...(isEdit ? { id: editingEvent!.id } : {}),
      };

      const res = await fetch(
        isEdit ? `/api/admin/events/${editingEvent!.id}` : "/api/admin/events",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save event.");

      onSaved();
      onClose();
    } catch (err: any) {
      setErrors([err.message || "Unknown error saving event."]);
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors placeholder:text-gray-600";
  const labelCls = "block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl my-4">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wide">
              {isEdit ? "Edit Event" : "Create New Event"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{isEdit ? `Editing: ${editingEvent!.name}` : "Fill in the details below to create a new event."}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> {e}
                </p>
              ))}
            </div>
          )}

          {/* Name + Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Event Name *</label>
              <input
                className={inputCls}
                placeholder="Eclipse Hackathon"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Slug *</label>
              <input
                className={inputCls}
                placeholder="eclipse-hackathon"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} h-20 resize-none`}
              placeholder="Brief description of the event..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Location + Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Location</label>
              <input
                className={inputCls}
                placeholder="MRD Auditorium, PES University"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Event Date</label>
              <input
                type="date"
                className={`${inputCls} [color-scheme:dark]`}
                value={form.eventDate}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start Time</label>
              <input
                type="time"
                className={`${inputCls} [color-scheme:dark]`}
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>End Time</label>
              <input
                type="time"
                className={`${inputCls} [color-scheme:dark]`}
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Prize pool + sponsors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Prize Pool</label>
              <input
                className={inputCls}
                placeholder="Rs 35000+"
                value={form.prizePool}
                onChange={(e) => setForm((f) => ({ ...f, prizePool: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Sponsors</label>
              <input
                className={inputCls}
                placeholder="C-DAC, Zintoo"
                value={form.sponsors}
                onChange={(e) => setForm((f) => ({ ...f, sponsors: e.target.value }))}
              />
            </div>
          </div>

          {/* Team size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Min Team Size *</label>
              <input
                type="number"
                min={1}
                max={10}
                className={inputCls}
                value={form.minTeamSize}
                onChange={(e) => setForm((f) => ({ ...f, minTeamSize: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <label className={labelCls}>Max Team Size *</label>
              <input
                type="number"
                min={1}
                max={10}
                className={inputCls}
                value={form.maxTeamSize}
                onChange={(e) => setForm((f) => ({ ...f, maxTeamSize: parseInt(e.target.value) || 4 }))}
              />
            </div>
          </div>

          {/* Banner text */}
          <div>
            <label className={labelCls}>Banner Text</label>
            <input
              className={inputCls}
              placeholder="Alert: Registration closes soon!"
              value={form.bannerText}
              onChange={(e) => setForm((f) => ({ ...f, bannerText: e.target.value }))}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isEdit ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
