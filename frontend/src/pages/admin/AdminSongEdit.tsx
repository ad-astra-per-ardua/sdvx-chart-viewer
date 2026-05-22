import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  adminCreateChart, adminCreateChartImage, adminCreateSong,
  adminCreateTag, adminDeleteChart, adminDeleteChartImage,
  adminDeleteSong, adminGetSong, adminListTags, adminUpdateChart, adminUpdateSong, adminUpload,
} from "../../api/admin";
import type { Chart, ChartImage, ChartPart, Difficulty, SongAdmin, Tag } from "../../types";

const PARTS: { key: ChartPart; label: string }[] = [
  { key: "intro", label: "인트로" },
  { key: "outro", label: "아웃트로" },
  { key: "main",  label: "메인파트" },
  { key: "alt",   label: "대체파트" },
];

const ALL_DIFFS: Difficulty[] =
  ["NOV","ADV","EXH","MXM","INF","GRV","HVN","VVD","XCD","ULT","NBL"];

const LEVEL_OPTIONS: number[] = [
  ...Array.from({ length: 16 }, (_, i) => i + 1),
  17, 17.5,
  ...Array.from({ length: 30 }, (_, i) => Math.round((18 + i * 0.1) * 10) / 10),
];

function LevelSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(parseFloat(e.target.value))}>
      {LEVEL_OPTIONS.map((lv) => (
        <option key={lv} value={lv}>{lv >= 18 ? lv.toFixed(1) : lv}</option>
      ))}
    </select>
  );
}

interface ChartEdit { level: number; tagIds: number[]; jacketUrl: string; }

export default function AdminSongEdit() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();

  const [song, setSong]       = useState<SongAdmin | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [title, setTitle]     = useState("");
  const [artist, setArtist]   = useState("");
  const [keywords, setKeywords] = useState("");
  const [saving, setSaving]   = useState(false);
  const [chartEdits, setChartEdits] = useState<Record<number, ChartEdit>>({});

  const reloadSong = async (sid: number) => {
    const s = await adminGetSong(sid);
    setSong(s);
    setTitle(s.title);
    setArtist(s.artist);
    setKeywords(s.keywords ?? "");
  };

  useEffect(() => {
    if (!song) return;
    const edits: Record<number, ChartEdit> = {};
    for (const c of song.charts) {
      edits[c.id] = { level: c.level, tagIds: c.tags.map((t) => t.id), jacketUrl: c.jacket_url ?? "" };
    }
    setChartEdits(edits);
  }, [song]);

  useEffect(() => {
    adminListTags().then(setAllTags).catch(console.error);
    if (!isNew && id) reloadSong(Number(id)).catch(console.error);
  }, [id]);

  const setChartEdit = (chartId: number, edit: Partial<ChartEdit>) =>
    setChartEdits((cur) => ({ ...cur, [chartId]: { ...cur[chartId], ...edit } }));

  const onCreateSong = async () => {
    if (!title.trim() || !artist.trim()) {
      alert("제목과 아티스트는 필수입니다."); return;
    }
    setSaving(true);
    try {
      const s = await adminCreateSong({ title, artist, keywords });
      nav(`/admin/songs/${s.id}`, { replace: true });
    } catch (e: any) { alert("저장 실패: " + e.message); }
    finally { setSaving(false); }
  };

  const onSaveAll = async () => {
    if (!title.trim() || !artist.trim()) {
      alert("제목과 아티스트는 필수입니다."); return;
    }
    if (!song) return;
    setSaving(true);
    try {
      await adminUpdateSong(song.id, { title, artist, keywords });
      for (const c of song.charts) {
        const edit = chartEdits[c.id];
        if (edit) await adminUpdateChart(c.id, {
          level: edit.level,
          tag_ids: edit.tagIds,
          jacket_url: edit.jacketUrl,
        });
      }
      await reloadSong(song.id);
      alert("저장 완료");
    } catch (e: any) { alert("저장 실패: " + e.message); }
    finally { setSaving(false); }
  };

  const onCreateTag = async () => {
    const name = prompt("새 태그 이름 (영문/숫자, 예: PEAK)")?.trim();
    if (!name) return;
    try {
      const t = await adminCreateTag(name);
      setAllTags((cur) => cur.some((x) => x.id === t.id) ? cur : [...cur, t]);
    } catch (e: any) { alert("태그 생성 실패: " + e.message); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>{isNew ? "+ 새 곡 추가" : `곡 편집: ${song?.title ?? "…"}`}</h2>
        <div className="grow" />
        <button className="ghost" onClick={() => nav("/admin")}>← 목록으로</button>
      </div>

      <section className="card">
        <h3>기본 정보</h3>
        <div className="form-grid">
          <label>제목
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="곡 제목" />
          </label>
          <label>아티스트
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="아티스트" />
          </label>
          <label className="full">검색 키워드 <span className="muted">(일반 유저에게 비공개)</span>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="예: 뇌절 원핸드 SDVX (공백·쉼표 구분)"
              rows={2}
            />
          </label>
        </div>

        {isNew && (
          <div className="form-actions">
            <button className="primary" onClick={onCreateSong} disabled={saving}>
              {saving ? "저장 중…" : "곡 생성"}
            </button>
          </div>
        )}
      </section>

      {!isNew && song && (
        <>
          <ChartManager
            song={song}
            allTags={allTags}
            chartEdits={chartEdits}
            onEditChange={setChartEdit}
            onCreateTag={onCreateTag}
            onReload={() => reloadSong(song.id)}
          />
          <section className="card">
            <div className="form-actions">
              <button className="primary" onClick={onSaveAll} disabled={saving}>
                {saving ? "저장 중…" : "변경 저장"}
              </button>
            </div>
          </section>
          <DangerZone song={song} />
        </>
      )}
    </div>
  );
}


