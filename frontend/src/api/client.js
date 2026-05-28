const API_BASE = "";
const _chartCache = new Map();
const _songCache = new Map();
function toParams(q) {
    const p = new URLSearchParams();
    if (q.sort)
        p.set("sort", q.sort);
    if (q.q)
        p.set("q", q.q);
    if (q.limit !== undefined)
        p.set("limit", String(q.limit));
    return p.toString();
}
export async function fetchMeta() {
    const r = await fetch(`${API_BASE}/api/meta`);
    if (!r.ok)
        throw new Error(`meta ${r.status}`);
    return r.json();
}
export async function fetchSongs(q) {
    const r = await fetch(`${API_BASE}/api/songs?${toParams(q)}`);
    if (!r.ok)
        throw new Error(`songs ${r.status}`);
    const songs = await r.json();
    const total = parseInt(r.headers.get("X-Total-Count") ?? String(songs.length), 10);
    return { songs, total };
}
export async function fetchSong(id) {
    const cached = _songCache.get(id);
    if (cached)
        return cached;
    const r = await fetch(`${API_BASE}/api/songs/${id}`);
    if (!r.ok)
        throw new Error(`song ${r.status}`);
    const data = await r.json();
    _songCache.set(id, data);
    return data;
}
export async function fetchChart(id) {
    const cached = _chartCache.get(id);
    if (cached)
        return cached;
    const r = await fetch(`${API_BASE}/api/charts/${id}`);
    if (!r.ok)
        throw new Error(`chart ${r.status}`);
    const data = await r.json();
    _chartCache.set(id, data);
    return data;
}
export function invalidateChartCache(id) {
    if (id === undefined)
        _chartCache.clear();
    else
        _chartCache.delete(id);
}
export function invalidateSongCache(id) {
    if (id === undefined)
        _songCache.clear();
    else
        _songCache.delete(id);
}
