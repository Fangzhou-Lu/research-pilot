"use client";

// Browser-only preferences. Server-side state (interests, bookmarks, summaries,
// chat history) lives in the Rust backend's MongoDB and is reached via
// /api/v1/* with the user id in the X-User-Id header (see lib/user.ts).

const KEYS = {
  language: "rp:language",
  viewMode: "rp:view-mode",
  showTranslation: "rp:show-translation",
  chatLayout: "rp:chat-layout",
  recentChats: "rp:recent-chats",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

export function getLanguage(): "en" | "zh" {
  return read<"en" | "zh">(KEYS.language, "en");
}
export function setLanguage(lang: "en" | "zh"): void {
  write(KEYS.language, lang);
}

export function getViewMode(): "simple" | "detailed" {
  return read<"simple" | "detailed">(KEYS.viewMode, "detailed");
}
export function setViewMode(m: "simple" | "detailed"): void {
  write(KEYS.viewMode, m);
}

export function getShowTranslation(): boolean {
  return read<boolean>(KEYS.showTranslation, false);
}
export function setShowTranslation(v: boolean): void {
  write(KEYS.showTranslation, v);
}

// ─── Chat-page layout state (3-pane resizable layout) ────────────────────────

export type ChatLayout = {
  leftVisible: boolean;
  rightVisible: boolean;
  leftWidth: number; // px, clamped 180..360
  rightWidth: number; // px, clamped 320..600
};

const DEFAULT_CHAT_LAYOUT: ChatLayout = {
  leftVisible: true,
  rightVisible: true,
  leftWidth: 240,
  rightWidth: 420,
};

export function getChatLayout(): ChatLayout {
  return read<ChatLayout>(KEYS.chatLayout, DEFAULT_CHAT_LAYOUT);
}
export function setChatLayout(v: ChatLayout): void {
  write(KEYS.chatLayout, v);
}

// ─── Recent chats — local breadcrumb of papers the user has chatted with ─────

export type RecentChat = {
  id: string;
  title: string;
  category: string;
  visitedAt: number;
};

const RECENT_CHAT_LIMIT = 12;

export function getRecentChats(): RecentChat[] {
  return read<RecentChat[]>(KEYS.recentChats, []);
}

export function pushRecentChat(entry: Omit<RecentChat, "visitedAt">): RecentChat[] {
  const list = getRecentChats().filter((r) => r.id !== entry.id);
  const next: RecentChat[] = [
    { ...entry, visitedAt: Date.now() },
    ...list,
  ].slice(0, RECENT_CHAT_LIMIT);
  write(KEYS.recentChats, next);
  return next;
}