function ChartManager({ song, allTags, chartEdits, onEditChange, onCreateTag, onReload }: {
  song: SongAdmin;
  allTags: Tag[];
  chartEdits: Record<number, ChartEdit>;
  onEditChange: (chartId: number, edit: Partial<ChartEdit>) => void;
  onCreateTag: () => Promise<void>;
  onReload: () => Promise<void> | void;
})
 {
  const used = useMemo(() => new Set(song.charts.map((c) => c.difficulty)), [song.charts]);
  const available = ALL_DIFFS.filter((d) => !used.has(d));
  const [newDiff, setNewDiff] = useState<string>(available[0] ?? "");
  const [newLv, setNewLv]     = useState<number>(15);

  useEffect(() => {
    if (!used.has(newDiff as Difficulty) && available.includes(newDiff as Difficulty)) return;
    setNewDiff(available[0] ?? "");
  }, [song.charts]);

  const onAdd = async () => {
    if (!newDiff) return;
    try {
      await adminCreateChart({ song_id: song.id, difficulty: newDiff, level: Number(newLv) });
      await onReload();
    } catch (e: any) { alert("패턴 추가 실패: " + e.message); }
  };

  const onDelete = async (c: Chart) => {
    if (!confirm(`${c.difficulty} ${c.level} 패턴을 삭제할까요?\n(연결된 패턴 이미지도 모두 삭제됩니다)`)) return;
    try { await adminDeleteChart(c.id); await onReload(); }
    catch (e: any) { alert("삭제 실패: " + e.message); }
  };

  return (
    <section className="card">
      <h3>난이도(패턴) 관리</h3>

      <div className="inline-form">
        <select value={newDiff} onChange={(e) => setNewDiff(e.target.value)}>
          {available.length === 0 && <option value="">(모든 난이도가 이미 등록됨)</option>}
          {available.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <LevelSelect value={newLv} onChange={setNewLv} />
        <button className="primary" onClick={onAdd} disabled={!newDiff}>+ 패턴 추가</button>
      </div>

      <div className="chart-card-grid">
        {song.charts.map((c) => (
          <ChartCard
            key={c.id}
            chart={c}
            level={chartEdits[c.id]?.level ?? c.level}
            tagIds={chartEdits[c.id]?.tagIds ?? c.tags.map((t) => t.id)}
            jacketUrl={chartEdits[c.id]?.jacketUrl ?? c.jacket_url ?? ""}
            onLevelChange={(v) => onEditChange(c.id, { level: v })}
            onTagIdsChange={(ids) => onEditChange(c.id, { tagIds: ids })}
            onJacketChange={(url) => onEditChange(c.id, { jacketUrl: url })}
            allTags={allTags}
            onCreateTag={onCreateTag}
            onDelete={() => onDelete(c)}
          />
        ))}
        {song.charts.length === 0 && (
          <div className="empty">아직 등록된 패턴이 없습니다. 위에서 추가해 주세요.</div>
        )}
      </div>
    </section>
  );
}


function ChartCard({ chart, level, tagIds, jacketUrl, onLevelChange, onTagIdsChange, onJacketChange,
                     allTags, onCreateTag, onDelete }: {
  chart: Chart;
  level: number;
  tagIds: number[];
  jacketUrl: string;
  onLevelChange: (v: number) => void;
  onTagIdsChange: (ids: number[]) => void;
  onJacketChange: (url: string) => void;
  allTags: Tag[];
  onCreateTag: () => Promise<void>;
  onDelete: () => Promise<void> | void;
}) {
  const [images, setImages]           = useState<ChartImage[]>([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [jacketUploading, setJacketUploading] = useState(false);
  const [activePart, setActivePart]   = useState<ChartPart>("main");
  const fileRef       = useRef<HTMLInputElement>(null);
  const jacketFileRef = useRef<HTMLInputElement>(null);
  const deletingIds = useRef<Set<number>>(new Set());

  const reloadImages = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/charts/${chart.id}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      setImages(d.images);
    } finally { setLoading(false); }
  };
  useEffect(() => { reloadImages(); }, [chart.id]);

  const onToggleTag = (tid: number) =>
    onTagIdsChange(tagIds.includes(tid) ? tagIds.filter((x) => x !== tid) : [...tagIds, tid]);

  const partImages = images.filter((img) => img.part === activePart);

  const onUploadImages = async (files: FileList) => {
    setUploading(true);
    try {
      const currentPartCount = images.filter((img) => img.part === activePart).length;
      let idx = currentPartCount;
      for (const f of Array.from(files)) {
        const up = await adminUpload(f);
        await adminCreateChartImage({ chart_id: chart.id, image_url: up.url, order_idx: idx++, part: activePart });
      }
      if (fileRef.current) fileRef.current.value = "";
      await reloadImages();
    } catch (e: any) {
      if (fileRef.current) fileRef.current.value = "";
      alert("이미지 업로드 실패: " + e.message);
    } finally { setUploading(false); }
  };

  const onDeleteImage = async (img: ChartImage) => {
    if (deletingIds.current.has(img.id)) return;
    if (!confirm("이 패턴 이미지를 삭제할까요?")) return;
    deletingIds.current.add(img.id);
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    try {
      await adminDeleteChartImage(img.id);
    } catch (e: any) {
      await reloadImages();
      alert("삭제 실패: " + e.message);
    } finally {
      deletingIds.current.delete(img.id);
    }
  };

  const onUploadJacket = async (f: File) => {
    setJacketUploading(true);
    try {
      const r = await adminUpload(f);
      onJacketChange(r.url);
    } catch (e: any) { alert("자켓 업로드 실패: " + e.message); }
    finally {
      setJacketUploading(false);
      if (jacketFileRef.current) jacketFileRef.current.value = "";
    }
  };

  return (
    <div className="chart-card">
      <div className="chart-card-top">
        <div className="chart-jacket-box">
          {jacketUrl
            ? <img src={jacketUrl} alt="jacket" className="chart-jacket-img" />
            : <div className="chart-jacket-placeholder">자켓 없음</div>
          }
          <input ref={jacketFileRef} type="file" accept="image/*" hidden
                 onChange={(e) => e.target.files?.[0] && onUploadJacket(e.target.files[0])} />
          <button className="secondary jacket-upload-btn" disabled={jacketUploading}
                  onClick={() => jacketFileRef.current?.click()}>
            {jacketUploading ? "…" : jacketUrl ? "변경" : "자켓 업로드"}
          </button>
          {jacketUrl && (
            <button className="ghost jacket-upload-btn" onClick={() => onJacketChange("")}>삭제</button>
          )}
        </div>
        <div className="chart-card-right">
          <div className="chart-card-head">
            <span className={`pill ${chart.difficulty}`}>{chart.difficulty}</span>
            <LevelSelect value={level} onChange={onLevelChange} />
            <button className="danger" onClick={onDelete}>삭제</button>
          </div>
          <div className="chip-row chart-tag-row">
            {allTags.map((t) => (
              <button
                key={t.id}
                className={`chip tag ${tagIds.includes(t.id) ? "active" : ""}`}
                onClick={() => onToggleTag(t.id)}
              >{t.name}</button>
            ))}
            <button className="chip new" onClick={onCreateTag}>+ 새 태그</button>
          </div>
        </div>
      </div>

      <div className="part-selector">
        {PARTS.map(({ key, label }) => (
          <button
            key={key}
            className={`part-btn ${activePart === key ? "active" : ""}`}
            onClick={() => setActivePart(key)}
          >
            {label}
            {images.filter((img) => img.part === key).length > 0 && (
              <span className="part-count">{images.filter((img) => img.part === key).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="chart-images">
        {loading ? <div className="muted">불러오는 중…</div>
          : partImages.length === 0
            ? <div className="muted">이미지 없음</div>
            : partImages.map((img) => (
                <div key={img.id} className="chart-image">
                  <img src={img.image_url} alt="" />
                  <button className="x" title="삭제" onClick={() => onDeleteImage(img)}>×</button>
                </div>
              ))}
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple hidden
             onChange={(e) => { if (e.target.files?.length) onUploadImages(e.target.files); }} />
      <button className="ghost full" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? "업로드 중…" : `+ ${PARTS.find((p) => p.key === activePart)?.label} 이미지 업로드`}
      </button>
    </div>
  );
}


function DangerZone({ song }: { song: SongAdmin }) {
  const nav = useNavigate();
  return (
    <section className="card danger-zone">
      <h3>위험 구역</h3>
      <p className="muted">곡과 함께 모든 패턴 / 패턴 이미지가 함께 삭제됩니다.</p>
      <button className="danger" onClick={async () => {
        if (!confirm(`"${song.title}" 곡을 정말 삭제하시겠습니까?`)) return;
        try { await adminDeleteSong(song.id); nav("/admin"); }
        catch (e: any) { alert("삭제 실패: " + e.message); }
      }}>이 곡 삭제</button>
    </section>
  );
}
