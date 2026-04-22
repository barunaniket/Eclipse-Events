"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import { EventCard, type EventRecord } from "./EventCard";
import { EventManager } from "./EventManager";

interface EventsPanelProps {
  getAuthHeader: () => Promise<Record<string, string>>;
}

export function EventsPanel({ getAuthHeader }: EventsPanelProps) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/admin/events", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch events.");
      setEvents(data.events || []);
    } catch (err: any) {
      console.error("EventsPanel fetchEvents:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEdit = (event: EventRecord) => {
    setEditingEvent(event);
    setShowManager(true);
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setShowManager(true);
  };

  const handleCloseManager = () => {
    setShowManager(false);
    setEditingEvent(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete event "${name}"? This cannot be undone.`)) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete event.");
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete event.");
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ isActive: !current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update event.");
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: !current } : e)));
    } catch (err: any) {
      alert(err.message || "Failed to toggle event status.");
    }
  };

  const handleToggleRegistration = async (id: string, current: boolean) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ registrationOpen: !current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update registration.");
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, registrationOpen: !current } : e)));
    } catch (err: any) {
      alert(err.message || "Failed to toggle registration.");
    }
  };

  return (
    <div>
      {/* Panel header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wide">Events</h2>
          <p className="text-xs text-gray-500 mt-0.5">{events.length} event{events.length !== 1 ? "s" : ""} configured</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvents}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            <Plus size={14} /> New Event
          </button>
        </div>
      </div>

      {/* Events grid */}
      {isLoading ? (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-12 text-center text-cyan-500">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p className="font-mono text-sm uppercase tracking-widest">Loading Events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-gray-500 text-sm mb-4">No events configured yet.</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            <Plus size={16} /> Create Your First Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onToggleRegistration={handleToggleRegistration}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {showManager && (
        <EventManager
          editingEvent={editingEvent}
          onClose={handleCloseManager}
          onSaved={fetchEvents}
          getAuthHeader={getAuthHeader}
        />
      )}
    </div>
  );
}
