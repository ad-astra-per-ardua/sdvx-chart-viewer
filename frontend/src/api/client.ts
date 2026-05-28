import type { ChartDetailDto, FilterMeta, Song, SongQuery } from "../types";

const API_BASE = "";

const _chartCache = new Map<number, ChartDetailDto>();
const _songCache  = new Map<number, Song>();

function toParams(q: Partial<SongQuery>): string {
  const p = new URLSearchParams();
  if (q.sort)                p.set("sort",  q.sort);
  if (q.q)                   p.set("q",     q.q);
  if (q.limit !== undefined) p.set("limit", String(q.limit));
  return p.toString();
}

const PUBLIC_INIT: RequestInit = { credentials: "omit" };

export async function fetchMeta(signal?: AbortSignal): Promise<FilterMeta> {
  const r = await fetch(`${API_BASE}/api/meta`, { ...PUBLIC_INIT, signal });
  if (!r.ok) throw new Error(`meta ${r.status}`);
  return r.json();
}

export async function fetchSongs(
  q: Partial<SongQuery>,
  signal?: AbortSignal,
): Promise<{ songs: Song[]; total: number }> {
  const qs = toParams(q);
  const r = await fetch(`${API_BASE}/api/songs${qs ? `?${qs}` : ""}`, { ...PUBLIC_INIT, signal });
  if (!r.ok) throw new Error(`songs ${r.status}`);
  const songs: Song[] = await r.json();
  const total = parseInt(r.headers.get("X-Total-Count") ?? String(songs.length), 10);
  return { songs, total };
}

export async function fetchSong(id: number, signal?: AbortSignal): Promise<Song> {
  const cached = _songCache.get(id);
  if (cached) return cached;
  const r = await fetch(`${API_BASE}/api/songs/${id}`, { ...PUBLIC_INIT, signal });
  if (!r.ok) throw new Error(`song ${r.status}`);
  const data: Song = await r.json();
  _songCache.set(id, data);
  return data;
}

export async function fetchChart(id: number, signal?: AbortSignal): Promise<ChartDetailDto> {
  const cached = _chartCache.get(id);
  if (cached) return cached;
  const r = await fetch(`${API_BASE}/api/charts/${id}`, { ...PUBLIC_INIT, signal });
  if (!r.ok) throw new Error(`chart ${r.status}`);
  const data: ChartDetailDto = await r.json();
  _chartCache.set(id, data);
  return data;
}

export function invalidateChartCache(id?: number) {
  if (id === undefined) _chartCache.clear();
  else _chartCache.delete(id);
}

export function invalidateSongCache(id?: number) {
  if (id === undefined) _songCache.clear();
  else _songCache.delete(id);
}
