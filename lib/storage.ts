// Saves knowledge bases to localStorage. Good enough for a take-home. See docs/schema.md for the production design.

import type { KnowledgeBase } from "./types";

const KEY = "moknowledge.records.v1";

export function loadRecords(): KnowledgeBase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KnowledgeBase[]) : [];
  } catch {
    // Corrupt JSON in storage shouldn't crash the page. Start empty instead.
    return [];
  }
}

export function saveRecord(record: KnowledgeBase): void {
  const all = loadRecords();
  const idx = all.findIndex((r) => r.id === record.id);
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function deleteRecord(id: string): void {
  const remaining = loadRecords().filter((r) => r.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(remaining));
}

export function getRecord(id: string): KnowledgeBase | undefined {
  return loadRecords().find((r) => r.id === id);
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `kb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
