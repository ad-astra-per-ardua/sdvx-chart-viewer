import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminDeleteSong, adminListSongs } from "../../api/admin";
import type { SongAdmin } from "../../types";

export default function AdminSongList() {
  const [allSongs, setAllSongs] = useState<SongAdmin[]>([]);
  const [q, setQ]               = useState("");
  const [loading, setLoading]   = useState(true);
  const nav = useNavigate();

  const deferredQ = useDeferredValue(q);

  useEffect(() => {
    adminListSongs()
      .then((songs) => startTransition(() => setAllSongs(songs)))
      .catch((e) => alert("불러오기 실패: " + e.message))
      .finally(() => setLoading(false));
  }, []);

  const searchIndex = useMemo(
    () => allSongs.map(s => `${s.title} ${s.artist} ${s.keywords}`.toLowerCase()),
    [allSongs],
  );

  const songs = useMemo(() => {
    if (!deferredQ.trim()) return allSongs;
    const lq = deferredQ.toLowerCase();
    return allSongs.filter((_, i) => searchIndex[i].includes(lq));
  }, [allSongs, searchIndex, deferredQ]);

  const onDelete = async (s: SongAdmin) => {
    if (!confirm(`"${s.title}" 곡을 삭제하시겠습니까?\n(연결된 모든 패턴과 이미지도 함께 삭제됩니다.)`)) return;
    try {
      await adminDeleteSong(s.id);
      setAllSongs((cur) => cur.filter((x) => x.id !== s.id));
    } catch (e: any) { alert("삭제 실패: " + e.message); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>곡 목록 ({loading ? "…" : songs.length})</h2>
        <div className="grow" />
        <input
          className="search-input"
          placeholder="제목 / 아티스트 / 키워드 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="primary" onClick={() => nav("/admin/songs/new")}>+ 곡 추가</button>
      </div>

      <div className="admin-grid">
        <div className="admin-grid-head">
          <span>자켓</span>
          <span>제목 / 아티스트</span>
          <span>난이도</span>
          <span>태그</span>
          <span>액션</span>
        </div>

        {loading && (
          <div className="admin-grid-row is-empty">불러오는 중…</div>
        )}
        {!loading && songs.length === 0 && (
          <div className="admin-grid-row is-empty">등록된 곡이 없습니다.</div>
        )}
        {songs.map((s) => (
          <div key={s.id} className="admin-grid-row">
            <div>
              {s.jacket_url
                ? <img src={s.jacket_url} alt="" className="thumb" />
                : <div className="thumb" />}
            </div>
            <div>
              <div className="t-title">{s.title}</div>
              <div className="t-artist">{s.artist}</div>
            </div>
            <div>
              <div className="diff-row">
                {s.charts.map((c) => (
                  <span key={c.id} className={`pill ${c.difficulty}`}>
                    {c.difficulty} {c.level >= 18 || !Number.isInteger(c.level) ? c.level.toFixed(1) : c.level}
                  </span>
                ))}
                {s.charts.length === 0 && <span className="muted">—</span>}
              </div>
            </div>
            <div>
              {(() => {
                const tags = [...new Map(
                  s.charts.flatMap((c) => c.tags).map((t) => [t.id, t])
                ).values()];
                return tags.length > 0
                  ? tags.map((t) => <span key={t.id} className="tag-mini">#{t.name}</span>)
                  : <span className="muted">—</span>;
              })()}
            </div>
            <div>
              <Link to={`/admin/songs/${s.id}`} className="btn ghost">편집</Link>
              <button className="btn danger" onClick={() => onDelete(s)}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
