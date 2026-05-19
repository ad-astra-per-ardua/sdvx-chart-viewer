import type { ChartDetailDto, FilterMeta, Song, SongQuery } from "../types";

const API_BASE = "";

function toParams(q: Partial<SongQuery>): string {
  const p = new URLSearchParams();
  if (q.level_min !== undefined) p.set("level_min", String(q.level_min));
  if (q.level_max !== undefined) p.set("level_max", String(q.level_max));
  if (q.sort)                    p.set("sort",      q.sort);
  if (q.quick_level !== undefined && q.quick_level !== null)
    p.set("quick_level", String(q.quick_level));
  if (q.q)                       p.set("q", q.q);
  for (const d of q.difficulties ?? []) p.append("difficulties", d);
  for (const t of q.tags         ?? []) p.append("tags",         t);
  return p.toString();
}

export async function fetchMeta(): Promise<FilterMeta> {
  const r = await fetch(`${API_BASE}/api/meta`);
  if (!r.ok) throw new Error(`meta ${r.status}`);
  return r.json();
}

export async function fetchSongs(q: Partial<SongQuery>): Promise<Song[]> {
  const r = await fetch(`${API_BASE}/api/songs?${toParams(q)}`);
  if (!r.ok) throw new Error(`songs ${r.status}`);
  return r.json();
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
