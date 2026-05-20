import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, startTransition, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { adminDeleteSong, adminListSongs } from "../../api/admin";
import { buildSearchIndex, normalize } from "../../utils/search";
const ROW_ESTIMATE = 68;
const ROW_OVERSCAN = 10;
const AdminSongRow = memo(function AdminSongRow({ song, onDelete }) {
    const tags = useMemo(() => [...new Map(song.charts.flatMap((c) => c.tags).map((t) => [t.id, t])).values()], [song]);
    const handleDelete = useCallback(() => onDelete(song), [onDelete, song]);
    return (_jsxs("div", { className: "admin-grid-row", children: [_jsx("div", { children: song.jacket_url
                    ? _jsx("img", { src: song.jacket_url, alt: "", className: "thumb", loading: "lazy", decoding: "async" })
                    : _jsx("div", { className: "thumb" }) }), _jsxs("div", { children: [_jsx("div", { className: "t-title", children: song.title }), _jsx("div", { className: "t-artist", children: song.artist })] }), _jsx("div", { children: _jsxs("div", { className: "diff-row", children: [song.charts.map((c) => (_jsxs("span", { className: `pill ${c.difficulty}`, children: [c.difficulty, " ", c.level >= 18 || !Number.isInteger(c.level) ? c.level.toFixed(1) : c.level] }, c.id))), song.charts.length === 0 && _jsx("span", { className: "muted", children: "\u2014" })] }) }), _jsx("div", { children: tags.length > 0
                    ? tags.map((t) => _jsxs("span", { className: "tag-mini", children: ["#", t.name] }, t.id))
                    : _jsx("span", { className: "muted", children: "\u2014" }) }), _jsxs("div", { children: [_jsx(Link, { to: `/admin/songs/${song.id}`, className: "btn ghost", children: "\uD3B8\uC9D1" }), _jsx("button", { className: "btn danger", onClick: handleDelete, children: "\uC0AD\uC81C" })] })] }));
});
export default function AdminSongList() {
    const [allSongs, setAllSongs] = useState([]);
    const [input, setInput] = useState("");
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const nav = useNavigate();
    const deferredQ = useDeferredValue(q);
    const isPending = input !== deferredQ;
    useEffect(() => {
        adminListSongs()
            .then((songs) => startTransition(() => setAllSongs(songs)))
            .catch((e) => alert("불러오기 실패: " + e.message))
            .finally(() => setLoading(false));
    }, []);
    const onChangeSearch = (val) => {
        setInput(val);
        startTransition(() => setQ(val));
    };
    const searchIndex = useMemo(() => buildSearchIndex(allSongs, (s) => `${s.title} ${s.artist} ${s.keywords ?? ""}`), [allSongs]);
    const songs = useMemo(() => {
        const lq = normalize(deferredQ.trim());
        if (!lq)
            return allSongs;
        const out = [];
        for (let i = 0; i < allSongs.length; i++) {
            if (searchIndex[i].includes(lq))
                out.push(allSongs[i]);
        }
        return out;
    }, [allSongs, searchIndex, deferredQ]);
    const onDelete = useCallback(async (s) => {
        if (!confirm(`"${s.title}" 곡을 삭제하시겠습니까?\n(연결된 모든 패턴과 이미지도 함께 삭제됩니다.)`))
            return;
        try {
            await adminDeleteSong(s.id);
            setAllSongs((cur) => cur.filter((x) => x.id !== s.id));
        }
        catch (e) {
            alert("삭제 실패: " + e.message);
        }
    }, []);
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
    const empty = !loading && songs.length === 0;
    const showVirt = !loading && songs.length > 0;
    return (_jsxs("div", { children: [_jsxs("div", { className: "admin-toolbar", children: [_jsxs("h2", { children: ["\uACE1 \uBAA9\uB85D (", loading ? "…" : songs.length, ")"] }), _jsx("div", { className: "grow" }), _jsx("input", { className: "search-input", placeholder: "\uC81C\uBAA9 / \uC544\uD2F0\uC2A4\uD2B8 / \uD0A4\uC6CC\uB4DC \uAC80\uC0C9", value: input, onChange: (e) => onChangeSearch(e.target.value) }), _jsx("button", { className: "primary", onClick: () => nav("/admin/songs/new"), children: "+ \uACE1 \uCD94\uAC00" })] }), _jsxs("div", { className: "admin-grid", children: [_jsxs("div", { className: "admin-grid-head", children: [_jsx("span", { children: "\uC790\uCF13" }), _jsx("span", { children: "\uC81C\uBAA9 / \uC544\uD2F0\uC2A4\uD2B8" }), _jsx("span", { children: "\uB09C\uC774\uB3C4" }), _jsx("span", { children: "\uD0DC\uADF8" }), _jsx("span", { children: "\uC561\uC158" })] }), loading && (_jsx("div", { className: "admin-grid-row is-empty", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" })), empty && (_jsx("div", { className: "admin-grid-row is-empty", children: "\uB4F1\uB85D\uB41C \uACE1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })), showVirt && (_jsx("div", { ref: listRef, style: {
                            position: "relative",
                            height: `${virtualizer.getTotalSize()}px`,
                            opacity: isPending ? 0.6 : undefined,
                            transition: "opacity 0.15s",
                        }, children: virtualItems.map((vi) => {
                            const s = songs[vi.index];
                            return (_jsx("div", { "data-index": vi.index, ref: virtualizer.measureElement, style: {
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`,
                                }, children: _jsx(AdminSongRow, { song: s, onDelete: onDelete }) }, vi.key));
                        }) }))] })] }));
}
