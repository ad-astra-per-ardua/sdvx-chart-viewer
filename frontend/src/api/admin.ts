/**
 * Admin API client.
 *
 * Auth: the admin token is stored in localStorage under "adminToken" and
 * sent on every request as X-Admin-Token. The token is verified once via
 * /api/admin/login when the user logs in.
 */

import type { Chart, ChartImage, Song, Tag } from "../types";

const TOKEN_KEY = "adminToken";

export const adminAuth = {
  get token(): string { return localStorage.getItem(TOKEN_KEY) ?? ""; },
  set token(v: string) {
    if (v) localStorage.setItem(TOKEN_KEY, v);
    else   localStorage.removeItem(TOKEN_KEY);
  },
  clear() { localStorage.removeItem(TOKEN_KEY); },
};

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "X-Admin-Token": adminAuth.token,
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };
  // Don't set content-type for FormData — browser will add the boundary.
  if (init.body && !(init.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const r = await fetch(path, { ...init, headers });
  if (r.status === 401) {
    adminAuth.clear();
    throw new Error("unauthorized");
  }
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
  if (r.status === 204) return undefined as T;
  return r.json() as Promise<T>;
}

// ── auth ──
export const adminLogin = (token: string) =>
  fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).then((r) => {
    if (!r.ok) throw new Error("invalid token");
    adminAuth.token = token;
  });

// ── songs ──
export const adminListSongs   = (q?: string) =>
  req<Song[]>(`/api/admin/songs${q ? `?q=${encodeURIComponent(q)}` : ""}`);

export interface SongInput { title: string; artist: string; }
export const adminCreateSong  = (data: SongInput) =>
  req<Song>("/api/admin/songs", { method: "POST", body: JSON.stringify(data) });

export const adminUpdateSong  = (id: number, data: Partial<SongInput>) =>
  req<Song>(`/api/admin/songs/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const adminDeleteSong  = (id: number) =>
  req<void>(`/api/admin/songs/${id}`, { method: "DELETE" });

// ── charts ──
export interface ChartInput { song_id: number; difficulty: string; level: number; tag_ids?: number[]; jacket_url?: string; }
export const adminCreateChart = (data: ChartInput) =>
  req<Chart>("/api/admin/charts", { method: "POST", body: JSON.stringify(data) });

export interface ChartUpdateInput { difficulty?: string; level?: number; tag_ids?: number[]; jacket_url?: string; }
export const adminUpdateChart = (id: number, data: ChartUpdateInput) =>
  req<Chart>(`/api/admin/charts/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const adminDeleteChart = (id: number) =>
  req<void>(`/api/admin/charts/${id}`, { method: "DELETE" });

// ── chart images ──
export interface ChartImageInput { chart_id: number; image_url: string; order_idx?: number; part?: string; }
export const adminCreateChartImage = (data: ChartImageInput) =>
  req<ChartImage>("/api/admin/chart-images", { method: "POST", body: JSON.stringify(data) });

export const adminDeleteChartImage = (id: number) =>
  req<void>(`/api/admin/chart-images/${id}`, { method: "DELETE" });

// ── tags ──
export const adminListTags   = () => req<Tag[]>("/api/admin/tags");
export const adminCreateTag  = (name: string) =>
  req<Tag>("/api/admin/tags", { method: "POST", body: JSON.stringify({ name }) });
export const adminDeleteTag  = (id: number) =>
  req<void>(`/api/admin/tags/${id}`, { method: "DELETE" });

// ── upload ──
export interface UploadResult { url: string; filename: string; size: number; }
export const adminUpload = async (file: File): Promise<UploadResult> => {
  const fd = new FormData();
  fd.append("file", file);
  return req<UploadResult>("/api/admin/upload", { method: "POST", body: fd });
};
