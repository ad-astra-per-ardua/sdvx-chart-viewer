import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchChart } from "../api/client";
const PARTS = [
    { key: "intro", label: "인트로" },
    { key: "outro", label: "아웃트로" },
    { key: "main", label: "메인파트" },
    { key: "alt", label: "대체파트" },
];
const ZOOM_FACTOR = 2.5;
function Lightbox({ src, onClose }) {
    const [zoomed, setZoomed] = useState(false);
    const [origin, setOrigin] = useState("50% 50%");
    const imgRef = useRef(null);
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") {
                if (zoomed)
                    setZoomed(false);
                else
                    onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [zoomed, onClose]);
    const handleImgClick = (e) => {
        e.stopPropagation();
        if (zoomed) {
            setZoomed(false);
            return;
        }
        const rect = imgRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(2);
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(2);
        setOrigin(`${x}% ${y}%`);
        setZoomed(true);
    };
    return (_jsx("div", { className: "lightbox-overlay", onClick: onClose, children: _jsx("img", { ref: imgRef, className: `lightbox-img${zoomed ? " lb-zoomed" : ""}`, style: { transformOrigin: origin }, src: src, alt: "", onClick: handleImgClick }) }));
}
export default function ChartDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [data, setData] = useState(null);
    const [activePart, setActivePart] = useState("main");
    const [lightboxSrc, setLightboxSrc] = useState(null);
    useEffect(() => {
        if (!id)
            return;
        setActivePart("main");
        fetchChart(Number(id)).then(setData).catch(console.error);
    }, [id]);
    if (!data)
        return _jsx("div", { className: "detail-shell", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" });
    const { song, difficulty, images, tags } = data;
    const jacketUrl = data.jacket_url || song.jacket_url;
    const partImages = images.filter((img) => img.part === activePart);
    return (_jsxs("div", { className: "detail-shell", children: [lightboxSrc && _jsx(Lightbox, { src: lightboxSrc, onClose: () => setLightboxSrc(null) }), _jsx("button", { onClick: () => { location.href = "/"; }, className: "ghost", children: "\u2190 \uBAA9\uB85D\uC73C\uB85C" }), _jsxs("div", { className: "detail-top", children: [jacketUrl
                        ? _jsx("img", { className: "jacket", src: jacketUrl, alt: "" })
                        : _jsx("div", { className: "jacket jacket-empty" }), _jsxs("div", { children: [_jsx("h1", { children: song.title }), _jsx("div", { className: "artist", children: song.artist }), _jsx("div", { className: "badge-row", children: song.charts.map((c) => (_jsxs("div", { className: `badge ${c.difficulty} ${c.difficulty === difficulty ? "active" : ""}`, style: { color: `var(--diff-${c.difficulty})` }, onClick: () => nav(`/charts/${c.id}`), title: `${c.difficulty} ${c.level}`, children: [_jsx("span", { className: "lbl", children: c.difficulty }), _jsx("span", { className: "lv", children: c.level >= 18 || !Number.isInteger(c.level) ? c.level.toFixed(1) : c.level })] }, c.id))) })] })] }), _jsx("div", { className: "part-selector", children: PARTS.map(({ key, label }) => {
                    const hasImages = images.some((img) => img.part === key);
                    const count = images.filter((img) => img.part === key).length;
                    return (_jsxs("button", { className: `part-btn ${activePart === key ? "active" : ""} ${!hasImages ? "empty" : ""}`, onClick: () => setActivePart(key), disabled: !hasImages, children: [label, hasImages && _jsx("span", { className: "part-count", children: count })] }, key));
                }) }), _jsx("div", { className: "image-strip", children: partImages.length === 0
                    ? _jsx("div", { className: "empty", children: "\uC774 \uD30C\uD2B8\uC5D0 \uB4F1\uB85D\uB41C \uC774\uBBF8\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })
                    : partImages.map((img) => (_jsx("img", { className: "strip-img", src: img.image_url, alt: `pattern ${img.order_idx + 1}`, loading: "lazy", decoding: "async", onClick: () => setLightboxSrc(img.image_url) }, img.id))) }), _jsx("div", { className: "tag-strip", children: tags.length === 0
                    ? _jsx("span", { style: { color: "#64748b", fontSize: 12 }, children: "\uB4F1\uB85D\uB41C \uD0DC\uADF8 \uC5C6\uC74C" })
                    : tags.map((t) => _jsxs("span", { className: "tag", children: ["#", t.name] }, t.id)) })] }));
}
