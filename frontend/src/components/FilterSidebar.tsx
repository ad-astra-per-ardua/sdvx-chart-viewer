import { useEffect, useRef, useState } from "react";
import type { Difficulty, FilterMeta, SongQuery } from "../types";

interface Props {
  meta: FilterMeta | null;
  query: SongQuery;
  setQuery: (q: SongQuery) => void;
}

export default function FilterSidebar({ meta, query, setQuery }: Props) {
  const [localSearch, setLocalSearch] = useState(query.q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSearch(query.q ?? "");
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [query.q]);

  const onSearchChange = (val: string) => {
    setLocalSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery({ ...query, q: val });
    }, 10);
  };

  const onLevelMin = (v: number) =>
    setQuery({ ...query, level_min: clamp(v, 1, query.level_max) });
  const onLevelMax = (v: number) =>
    setQuery({ ...query, level_max: clamp(v, query.level_min, 20.9) });

  const toggle = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const onDiff = (d: Difficulty) =>
    setQuery({ ...query, difficulties: toggle(query.difficulties, d) });

  const onTag = (t: string) =>
    setQuery({ ...query, tags: toggle(query.tags, t) });

  const onReset = () =>
    setQuery({
      level_min: 1, level_max: 20.9,
      difficulties: [], tags: [],
      sort: query.sort,
      quick_level: undefined,
      q: "",
    });

  useEffect(() => {}, [meta]);

  return (
    <aside className="sidebar">
      <div className="row-header">
        <h3>고급 필터</h3>
        <button className="reset-btn" onClick={onReset}>↺ 초기화</button>
      </div>

      <div className="section-label">검색</div>
      <input
        className="search-input sidebar-search"
        placeholder="제목 / 아티스트 / 키워드"
        value={localSearch}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <div className="section-label">레벨</div>
      <div className="level-range">
        <input type="number" min={1} max={20.9} value={query.level_min}
               onChange={(e) => onLevelMin(parseInt(e.target.value || "1", 10))} />
        <span>~</span>
        <input type="number" min={1} max={20.9} step={0.1} value={query.level_max}
               onChange={(e) => onLevelMax(parseFloat(e.target.value || "20.9"))} />
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

    </aside>
  );
}

function clamp(v: number, lo: number, hi: number) {
  if (Number.isNaN(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}
