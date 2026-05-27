import { useEffect, useRef, useState } from "react";
import type { Difficulty, FilterMeta, SongQuery } from "../types";

const SDVX_LEVELS: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 17.5,
  ...Array.from({ length: 30 }, (_, i) => Math.round((18 + i * 0.1) * 10) / 10),
];

function fmtLv(v: number): string {
  return v >= 18 || !Number.isInteger(v) ? v.toFixed(1) : String(v);
}

function stepLv(v: number, dir: 1 | -1): number {
  const idx = SDVX_LEVELS.indexOf(v);
  if (idx === -1) {
    return SDVX_LEVELS.reduce((best, lv) =>
      Math.abs(lv - v) < Math.abs(best - v) ? lv : best
    );
  }
  return SDVX_LEVELS[Math.max(0, Math.min(SDVX_LEVELS.length - 1, idx + dir))];
}

function LevelStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const timer   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current)    { clearTimeout(timer.current);    timer.current = null; }
    if (interval.current) { clearInterval(interval.current); interval.current = null; }
  };

  const start = (dir: 1 | -1) => {
    stop();
    const step = () => onChange(stepLv(valueRef.current, dir));
    step();
    timer.current = setTimeout(() => {
      interval.current = setInterval(step, 80);
    }, 350);
  };

  useEffect(() => stop, []);

  return (
    <div className="level-stepper">
      <button onPointerDown={(e) => { e.preventDefault(); start(-1); }} onPointerUp={stop} onPointerLeave={stop}>−</button>
      <span className="level-val">{fmtLv(value)}</span>
      <button onPointerDown={(e) => { e.preventDefault(); start(+1); }} onPointerUp={stop} onPointerLeave={stop}>+</button>
    </div>
  );
}

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

  return (
    <aside className="sidebar">
      <div className="row-header">
        <h3>필터</h3>
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
        <LevelStepper value={query.level_min} onChange={onLevelMin} />
        <span className="level-tilde">~</span>
        <LevelStepper value={query.level_max} onChange={onLevelMax} />
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
