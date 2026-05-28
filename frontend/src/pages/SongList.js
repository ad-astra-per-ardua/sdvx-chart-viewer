import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { startTransition, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, } from "react";
import { Link } from "react-router-dom";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import FilterSidebar from "../components/FilterSidebar";
import LevelQuickBar from "../components/LevelQuickBar";
import SongRow from "../components/SongRow";
import { fetchMeta, fetchSongs } from "../api/client";
const DEFAULT_QUERY = {
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
function applyFilter(all, query) {
    const { level_min, level_max, difficulties, tags, quick_level, sort } = query;
    const diffSet = new Set(difficulties);
    const hasDiff = diffSet.size > 0;
    const hasTag = tags.length > 0;
    const hasLevel = quick_level !== undefined || level_min !== 1 || level_max !== 20.9;
    const out = [];
    for (let i = 0; i < all.length; i++) {
        const song = all[i];
        let charts = song.charts;
        if (hasDiff)
            charts = charts.filter(c => diffSet.has(c.difficulty));
        if (quick_level !== undefined) {
            charts = charts.filter(c => c.level >= quick_level && c.level < quick_level + 1);
        }
        else if (hasLevel) {
            charts = charts.filter(c => c.level >= level_min && c.level <= level_max);
        }
        if (hasTag)
            charts = charts.filter(c => tags.every(t => c.tags.some(ct => ct.name === t)));
        if (charts.length === 0)
            continue;
        let maxLevel = 0;
        for (const c of charts)
            if (c.level > maxLevel)
                maxLevel = c.level;
        out.push({ song: charts === song.charts ? song : { ...song, charts }, maxLevel });
    }
    if (sort === "new")
        return out.map(x => x.song);
    out.sort((a, b) => sort === "level_desc" ? b.maxLevel - a.maxLevel : a.maxLevel - b.maxLevel);
    return out.map(x => x.song);
}
export default function SongList() {
    const [meta, setMeta] = useState(null);
    const [query, setQuery] = useState(DEFAULT_QUERY);
    const [allSongs, setAllSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const ctrl = new AbortController();
        fetchMeta(ctrl.signal).then(setMeta).catch((e) => {
            if (e?.name !== "AbortError")
                console.error(e);
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
            if (e?.name !== "AbortError")
                console.error(e);
        })
            .finally(() => {
            if (!ctrl.signal.aborted)
                setLoading(false);
        });
        return () => ctrl.abort();
    }, [query.q]);
    const deferredQuery = useDeferredValue(query);
    const isPending = query !== deferredQuery;
    const songs = useMemo(() => applyFilter(allSongs, deferredQuery), [allSongs, deferredQuery]);
    const titleTargets = useMemo(() => {
        const map = new Map();
        for (const s of songs) {
            let topId = s.charts[0]?.id;
            let topLevel = s.charts[0]?.level ?? -1;
            for (let i = 1; i < s.charts.length; i++) {
                if (s.charts[i].level > topLevel) {
                    topLevel = s.charts[i].level;
                    topId = s.charts[i].id;
                }
            }
            if (topId !== undefined)
                map.set(s.id, topId);
        }
        return map;
    }, [songs]);
    const listRef = useRef(null);
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
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("div", { className: "discover-header", children: [_jsxs("div", { className: "left", children: [_jsx("div", { className: "label", children: "TOTAL" }), _jsxs("div", { className: "count", children: [songs.length.toLocaleString(), _jsx("span", { className: "unit", children: "\uACE1" })] })] }), _jsxs("div", { className: "sort-tabs", children: [_jsx("button", { className: query.sort === "level_desc" ? "active" : "", onClick: () => setQuery({ ...query, sort: "level_desc" }), children: "Lv \u2193" }), _jsx("button", { className: query.sort === "level_asc" ? "active" : "", onClick: () => setQuery({ ...query, sort: "level_asc" }), children: "Lv \u2191" }), _jsx("button", { className: query.sort === "new" ? "active" : "", onClick: () => setQuery({ ...query, sort: "new" }), children: "\uCD5C\uC2E0" })] }), _jsx(Link, { to: "/megamix", className: "megamix-nav-btn", children: "\uC88B\uC740 \uC2B9\uBD80" })] }), _jsx(LevelQuickBar, { active: query.quick_level, onPick: (lv) => setQuery({ ...query, quick_level: lv }) }), _jsx(FilterSidebar, { meta: meta, query: query, setQuery: setQuery }), _jsx("div", { ref: listRef, className: "song-list", style: {
                    position: "relative",
                    minHeight: loading ? `${ROW_ESTIMATE * 8}px` : undefined,
                    height: songs.length === 0 ? undefined : `${virtualizer.getTotalSize()}px`,
                    opacity: isPending ? 0.6 : undefined,
                    transition: "opacity 0.15s",
                }, children: loading ? (Array.from({ length: 6 }).map((_, i) => (_jsx("div", { className: "song-row skeleton-row", style: {
                        position: "absolute",
                        top: 0, left: 0, width: "100%",
                        transform: `translateY(${i * (ROW_ESTIMATE)}px)`,
                        height: ROW_ESTIMATE - 10,
                    }, "aria-hidden": true }, `sk-${i}`)))) : songs.length === 0 ? (_jsx("div", { className: "empty", children: "\uC870\uAC74\uC5D0 \uB9DE\uB294 \uACE1\uC774 \uC5C6\uC5B4\uC694. \uD544\uD130\uB97C \uD480\uC5B4\uBCF4\uC138\uC694." })) : (virtualItems.map((vi) => {
                    const s = songs[vi.index];
                    return (_jsx("div", { "data-index": vi.index, ref: virtualizer.measureElement, style: {
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            paddingBottom: 10,
                            transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`,
                        }, children: _jsx(SongRow, { song: s, titleTargetChartId: titleTargets.get(s.id) ?? s.charts[0]?.id, priority: vi.index < 3 }) }, vi.key));
                })) })] }));
}
