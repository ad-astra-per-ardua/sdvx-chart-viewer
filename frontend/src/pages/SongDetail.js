import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchSong } from "../api/client";
export default function SongDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [song, setSong] = useState(null);
    useEffect(() => {
        if (!id)
            return;
        fetchSong(Number(id)).then((s) => {
            setSong(s);
            const top = [...s.charts].sort((a, b) => b.level - a.level)[0];
            if (top)
                nav(`/charts/${top.id}`, { replace: true });
        }).catch(console.error);
    }, [id]);
    if (!song)
        return _jsx("div", { className: "detail-shell", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" });
    return (_jsxs("div", { className: "detail-shell", children: [_jsx("button", { onClick: () => { location.href = "/"; }, className: "Ghost", children: "\u2190 \uBAA9\uB85D\uC73C\uB85C" }), _jsx("h1", { children: song.title })] }));
}
