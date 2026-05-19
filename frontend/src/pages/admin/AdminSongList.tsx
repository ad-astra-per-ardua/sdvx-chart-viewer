import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminDeleteSong, adminListSongs } from "../../api/admin";
import type {Song, SongAdmin} from "../../types";

export default function AdminSongList() {
  const [songs, setSongs] = useState<SongAdmin[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = (query = q) => {
    setBusy(true);
    adminListSongs(query)
      .then(setSongs)
      .catch((e) => alert("불러오기 실패: " + e.message))
      .finally(() => setBusy(false));
  };

  useEffect(() => { load(""); }, []);

  const onQChange = (val: string) => {
    setQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(val), 300);
  };

  const onDelete = async (s: Song) => {
    if (!confirm(`"${s.title}" 곡을 삭제하시겠습니까?\n(연결된 모든 패턴과 이미지도 함께 삭제됩니다.)`)) return;
    try {
      await adminDeleteSong(s.id);
      setSongs((cur) => cur.filter((x) => x.id !== s.id));
    } catch (e: any) { alert("삭제 실패: " + e.message); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>곡 목록 ({songs.length})</h2>
        <div className="grow" />
        <input
          className="search-input"
          placeholder="제목 / 아티스트 검색"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { if (debounceRef.current) clearTimeout(debounceRef.current); load(q); } }}
        />
        <button className="secondary" onClick={() => load()}>검색</button>
        <button className="primary" onClick={() => nav("/admin/songs/new")}>+ 곡 추가</button>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 60 }}>자켓</th>
            <th>제목 / 아티스트</th>
            <th>난이도</th>
            <th>태그</th>
            <th style={{ width: 160 }}>액션</th>
          </tr>
        </thead>
        <tbody>
          {busy && songs.length === 0 && (
            <tr><td colSpan={5} className="empty">불러오는 중…</td></tr>
          )}
          {!busy && songs.length === 0 && (
            <tr><td colSpan={5} className="empty">등록된 곡이 없습니다.</td></tr>
          )}
          {songs.map((s) => (
            <tr key={s.id}>
              <td>
                {s.jacket_url
                  ? <img src={s.jacket_url} alt="" className="thumb" />
                  : <div className="thumb" />}
              </td>
              <td>
                <div className="t-title">{s.title}</div>
                <div className="t-artist">{s.artist}</div>
              </td>
              <td>
                <div className="diff-row">
                  {s.charts.map((c) => (
                    <span key={c.id} className={`pill ${c.difficulty}`}>
                      {c.difficulty} {Number.isInteger(c.level) ? c.level : c.level.toFixed(1)}
                    </span>
                  ))}
                  {s.charts.length === 0 && <span className="muted">—</span>}
                </div>
              </td>
              <td>
                {(() => {
                  const tags = [...new Map(
                    s.charts.flatMap((c) => c.tags).map((t) => [t.id, t])
                  ).values()];
                  return tags.length > 0
                    ? tags.map((t) => <span key={t.id} className="tag-mini">#{t.name}</span>)
                    : <span className="muted">—</span>;
                })()}
              </td>
              <td>
                <Link to={`/admin/songs/${s.id}`} className="btn ghost">편집</Link>
                <button className="btn danger" onClick={() => onDelete(s)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
