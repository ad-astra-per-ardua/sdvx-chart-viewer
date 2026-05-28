import {
  startTransition, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { Link } from "react-router-dom";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import FilterSidebar from "../components/FilterSidebar";
import LevelQuickBar from "../components/LevelQuickBar";
import SongRow from "../components/SongRow";
import { fetchMeta, fetchSongs } from "../api/client";
import type { FilterMeta, Song, SongQuery } from "../types";

const DEFAULT_QUERY: SongQuery = {
  level_min: 1,
  level_max: 20.9,
  difficulties: [],
  tags: [],
  quick_level: undefined,
  sort: "new",
  q: "",
};

const ROW_ESTIMATE = 94;
const ROW_OVERSCAN = 8;

function applyFilter(all: Song[], query: SongQuery): Song[] {
  const { level_min, level_max, difficulties, tags, quick_level, sort } = query;
  const diffSet  = new Set(difficulties);
  const hasDiff  = diffSet.size > 0;
  const hasTag   = tags.length > 0;
  const hasLevel = quick_level !== undefined || level_min !== 1 || level_max !== 20.9;
  const out: Array<{ song: Song; maxLevel: number }> = [];

  for (let i = 0; i < all.length; i++) {
    const song = all[i];
    let charts = song.charts;

    if (hasDiff) charts = charts.filter(c => diffSet.has(c.difficulty));

    if (quick_level !== undefined) {
      charts = charts.filter(c => c.level >= quick_level && c.level < quick_level + 1);
    } else if (hasLevel) {
      charts = charts.filter(c => c.level >= level_min && c.level <= level_max);
    }

    if (hasTag) charts = charts.filter(c => tags.every(t => c.tags.some(ct => ct.name === t)));

    if (charts.length === 0) continue;

    let maxLevel = 0;
    for (const c of charts) if (c.level > maxLevel) maxLevel = c.level;

    out.push({ song: charts === song.charts ? song : { ...song, charts }, maxLevel });
  }

  if (sort === "new") return out.map(x => x.song);
  out.sort((a, b) =>
    sort === "level_desc" ? b.maxLevel - a.maxLevel : a.maxLevel - b.maxLevel
  );
  return out.map(x => x.song);
}

export default function SongList() {
  const [meta,     setMeta]     = useState<FilterMeta | null>(null);
  const [query,    setQuery]    = useState<SongQuery>(DEFAULT_QUERY);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchMeta(ctrl.signal).then(setMeta).catch((e) => {
      if (e?.name !== "AbortError") console.error(e);
    });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchSongs({ q: query.q || undefined }, ctrl.signal)
      .then(({ songs }) => {
        startTransition(() => setAllSongs(songs));
      })
      .catch((e) => {
        if (e?.name !== "AbortError") console.error(e);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [query.q]);

  const deferredQuery = useDeferredValue(query);
  const isPending     = query !== deferredQuery;
  const songs = useMemo(
    () => applyFilter(allSongs, deferredQuery),
    [allSongs, deferredQuery],
  );

  const titleTargets = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of songs) {
      let topId = s.charts[0]?.id;
      let topLevel = s.charts[0]?.level ?? -1;
      for (let i = 1; i < s.charts.length; i++) {
        if (s.charts[i].level > topLevel) {
          topLevel = s.charts[i].level;
          topId = s.charts[i].id;
        }
      }
      if (topId !== undefined) map.set(s.id, topId);
    }
    return map;
  }, [songs]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const [listOffset, setListOffset] = useState(0);
  useLayoutEffect(() => {
    const update = () => setListOffset(listRef.current?.offsetTop ?? 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: songs.length,
    estimateSize: () => ROW_ESTIMATE,
    overscan: ROW_OVERSCAN,
    scrollMargin: listOffset,
    getItemKey: (i) => songs[i].id,
  });
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="app-shell">
      <div className="discover-header">
        <div className="left">
          <div className="label">TOTAL</div>
          <div className="count">
            {songs.length.toLocaleString()}<span className="unit">곡</span>
          </div>
        </div>
        <div className="sort-tabs">
          <button
            className={query.sort === "level_desc" ? "active" : ""}
            onClick={() => setQuery({ ...query, sort: "level_desc" })}
          >Lv ↓</button>
          <button
            className={query.sort === "level_asc" ? "active" : ""}
            onClick={() => setQuery({ ...query, sort: "level_asc" })}
          >Lv ↑</button>
          <button
            className={query.sort === "new" ? "active" : ""}
            onClick={() => setQuery({ ...query, sort: "new" })}
          >최신</button>
        </div>
        <Link to="/megamix" className="megamix-nav-btn">좋은 승부</Link>
      </div>

      <LevelQuickBar
        active={query.quick_level}
        onPick={(lv) => setQuery({ ...query, quick_level: lv })}
      />

      <FilterSidebar meta={meta} query={query} setQuery={setQuery} />

      <div
        ref={listRef}
        className="song-list"
        style={{
          position: "relative",
          minHeight: loading ? `${ROW_ESTIMATE * 8}px` : undefined,
          height: songs.length === 0 ? undefined : `${virtualizer.getTotalSize()}px`,
          opacity: isPending ? 0.6 : undefined,
          transition: "opacity 0.15s",
        }}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="song-row skeleton-row"
              style={{
                position: "absolute",
                top: 0, left: 0, width: "100%",
                transform: `translateY(${i * (ROW_ESTIMATE)}px)`,
                height: ROW_ESTIMATE - 10,
              }}
              aria-hidden
            />
          ))
        ) : songs.length === 0 ? (
          <div className="empty">조건에 맞는 곡이 없어요. 필터를 풀어보세요.</div>
        ) : (
          virtualItems.map((vi) => {
            const s = songs[vi.index];
            return (
              <div
                key={vi.key}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  paddingBottom: 10,
                  transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                <SongRow
                  song={s}
                  titleTargetChartId={titleTargets.get(s.id) ?? s.charts[0]?.id}
                  priority={vi.index === 0}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
