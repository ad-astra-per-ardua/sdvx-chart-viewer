import type { ChartDetailDto, FilterMeta, Song, SongQuery } from "../types";

const API_BASE = "";

// Server-side filtering moved fully client-side; only these reach the API.
function toParams(q: Partial<SongQuery>): string {
  const p = new URLSearchParams();
  if (q.sort)                p.set("sort",  q.sort);
  if (q.q)                   p.set("q",     q.q);
  if (q.limit !== undefined) p.set("limit", String(q.limit));
  return p.toString();
}

export async function fetchMeta(): Promise<FilterMeta> {
  const r = await fetch(`${API_BASE}/api/meta`);
  if (!r.ok) throw new Error(`meta ${r.status}`);
  return r.json();
}

export async function fetchSongs(
  q: Partial<SongQuery>,
): Promise<{ songs: Song[]; total: number }> {
  const r = await fetch(`${API_BASE}/api/songs?${toParams(q)}`);
  if (!r.ok) throw new Error(`songs ${r.status}`);
  const songs: Song[] = await r.json();
  const total = parseInt(r.headers.get("X-Total-Count") ?? String(songs.length), 10);
  return { songs, total };
}

export async function fetchSong(id: number): Promise<Song> {
  const r = await fetch(`${API_BASE}/api/songs/${id}`);
  if (!r.ok) throw new Error(`song ${r.status}`);
  return r.json();
}

export async function fetchChart(id: number): Promise<ChartDetailDto> {
  const r = await fetch(`${API_BASE}/api/charts/${id}`);
  if (!r.ok) throw new Error(`chart ${r.status}`);
  return r.json();
}
