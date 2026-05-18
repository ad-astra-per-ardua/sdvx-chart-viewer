import { useEffect } from "react";
import type { Difficulty, FilterMeta, SongQuery } from "../types";

interface Props {
  meta: FilterMeta | null;
  query: SongQuery;
  setQuery: (q: SongQuery) => void;
}

/**
 * Left-side filter panel. Level range (1~20 numeric inputs that accept
 * mouse-wheel clicks), difficulty chips and tag chips. All changes are
 * applied in real time — no submit needed — but a 검색 button is kept for
 * affordance parity with the screenshot.
 */
export default function FilterSidebar({ meta, query, setQuery }: Props) {
  // Defensive clamps
  const onLevelMin = (v: number) =>
    setQuery({ ...query, level_min: clamp(v, 1, query.level_max) });
  const onLevelMax = (v: number) =>
    setQuery({ ...query, level_max: clamp(v, query.level_min, 20) });

  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const onDiff = (d: Difficulty) =>
    setQuery({ ...query, difficulties: toggle(query.difficulties, d) });

  const onTag = (t: string) =>
    setQuery({ ...query, tags: toggle(query.tags, t) });

  const onReset = () =>
    setQuery({
      level_min: 1, level_max: 20,
      difficulties: [], tags: [],
      sort: query.sort,
      quick_level: undefined,
      q: "",
    });

  // Auto-sync when meta loads (no-op).
  useEffect(() => {}, [meta]);

  return (
    <aside className="sidebar">
      <div className="row-header">
        <h3>고급 필터</h3>
        <button className="reset-btn" onClick={onReset}>↺ 초기화</button>
      </div>

      <div className="section-label">레벨</div>
      <div className="level-range">
        <input type="number" min={1} max={20} value={query.level_min}
               onChange={(e) => onLevelMin(parseInt(e.target.value || "1", 10))} />
        <span>~</span>
        <input type="number" min={1} max={20} value={query.level_max}
               onChange={(e) => onLevelMax(parseInt(e.target.value || "20", 10))} />
      </div>

      <div className="section-label">난이도</div>
      <div className="chip-row">
        {(meta?.difficulties ?? []).map((d) => (
          <button
            key={d}
            data-diff={d}
            className={`chip diff ${query.difficulties.includes(d) ? "active" : ""}`}
            onClick={() => onDiff(d)}
          >{d}</button>
        ))}
      </div>

      <div className="section-label">태그</div>
      <div className="chip-row">
        {(meta?.tags ?? []).map((t) => (
          <button
            key={t}
            className={`chip tag ${query.tags.includes(t) ? "active" : ""}`}
            onClick={() => onTag(t)}
          >{t}</button>
        ))}
      </div>

      {/* Kept for visual parity — filters are already real-time. */}
      <button className="search-btn" onClick={() => setQuery({ ...query })}>
        검색
      </button>
    </aside>
  );
}

function clamp(v: number, lo: number, hi: number) {
  if (Number.isNaN(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}
