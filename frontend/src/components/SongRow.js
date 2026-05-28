import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
const ALL_DIFFS = ["NOV", "ADV", "EXH", "MXM", "INF", "GRV", "HVN", "VVD", "XCD", "ULT", "NBL"];
const FALLBACK = "/no-jacket.png";
export default memo(function SongRow({ song, titleTargetChartId, priority }) {
    const nav = useNavigate();
    const byDiff = useMemo(() => new Map(song.charts.map((c) => [c.difficulty, c])), [song.charts]);
    const jacketUrl = song.jacket_url || song.charts.find((c) => c.jacket_url)?.jacket_url || FALLBACK;
    return (_jsxs("div", { className: "song-row", children: [_jsx("img", { className: "jacket", src: jacketUrl, alt: "", width: 64, height: 64, loading: priority ? "eager" : "lazy", decoding: priority ? "sync" : "async", ...(priority ? { fetchpriority: "high" } : {}), onError: (e) => {
                    const img = e.currentTarget;
                    if (img.src.endsWith(FALLBACK))
                        return;
                    img.src = FALLBACK;
                } }), _jsxs("div", { className: "meta", children: [_jsx("div", { className: "title", onClick: () => nav(`/charts/${titleTargetChartId}`), children: song.title }), _jsx("div", { className: "artist", children: song.artist })] }), _jsx("div", { className: "chart-pills", children: ALL_DIFFS.map((d) => {
                    const c = byDiff.get(d);
                    if (!c)
                        return null;
                    return (_jsxs("div", { className: `chart-pill ${d}`, onClick: (e) => { e.stopPropagation(); nav(`/charts/${c.id}`); }, title: `Go to ${d} ${c.level}`, children: [_jsx("span", { className: "lbl", children: d }), _jsx("span", { className: "lv", children: c.level >= 18 || !Number.isInteger(c.level) ? c.level.toFixed(1) : c.level })] }, d));
                }) })] }));
});
