import { useEffect, useMemo, useState } from "react";
import FilterSidebar from "../components/FilterSidebar";
import LevelQuickBar from "../components/LevelQuickBar";
import SongRow from "../components/SongRow";
import { fetchMeta, fetchSongs } from "../api/client";
import type { FilterMeta, Song, SongQuery } from "../types";

const DEFAULT_QUERY: SongQuery = {
  level_min: 1,
  level_max: 20,
  difficulties: [],
  tags: [],
  quick_level: undefined,
  sort: "new",
  q: "",
};

export default function SongList() {
  const [meta,  setMeta]  = useState<FilterMeta | null>(null);
  const [query, setQuery] = useState<SongQuery>(DEFAULT_QUERY);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  // Load filter meta once.
  useEffect(() => { fetchMeta().then(setMeta).catch(console.error); }, []);

  // Refetch songs whenever the query changes — real-time filter.
  useEffect(() => {
    setLoading(true);
    fetchSongs(query)
      .then(setSongs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(query)]);

  /** Compute the "best" chart to land on when the user clicks the title. */
  const titleTargets = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of songs) {
      // Highest-level chart still in the filter set.
      const top = [...s.charts].sort((a, b) => b.level - a.level)[0];
      if (top) map.set(s.id, top.id);
    }
    return map;
  }, [songs]);

  return (
    <div className="app-shell">
      {/* Top KPI + sort */}
      <div className="discover-header">
        <div className="left">
          <div className="label">DISCOVER</div>
          <div className="count">
            {songs.length.toLocaleString()}<span className="unit">곡</span>
          </div>
        </div>
        <div className="sort-tabs">
          <button
            className={query.sort === "level_desc" ? "active" : ""}
            onClick={() => setQuery({ ...query, sort: "level_desc" })}
          >Lv↓</button>
          <button
            className={query.sort === "level_asc" ? "active" : ""}
            onClick={() => setQuery({ ...query, sort: "level_asc" })}
          >Lv↑</button>
          <button
            className={query.sort === "new" ? "active" : ""}
            onClick={() => setQuery({ ...query, sort: "new" })}
          >신곡</button>
        </div>
      </div>

      {/* 1~20 level quick-filter */}
      <LevelQuickBar
        active={query.quick_level}
        onPick={(lv) => setQuery({ ...query, quick_level: lv })}
      />

      {/* Left: filter sidebar.   Right: list. */}
      <FilterSidebar meta={meta} query={query} setQuery={setQuery} />

      <div className="song-list">
        {loading && songs.length === 0
          ? <div className="empty">불러오는 중…</div>
          : songs.length === 0
            ? <div className="empty">조건에 맞는 곡이 없어요. 필터를 풀어보세요.</div>
            : songs.map((s) => (
                <SongRow
                  key={s.id}
                  song={s}
                  titleTargetChartId={titleTargets.get(s.id) ?? s.charts[0]?.id}
                />
              ))}
      </div>
    </div>
  );
}
