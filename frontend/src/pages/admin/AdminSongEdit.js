import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminCreateChart, adminCreateChartImage, adminCreateSong, adminCreateTag, adminDeleteChart, adminDeleteChartImage, adminDeleteSong, adminGetSong, adminListTags, adminUpdateChart, adminUpdateSong, adminUpload, } from "../../api/admin";
import { invalidateChartCache, invalidateSongCache } from "../../api/client";
const PARTS = [
    { key: "intro", label: "인트로" },
    { key: "outro", label: "아웃트로" },
    { key: "main", label: "메인파트" },
    { key: "alt", label: "대체파트" },
];
const ALL_DIFFS = ["NOV", "ADV", "EXH", "MXM", "INF", "GRV", "HVN", "VVD", "XCD", "ULT", "NBL"];
const LEVEL_OPTIONS = [
    ...Array.from({ length: 16 }, (_, i) => i + 1),
    17, 17.5,
    ...Array.from({ length: 30 }, (_, i) => Math.round((18 + i * 0.1) * 10) / 10),
];
function LevelSelect({ value, onChange }) {
    return (_jsx("select", { value: value, onChange: (e) => onChange(parseFloat(e.target.value)), children: LEVEL_OPTIONS.map((lv) => (_jsx("option", { value: lv, children: lv >= 18 ? lv.toFixed(1) : lv }, lv))) }));
}
export default function AdminSongEdit() {
    const { id } = useParams();
    const isNew = !id;
    const nav = useNavigate();
    const [song, setSong] = useState(null);
    const [allTags, setAllTags] = useState([]);
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [keywords, setKeywords] = useState("");
    const [saving, setSaving] = useState(false);
    const [chartEdits, setChartEdits] = useState({});
    const reloadSong = async (sid) => {
        const s = await adminGetSong(sid);
        setSong(s);
        setTitle(s.title);
        setArtist(s.artist);
        setKeywords(s.keywords ?? "");
    };
    useEffect(() => {
        if (!song)
            return;
        const edits = {};
        for (const c of song.charts) {
            edits[c.id] = { level: c.level, tagIds: c.tags.map((t) => t.id), jacketUrl: c.jacket_url ?? "" };
        }
        setChartEdits(edits);
    }, [song]);
    useEffect(() => {
        adminListTags().then(setAllTags).catch(console.error);
        if (!isNew && id)
            reloadSong(Number(id)).catch(console.error);
    }, [id]);
    const setChartEdit = (chartId, edit) => setChartEdits((cur) => ({ ...cur, [chartId]: { ...cur[chartId], ...edit } }));
    const onCreateSong = async () => {
        if (!title.trim() || !artist.trim()) {
            alert("제목과 아티스트는 필수입니다.");
            return;
        }
        setSaving(true);
        try {
            const s = await adminCreateSong({ title, artist, keywords });
            nav(`/admin/songs/${s.id}`, { replace: true });
        }
        catch (e) {
            alert("저장 실패: " + e.message);
        }
        finally {
            setSaving(false);
        }
    };
    const onSaveAll = async () => {
        if (!title.trim() || !artist.trim()) {
            alert("제목과 아티스트는 필수입니다.");
            return;
        }
        if (!song)
            return;
        setSaving(true);
        try {
            await adminUpdateSong(song.id, { title, artist, keywords });
            await Promise.all(song.charts.map((c) => {
                const edit = chartEdits[c.id];
                if (!edit)
                    return Promise.resolve();
                return adminUpdateChart(c.id, {
                    level: edit.level,
                    tag_ids: edit.tagIds,
                    jacket_url: edit.jacketUrl,
                });
            }));
            // 클라이언트 캐시 무효화 (이 곡의 모든 채보)
            song.charts.forEach((c) => invalidateChartCache(c.id));
            invalidateSongCache(song.id);
            await reloadSong(song.id);
            alert("저장 완료");
        }
        catch (e) {
            alert("저장 실패: " + e.message);
        }
        finally {
            setSaving(false);
        }
    };
    const onCreateTag = async () => {
        const name = prompt("새 태그 이름 (영문/숫자, 예: PEAK)")?.trim();
        if (!name)
            return;
        try {
            const t = await adminCreateTag(name);
            setAllTags((cur) => cur.some((x) => x.id === t.id) ? cur : [...cur, t]);
        }
        catch (e) {
            alert("태그 생성 실패: " + e.message);
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "admin-toolbar", children: [_jsx("h2", { children: isNew ? "+ 새 곡 추가" : `곡 편집: ${song?.title ?? "…"}` }), _jsx("div", { className: "grow" }), _jsx("button", { className: "ghost", onClick: () => nav("/admin"), children: "\u2190 \uBAA9\uB85D\uC73C\uB85C" })] }), _jsxs("section", { className: "card", children: [_jsx("h3", { children: "\uAE30\uBCF8 \uC815\uBCF4" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["\uC81C\uBAA9", _jsx("input", { value: title, onChange: (e) => setTitle(e.target.value), placeholder: "\uACE1 \uC81C\uBAA9" })] }), _jsxs("label", { children: ["\uC544\uD2F0\uC2A4\uD2B8", _jsx("input", { value: artist, onChange: (e) => setArtist(e.target.value), placeholder: "\uC544\uD2F0\uC2A4\uD2B8" })] }), _jsxs("label", { className: "full", children: ["\uAC80\uC0C9 \uD0A4\uC6CC\uB4DC ", _jsx("span", { className: "muted", children: "(\uC77C\uBC18 \uC720\uC800\uC5D0\uAC8C \uBE44\uACF5\uAC1C)" }), _jsx("textarea", { value: keywords, onChange: (e) => setKeywords(e.target.value), placeholder: "\uC608: \uB1CC\uC808 \uC6D0\uD578\uB4DC SDVX (\uACF5\uBC31\u00B7\uC27C\uD45C \uAD6C\uBD84)", rows: 2 })] })] }), isNew && (_jsx("div", { className: "form-actions", children: _jsx("button", { className: "primary", onClick: onCreateSong, disabled: saving, children: saving ? "저장 중…" : "곡 생성" }) }))] }), !isNew && song && (_jsxs(_Fragment, { children: [_jsx(ChartManager, { song: song, allTags: allTags, chartEdits: chartEdits, onEditChange: setChartEdit, onCreateTag: onCreateTag, onReload: () => reloadSong(song.id) }), _jsx("section", { className: "card", children: _jsx("div", { className: "form-actions", children: _jsx("button", { className: "primary", onClick: onSaveAll, disabled: saving, children: saving ? "저장 중…" : "변경 저장" }) }) }), _jsx(DangerZone, { song: song })] }))] }));
}
function ChartManager({ song, allTags, chartEdits, onEditChange, onCreateTag, onReload }) {
    const used = useMemo(() => new Set(song.charts.map((c) => c.difficulty)), [song.charts]);
    const available = ALL_DIFFS.filter((d) => !used.has(d));
    const [newDiff, setNewDiff] = useState(available[0] ?? "");
    const [newLv, setNewLv] = useState(15);
    useEffect(() => {
        if (!used.has(newDiff) && available.includes(newDiff))
            return;
        setNewDiff(available[0] ?? "");
    }, [song.charts]);
    const onAdd = async () => {
        if (!newDiff)
            return;
        try {
            await adminCreateChart({ song_id: song.id, difficulty: newDiff, level: Number(newLv) });
            await onReload();
        }
        catch (e) {
            alert("패턴 추가 실패: " + e.message);
        }
    };
    const onDelete = async (c) => {
        if (!confirm(`${c.difficulty} ${c.level} 패턴을 삭제할까요?\n(연결된 패턴 이미지도 모두 삭제됩니다)`))
            return;
        try {
            await adminDeleteChart(c.id);
            await onReload();
        }
        catch (e) {
            alert("삭제 실패: " + e.message);
        }
    };
    return (_jsxs("section", { className: "card", children: [_jsx("h3", { children: "\uB09C\uC774\uB3C4(\uD328\uD134) \uAD00\uB9AC" }), _jsxs("div", { className: "inline-form", children: [_jsxs("select", { value: newDiff, onChange: (e) => setNewDiff(e.target.value), children: [available.length === 0 && _jsx("option", { value: "", children: "(\uBAA8\uB4E0 \uB09C\uC774\uB3C4\uAC00 \uC774\uBBF8 \uB4F1\uB85D\uB428)" }), available.map((d) => _jsx("option", { value: d, children: d }, d))] }), _jsx(LevelSelect, { value: newLv, onChange: setNewLv }), _jsx("button", { className: "primary", onClick: onAdd, disabled: !newDiff, children: "+ \uD328\uD134 \uCD94\uAC00" })] }), _jsxs("div", { className: "chart-card-grid", children: [song.charts.map((c) => (_jsx(ChartCard, { chart: c, level: chartEdits[c.id]?.level ?? c.level, tagIds: chartEdits[c.id]?.tagIds ?? c.tags.map((t) => t.id), jacketUrl: chartEdits[c.id]?.jacketUrl ?? c.jacket_url ?? "", onLevelChange: (v) => onEditChange(c.id, { level: v }), onTagIdsChange: (ids) => onEditChange(c.id, { tagIds: ids }), onJacketChange: (url) => onEditChange(c.id, { jacketUrl: url }), allTags: allTags, onCreateTag: onCreateTag, onDelete: () => onDelete(c) }, c.id))), song.charts.length === 0 && (_jsx("div", { className: "empty", children: "\uC544\uC9C1 \uB4F1\uB85D\uB41C \uD328\uD134\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC704\uC5D0\uC11C \uCD94\uAC00\uD574 \uC8FC\uC138\uC694." }))] })] }));
}
function ChartCard({ chart, level, tagIds, jacketUrl, onLevelChange, onTagIdsChange, onJacketChange, allTags, onCreateTag, onDelete }) {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [jacketUploading, setJacketUploading] = useState(false);
    const [activePart, setActivePart] = useState("main");
    const fileRef = useRef(null);
    const jacketFileRef = useRef(null);
    const deletingIds = useRef(new Set());
    const reloadImages = async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/charts/${chart.id}`, { cache: "no-store" });
            if (!r.ok)
                throw new Error(`${r.status}`);
            const d = await r.json();
            setImages(d.images);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { reloadImages(); }, [chart.id]);
    const onToggleTag = (tid) => onTagIdsChange(tagIds.includes(tid) ? tagIds.filter((x) => x !== tid) : [...tagIds, tid]);
    const partImages = images.filter((img) => img.part === activePart);
    const onUploadImages = async (files) => {
        setUploading(true);
        try {
            const baseIdx = images.filter((img) => img.part === activePart).length;
            const fileArr = Array.from(files);
            // 병렬 업로드
            const urls = await Promise.all(fileArr.map((f) => adminUpload(f).then((r) => r.url)));
            await Promise.all(urls.map((url, i) => adminCreateChartImage({ chart_id: chart.id, image_url: url, order_idx: baseIdx + i, part: activePart })));
            if (fileRef.current)
                fileRef.current.value = "";
            await reloadImages();
        }
        catch (e) {
            if (fileRef.current)
                fileRef.current.value = "";
            alert("이미지 업로드 실패: " + e.message);
        }
        finally {
            setUploading(false);
        }
    };
    const onDeleteImage = async (img) => {
        if (deletingIds.current.has(img.id))
            return;
        if (!confirm("이 패턴 이미지를 삭제할까요?"))
            return;
        deletingIds.current.add(img.id);
        setImages((prev) => prev.filter((i) => i.id !== img.id));
        try {
            await adminDeleteChartImage(img.id);
            await reloadImages();
        }
        catch (e) {
            await reloadImages();
            alert("삭제 실패: " + e.message);
        }
        finally {
            deletingIds.current.delete(img.id);
        }
    };
    const onUploadJacket = async (f) => {
        setJacketUploading(true);
        try {
            const r = await adminUpload(f);
            onJacketChange(r.url);
        }
        catch (e) {
            alert("자켓 업로드 실패: " + e.message);
        }
        finally {
            setJacketUploading(false);
            if (jacketFileRef.current)
                jacketFileRef.current.value = "";
        }
    };
    return (_jsxs("div", { className: "chart-card", children: [_jsxs("div", { className: "chart-card-top", children: [_jsxs("div", { className: "chart-jacket-box", children: [jacketUrl
                                ? _jsx("img", { src: jacketUrl, alt: "jacket", className: "chart-jacket-img" })
                                : _jsx("div", { className: "chart-jacket-placeholder", children: "\uC790\uCF13 \uC5C6\uC74C" }), _jsx("input", { ref: jacketFileRef, type: "file", accept: "image/*", hidden: true, onChange: (e) => e.target.files?.[0] && onUploadJacket(e.target.files[0]) }), _jsx("button", { className: "secondary jacket-upload-btn", disabled: jacketUploading, onClick: () => jacketFileRef.current?.click(), children: jacketUploading ? "…" : jacketUrl ? "변경" : "자켓 업로드" }), jacketUrl && (_jsx("button", { className: "ghost jacket-upload-btn", onClick: () => onJacketChange(""), children: "\uC0AD\uC81C" }))] }), _jsxs("div", { className: "chart-card-right", children: [_jsxs("div", { className: "chart-card-head", children: [_jsx("span", { className: `pill ${chart.difficulty}`, children: chart.difficulty }), _jsx(LevelSelect, { value: level, onChange: onLevelChange }), _jsx("button", { className: "danger", onClick: onDelete, children: "\uC0AD\uC81C" })] }), _jsxs("div", { className: "chip-row chart-tag-row", children: [allTags.map((t) => (_jsx("button", { className: `chip tag ${tagIds.includes(t.id) ? "active" : ""}`, onClick: () => onToggleTag(t.id), children: t.name }, t.id))), _jsx("button", { className: "chip new", onClick: onCreateTag, children: "+ \uC0C8 \uD0DC\uADF8" })] })] })] }), _jsx("div", { className: "part-selector", children: PARTS.map(({ key, label }) => (_jsxs("button", { className: `part-btn ${activePart === key ? "active" : ""}`, onClick: () => setActivePart(key), children: [label, images.filter((img) => img.part === key).length > 0 && (_jsx("span", { className: "part-count", children: images.filter((img) => img.part === key).length }))] }, key))) }), _jsx("div", { className: "chart-images", children: loading ? _jsx("div", { className: "muted", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" })
                    : partImages.length === 0
                        ? _jsx("div", { className: "muted", children: "\uC774\uBBF8\uC9C0 \uC5C6\uC74C" })
                        : partImages.map((img) => (_jsxs("div", { className: "chart-image", children: [_jsx("img", { src: img.image_url, alt: "" }), _jsx("button", { className: "x", title: "\uC0AD\uC81C", onClick: () => onDeleteImage(img), children: "\u00D7" })] }, img.id))) }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", multiple: true, hidden: true, onChange: (e) => { if (e.target.files?.length)
                    onUploadImages(e.target.files); } }), _jsx("button", { className: "ghost full", onClick: () => fileRef.current?.click(), disabled: uploading, children: uploading ? "업로드 중…" : `+ ${PARTS.find((p) => p.key === activePart)?.label} 이미지 업로드` })] }));
}
function DangerZone({ song }) {
    const nav = useNavigate();
    return (_jsxs("section", { className: "card danger-zone", children: [_jsx("h3", { children: "\uC704\uD5D8 \uAD6C\uC5ED" }), _jsx("p", { className: "muted", children: "\uACE1\uACFC \uD568\uAED8 \uBAA8\uB4E0 \uD328\uD134 / \uD328\uD134 \uC774\uBBF8\uC9C0\uAC00 \uD568\uAED8 \uC0AD\uC81C\uB429\uB2C8\uB2E4." }), _jsx("button", { className: "danger", onClick: async () => {
                    if (!confirm(`"${song.title}" 곡을 정말 삭제하시겠습니까?`))
                        return;
                    try {
                        await adminDeleteSong(song.id);
                        nav("/admin");
                    }
                    catch (e) {
                        alert("삭제 실패: " + e.message);
                    }
                }, children: "\uC774 \uACE1 \uC0AD\uC81C" })] }));
}
