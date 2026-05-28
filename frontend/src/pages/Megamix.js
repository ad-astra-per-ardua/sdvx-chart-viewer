import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSongs } from "../api/client";
const SLOT_COUNT = 5;
const ALL_DIFFS = ["NOV", "ADV", "EXH", "MXM", "INF", "GRV", "HVN", "VVD", "XCD", "ULT", "NBL"];
const STORAGE_KEY = "megamix-picks-v1";
function loadPicks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            if (Array.isArray(p.self) && p.self.length === SLOT_COUNT &&
                Array.isArray(p.opp) && p.opp.length === SLOT_COUNT)
                return p;
        }
    }
    catch { }
    return {
        self: Array(SLOT_COUNT).fill(null),
        opp: Array(SLOT_COUNT).fill(null),
    };
}
export default function Megamix() {
    const nav = useNavigate();
    const [self, setSelf] = useState(() => loadPicks().self);
    const [opp, setOpp] = useState(() => loadPicks().opp);
    const [picker, setPicker] = useState(null);
    const [searchQ, setSearchQ] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [dragFrom, setDragFrom] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const debounceRef = useRef(null);
    const closeTimerRef = useRef(null);
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ self, opp }));
    }, [self, opp]);
    useEffect(() => {
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        if (!picker || !searchQ.trim()) {
            setResults([]);
            setSearching(false);
            return;
        }
        debounceRef.current = setTimeout(() => {
            setSearching(true);
            fetchSongs({ q: searchQ, sort: "new", limit: 30 })
                .then(({ songs }) => setResults(songs))
                .catch(console.error)
                .finally(() => setSearching(false));
        }, 200);
    }, [searchQ, picker]);
    const openPicker = (side, idx) => {
        if (closeTimerRef.current)
            clearTimeout(closeTimerRef.current);
        setSearchQ("");
        setResults([]);
        setPicker({ side, idx });
    };
    const closePicker = () => {
        if (closeTimerRef.current)
            clearTimeout(closeTimerRef.current);
        setPicker(null);
        setSearchQ("");
        setResults([]);
    };
    const pickSong = (song) => {
        if (!picker)
            return;
        const sidePicks = picker.side === "self" ? self : opp;
        if (sidePicks.some((s) => s?.id === song.id))
            return;
        if (picker.side === "self")
            setSelf((p) => { const n = [...p]; n[picker.idx] = song; return n; });
        else
            setOpp((p) => { const n = [...p]; n[picker.idx] = song; return n; });
        closePicker();
    };
    const clearSlot = (side, idx) => {
        if (side === "self")
            setSelf((p) => { const n = [...p]; n[idx] = null; return n; });
        else
            setOpp((p) => { const n = [...p]; n[idx] = null; return n; });
    };
    const isPicking = (side, idx) => picker?.side === side && picker?.idx === idx;
    const onDragStart = (e, side, idx) => {
        if (isPicking(side, idx)) {
            e.preventDefault();
            return;
        }
        setDragFrom({ side, idx });
        e.dataTransfer.effectAllowed = "move";
    };
    const onDragOver = (e, side, idx) => {
        if (!dragFrom || dragFrom.side !== side) {
            e.dataTransfer.dropEffect = "none";
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverIdx?.side !== side || dragOverIdx?.idx !== idx)
            setDragOverIdx({ side, idx });
    };
    const onDrop = (e, side, toIdx) => {
        e.preventDefault();
        if (!dragFrom || dragFrom.side !== side || dragFrom.idx === toIdx) {
            setDragFrom(null);
            setDragOverIdx(null);
            return;
        }
        const fromIdx = dragFrom.idx;
        const setter = side === "self" ? setSelf : setOpp;
        setter((prev) => {
            const arr = [...prev];
            const [item] = arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, item);
            return arr;
        });
        setDragFrom(null);
        setDragOverIdx(null);
    };
    const onDragEnd = () => { setDragFrom(null); setDragOverIdx(null); };
    const renderSlot = (side, idx, song) => {
        const open = isPicking(side, idx);
        const isDragging = dragFrom?.side === side && dragFrom?.idx === idx;
        const isOver = dragOverIdx?.side === side && dragOverIdx?.idx === idx && !isDragging;
        const sidePicks = side === "self" ? self : opp;
        return (_jsxs("div", { className: `megamix-slot${isDragging ? " dragging" : ""}${isOver ? " drag-over" : ""}`, draggable: true, onDragStart: (e) => onDragStart(e, side, idx), onDragOver: (e) => onDragOver(e, side, idx), onDrop: (e) => onDrop(e, side, idx), onDragEnd: onDragEnd, children: [_jsx("div", { className: "drag-handle", children: "\u283F" }), _jsx("div", { className: "slot-number", children: idx + 1 }), _jsxs("div", { className: "slot-body", children: [song ? (_jsxs("div", { className: "slot-song", children: [_jsx("img", { className: "slot-jacket", src: song.jacket_url || "/no-jacket.png", alt: "", width: 95, height: 95, loading: "lazy", decoding: "async", onError: (e) => { e.currentTarget.src = "/no-jacket.png"; } }), _jsxs("div", { className: "slot-info", children: [_jsx("div", { className: "slot-title", children: song.title }), _jsx("div", { className: "slot-artist", children: song.artist }), _jsx("div", { className: "slot-charts", children: ALL_DIFFS.map((d) => {
                                                const c = song.charts.find((x) => x.difficulty === d);
                                                if (!c)
                                                    return null;
                                                return (_jsxs("div", { className: `chart-pill ${d}`, onClick: () => nav(`/charts/${c.id}`), children: [_jsx("span", { className: "lbl", children: d }), _jsx("span", { className: "lv", children: c.level >= 18 || !Number.isInteger(c.level) ? c.level.toFixed(1) : c.level })] }, d));
                                            }) })] }), _jsx("button", { className: "slot-remove", onClick: () => clearSlot(side, idx), children: "\u2715" })] })) : (_jsx("button", { className: `slot-add${open ? " active" : ""}`, onClick: () => open ? closePicker() : openPicker(side, idx), children: "+ \uACE1 \uC120\uD0DD" })), open && (_jsxs("div", { className: "slot-picker", onDragStart: (e) => e.stopPropagation(), children: [_jsx("input", { autoFocus: true, className: "picker-input", placeholder: "\uC81C\uBAA9 / \uC544\uD2F0\uC2A4\uD2B8 / \uD0A4\uC6CC\uB4DC", value: searchQ, onChange: (e) => setSearchQ(e.target.value), onKeyDown: (e) => e.key === "Escape" && closePicker(), onBlur: () => {
                                        closeTimerRef.current = setTimeout(closePicker, 150);
                                    } }), _jsxs("div", { className: "picker-results", children: [searching && _jsx("div", { className: "picker-state", children: "\uAC80\uC0C9 \uC911\u2026" }), !searching && searchQ && results.length === 0 &&
                                            _jsx("div", { className: "picker-state", children: "\uACB0\uACFC \uC5C6\uC74C" }), !searching && !searchQ &&
                                            _jsx("div", { className: "picker-state", children: "\uAC80\uC0C9\uC5B4\uB97C \uC785\uB825\uD558\uC138\uC694" }), results.map((s) => {
                                            const taken = sidePicks.some((p) => p?.id === s.id);
                                            return (_jsxs("div", { className: `picker-item${taken ? " taken" : ""}`, onMouseDown: !taken ? (e) => e.preventDefault() : undefined, onClick: !taken ? () => pickSong(s) : undefined, children: [_jsx("img", { className: "picker-jacket", src: s.jacket_url || "/no-jacket.png", alt: "", width: 36, height: 36, loading: "lazy", decoding: "async", onError: (e) => { e.currentTarget.src = "/no-jacket.png"; } }), _jsxs("div", { className: "picker-meta", children: [_jsx("div", { className: "picker-title", children: s.title }), _jsx("div", { className: "picker-artist", children: s.artist })] }), taken && _jsx("span", { className: "picker-taken-badge", children: "\uC120\uD0DD\uB428" })] }, s.id));
                                        })] })] }))] })] }, idx));
    };
    return (_jsxs("div", { className: "megamix-shell", children: [_jsxs("div", { className: "megamix-header", children: [_jsx("button", { onClick: () => nav("/"), className: "secondary", children: "\u2190 \uACE1 \uBAA9\uB85D" }), _jsx("h1", { className: "megamix-title", children: "\uBA54\uAC00\uBBF9\uC2A4 \uC120\uACE1 \uB9AC\uC2A4\uD2B8" }), _jsx("button", { className: "secondary", onClick: () => {
                            if (confirm("목록을 모두 초기화하시겠습니까?")) {
                                setSelf(Array(SLOT_COUNT).fill(null));
                                setOpp(Array(SLOT_COUNT).fill(null));
                            }
                        }, children: "\u21BA \uCD08\uAE30\uD654" })] }), _jsx("div", { className: "megamix-panels", children: ["self", "opp"].map((side) => {
                    const picks = side === "self" ? self : opp;
                    return (_jsxs("div", { className: `megamix-panel megamix-${side}`, children: [_jsxs("div", { className: "megamix-panel-head", children: [_jsx("span", { className: "panel-label", children: side === "self" ? "자선곡" : "타선곡" }), _jsxs("span", { className: "panel-count", children: [picks.filter(Boolean).length, " / ", SLOT_COUNT] })] }), _jsx("div", { className: "megamix-slots", children: picks.map((song, idx) => renderSlot(side, idx, song)) })] }, side));
                }) })] }));
}
