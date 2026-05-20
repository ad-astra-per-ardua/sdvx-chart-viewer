import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
const SDVX_LEVELS = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    17, 17.5,
    ...Array.from({ length: 30 }, (_, i) => Math.round((18 + i * 0.1) * 10) / 10),
];
function fmtLv(v) {
    return v >= 18 || !Number.isInteger(v) ? v.toFixed(1) : String(v);
}
function stepLv(v, dir) {
    const idx = SDVX_LEVELS.indexOf(v);
    if (idx === -1) {
        return SDVX_LEVELS.reduce((best, lv) => Math.abs(lv - v) < Math.abs(best - v) ? lv : best);
    }
    return SDVX_LEVELS[Math.max(0, Math.min(SDVX_LEVELS.length - 1, idx + dir))];
}
function LevelStepper({ value, onChange }) {
    const valueRef = useRef(value);
    valueRef.current = value;
    const timer = useRef(null);
    const interval = useRef(null);
    const stop = () => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        if (interval.current) {
            clearInterval(interval.current);
            interval.current = null;
        }
    };
    const start = (dir) => {
        stop();
        const step = () => onChange(stepLv(valueRef.current, dir));
        step();
        timer.current = setTimeout(() => {
            interval.current = setInterval(step, 80);
        }, 350);
    };
    useEffect(() => stop, []);
    return (_jsxs("div", { className: "level-stepper", children: [_jsx("button", { onPointerDown: (e) => { e.preventDefault(); start(-1); }, onPointerUp: stop, onPointerLeave: stop, children: "\u2212" }), _jsx("span", { className: "level-val", children: fmtLv(value) }), _jsx("button", { onPointerDown: (e) => { e.preventDefault(); start(+1); }, onPointerUp: stop, onPointerLeave: stop, children: "+" })] }));
}
export default function FilterSidebar({ meta, query, setQuery }) {
    const [localSearch, setLocalSearch] = useState(query.q ?? "");
    const debounceRef = useRef(null);
    useEffect(() => {
        setLocalSearch(query.q ?? "");
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
    }, [query.q]);
    const onSearchChange = (val) => {
        setLocalSearch(val);
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setQuery({ ...query, q: val });
        }, 10);
    };
    const onLevelMin = (v) => setQuery({ ...query, level_min: clamp(v, 1, query.level_max) });
    const onLevelMax = (v) => setQuery({ ...query, level_max: clamp(v, query.level_min, 20.9) });
    const toggle = (arr, val) => arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
    const onDiff = (d) => setQuery({ ...query, difficulties: toggle(query.difficulties, d) });
    const onTag = (t) => setQuery({ ...query, tags: toggle(query.tags, t) });
    const onReset = () => setQuery({
        level_min: 1, level_max: 20.9,
        difficulties: [], tags: [],
        sort: query.sort,
        quick_level: undefined,
        q: "",
    });
    useEffect(() => { }, [meta]);
    return (_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "row-header", children: [_jsx("h3", { children: "\uD544\uD130" }), _jsx("button", { className: "reset-btn", onClick: onReset, children: "\u21BA \uCD08\uAE30\uD654" })] }), _jsx("div", { className: "section-label", children: "\uAC80\uC0C9" }), _jsx("input", { className: "search-input sidebar-search", placeholder: "\uC81C\uBAA9 / \uC544\uD2F0\uC2A4\uD2B8 / \uD0A4\uC6CC\uB4DC", value: localSearch, onChange: (e) => onSearchChange(e.target.value) }), _jsx("div", { className: "section-label", children: "\uB808\uBCA8" }), _jsxs("div", { className: "level-range", children: [_jsx(LevelStepper, { value: query.level_min, onChange: onLevelMin }), _jsx("span", { className: "level-tilde", children: "~" }), _jsx(LevelStepper, { value: query.level_max, onChange: onLevelMax })] }), _jsx("div", { className: "section-label", children: "\uB09C\uC774\uB3C4" }), _jsx("div", { className: "chip-row", children: (meta?.difficulties ?? []).map((d) => (_jsx("button", { "data-diff": d, className: `chip diff ${query.difficulties.includes(d) ? "active" : ""}`, onClick: () => onDiff(d), children: d }, d))) }), _jsx("div", { className: "section-label", children: "\uD0DC\uADF8" }), _jsx("div", { className: "chip-row", children: (meta?.tags ?? []).map((t) => (_jsx("button", { className: `chip tag ${query.tags.includes(t) ? "active" : ""}`, onClick: () => onTag(t), children: t }, t))) })] }));
}
function clamp(v, lo, hi) {
    if (Number.isNaN(v))
        return lo;
    return Math.max(lo, Math.min(hi, v));
}
