import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchSongs } from "../api/client";
import type { Difficulty, Song } from "../types";

const SLOT_COUNT = 5;
const ALL_DIFFS: Difficulty[] =
  ["NOV", "ADV", "EXH", "MXM", "INF", "GRV", "HVN", "VVD", "XCD", "ULT", "NBL"];
const STORAGE_KEY = "megamix-picks-v1";

type Side = "self" | "opp";

function loadPicks(): { self: (Song | null)[]; opp: (Song | null)[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p.self) && p.self.length === SLOT_COUNT &&
          Array.isArray(p.opp)  && p.opp.length  === SLOT_COUNT)
        return p;
    }
  } catch {}
  return {
    self: Array(SLOT_COUNT).fill(null),
    opp:  Array(SLOT_COUNT).fill(null),
  };
}

export default function Megamix() {
  const nav = useNavigate();
  const [self, setSelf] = useState<(Song | null)[]>(() => loadPicks().self);
  const [opp,  setOpp]  = useState<(Song | null)[]>(() => loadPicks().opp);
  const [picker,    setPicker]    = useState<{ side: Side; idx: number } | null>(null);
  const [searchQ,   setSearchQ]   = useState("");
  const [results,   setResults]   = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [dragFrom,    setDragFrom]    = useState<{ side: Side; idx: number } | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<{ side: Side; idx: number } | null>(null);
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ self, opp }));
  }, [self, opp]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!picker || !searchQ.trim()) { setResults([]); setSearching(false); return; }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      fetchSongs({ q: searchQ, sort: "new", limit: 30 })
        .then(({ songs }) => setResults(songs))
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 200);
  }, [searchQ, picker]);

  const openPicker = (side: Side, idx: number) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setSearchQ(""); setResults([]);
    setPicker({ side, idx });
  };

  const closePicker = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setPicker(null); setSearchQ(""); setResults([]);
  };

  const pickSong = (song: Song) => {
    if (!picker) return;
    const sidePicks = picker.side === "self" ? self : opp;
    if (sidePicks.some((s) => s?.id === song.id)) return;
    if (picker.side === "self") setSelf((p) => { const n = [...p]; n[picker.idx] = song; return n; });
    else setOpp((p) => { const n = [...p]; n[picker.idx] = song; return n; });
    closePicker();
  };

  const clearSlot = (side: Side, idx: number) => {
    if (side === "self") setSelf((p) => { const n = [...p]; n[idx] = null; return n; });
    else setOpp((p) => { const n = [...p]; n[idx] = null; return n; });
  };

  const isPicking = (side: Side, idx: number) =>
    picker?.side === side && picker?.idx === idx;

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, side: Side, idx: number) => {
    // don't start drag when interacting with the picker
    if (isPicking(side, idx)) { e.preventDefault(); return; }
    setDragFrom({ side, idx });
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, side: Side, idx: number) => {
    if (!dragFrom || dragFrom.side !== side) { e.dataTransfer.dropEffect = "none"; return; }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx?.side !== side || dragOverIdx?.idx !== idx)
      setDragOverIdx({ side, idx });
  };

  const onDrop = (e: React.DragEvent, side: Side, toIdx: number) => {
    e.preventDefault();
    if (!dragFrom || dragFrom.side !== side || dragFrom.idx === toIdx) {
      setDragFrom(null); setDragOverIdx(null); return;
    }
    const fromIdx = dragFrom.idx;
    const setter = side === "self" ? setSelf : setOpp;
    setter((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
    setDragFrom(null); setDragOverIdx(null);
  };

  const onDragEnd = () => { setDragFrom(null); setDragOverIdx(null); };
  // ───────────────────────────────────────────────────────────────────────────

  const renderSlot = (side: Side, idx: number, song: Song | null) => {
    const open      = isPicking(side, idx);
    const isDragging = dragFrom?.side === side && dragFrom?.idx === idx;
    const isOver    = dragOverIdx?.side === side && dragOverIdx?.idx === idx && !isDragging;
    const sidePicks = side === "self" ? self : opp;

    return (
      <div
        key={idx}
        className={`megamix-slot${isDragging ? " dragging" : ""}${isOver ? " drag-over" : ""}`}
        draggable
        onDragStart={(e) => onDragStart(e, side, idx)}
        onDragOver={(e)  => onDragOver(e, side, idx)}
        onDrop={(e)      => onDrop(e, side, idx)}
        onDragEnd={onDragEnd}
      >
        <div className="drag-handle">⠿</div>
        <div className="slot-number">{idx + 1}</div>
        <div className="slot-body">
          {song ? (
            <div className="slot-song">
              <img className="slot-jacket" src={song.jacket_url} alt="" />
              <div className="slot-info">
                <div className="slot-title">{song.title}</div>
                <div className="slot-artist">{song.artist}</div>
                <div className="slot-charts">
                  {ALL_DIFFS.map((d) => {
                    const c = song.charts.find((x) => x.difficulty === d);
                    if (!c) return null;
                    return (
                      <div key={d} className={`chart-pill ${d}`}
                           onClick={() => nav(`/charts/${c.id}`)}>
                        <span className="lbl">{d}</span>
                        <span className="lv">
                          {c.level >= 18 || !Number.isInteger(c.level) ? c.level.toFixed(1) : c.level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button className="slot-remove" onClick={() => clearSlot(side, idx)}>✕</button>
            </div>
          ) : (
            <button
              className={`slot-add${open ? " active" : ""}`}
              onClick={() => open ? closePicker() : openPicker(side, idx)}
            >+ 곡 선택</button>
          )}
          {open && (
            <div className="slot-picker" onDragStart={(e) => e.stopPropagation()}>
              <input
                autoFocus
                className="picker-input"
                placeholder="제목 / 아티스트 / 키워드"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closePicker()}
                onBlur={() => {
                  closeTimerRef.current = setTimeout(closePicker, 150);
                }}
              />
              <div className="picker-results">
                {searching && <div className="picker-state">검색 중…</div>}
                {!searching && searchQ && results.length === 0 &&
                  <div className="picker-state">결과 없음</div>}
                {!searching && !searchQ &&
                  <div className="picker-state">검색어를 입력하세요</div>}
                {results.map((s) => {
                  const taken = sidePicks.some((p) => p?.id === s.id);
                  return (
                    <div
                      key={s.id}
                      className={`picker-item${taken ? " taken" : ""}`}
                      onMouseDown={!taken ? (e) => e.preventDefault() : undefined}
                      onClick={!taken ? () => pickSong(s) : undefined}
                    >
                      <img className="picker-jacket" src={s.jacket_url} alt="" />
                      <div className="picker-meta">
                        <div className="picker-title">{s.title}</div>
                        <div className="picker-artist">{s.artist}</div>
                      </div>
                      {taken && <span className="picker-taken-badge">선택됨</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="megamix-shell">
      <div className="megamix-header">
        <button onClick={()=>{location.href="/"}} className="secondary">← 곡 목록</button>
        <h1 className="megamix-title">메가믹스 선곡 리스트</h1>
        <button className="secondary" onClick={() => {
          if (confirm("목록을 모두 초기화하시겠습니까?")) {
            setSelf(Array(SLOT_COUNT).fill(null));
            setOpp(Array(SLOT_COUNT).fill(null));
          }
        }}>↺ 초기화</button>
      </div>

      <div className="megamix-panels">
        {(["self", "opp"] as Side[]).map((side) => {
          const picks = side === "self" ? self : opp;
          return (
            <div key={side} className={`megamix-panel megamix-${side}`}>
              <div className="megamix-panel-head">
                <span className="panel-label">{side === "self" ? "자선곡" : "타선곡"}</span>
                <span className="panel-count">{picks.filter(Boolean).length} / {SLOT_COUNT}</span>
              </div>
              <div className="megamix-slots">
                {picks.map((song, idx) => renderSlot(side, idx, song))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
