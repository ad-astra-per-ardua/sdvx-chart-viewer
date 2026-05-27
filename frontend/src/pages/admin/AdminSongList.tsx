import {
  memo, startTransition, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { adminDeleteSong, adminListSongs } from "../../api/admin";
import { buildSearchIndex, normalize } from "../../utils/search";
import type { SongAdmin } from "../../types";

const ROW_ESTIMATE = 68;
const ROW_OVERSCAN = 10;

interface RowProps {
  song: SongAdmin;
  onDelete: (s: SongAdmin) => void;
}

const AdminSongRow = memo(function AdminSongRow({ song, onDelete }: RowProps) {
  // Memoize tag de-duplication: the same song object stays referentially stable
  // across filter passes, so this Map build pays its cost exactly once per song
  // rather than on every parent render.
  const tags = useMemo(
    () => [...new Map(
      song.charts.flatMap((c) => c.tags).map((t) => [t.id, t]),
    ).values()],
    [song],
  );

  const handleDelete = useCallback(() => onDelete(song), [onDelete, song]);

  return (
    <div className="admin-grid-row">
      <div>
        {song.jacket_url
          ? <img src={song.jacket_url} alt="" className="thumb" loading="lazy" decoding="async" />
          : <div className="thumb" />}
      </div>
      <div>
        <div className="t-title">{song.title}</div>
        <div className="t-artist">{song.artist}</div>
      </div>
      <div>
        <div className="diff-row">
          {song.charts.map((c) => (
            <span key={c.id} className={`pill ${c.difficulty}`}>
              {c.difficulty} {c.level >= 18 || !Number.isInteger(c.level) ? c.level.toFixed(1) : c.level}
            </span>
          ))}
          {song.charts.length === 0 && <span className="muted">—</span>}
        </div>
      </div>
      <div>
        {tags.length > 0
          ? tags.map((t) => <span key={t.id} className="tag-mini">#{t.name}</span>)
          : <span className="muted">—</span>}
      </div>
      <div>
        <Link to={`/admin/songs/${song.id}`} className="btn ghost">편집</Link>
        <button className="btn danger" onClick={handleDelete}>삭제</button>
      </div>
    </div>
  );
});

export default function AdminSongList() {
  const [allSongs, setAllSongs] = useState<SongAdmin[]>([]);
  const [input,    setInput]    = useState("");
  const [q,        setQ]        = useState("");
  const [loading,  setLoading]  = useState(true);
  const nav = useNavigate();
  const deferredQ = useDeferredValue(q);
  const isPending = input !== deferredQ;

  useEffect(() => {
    adminListSongs()
      .then((songs) => startTransition(() => setAllSongs(songs)))
      .catch((e) => alert("불러오기 실패: " + e.message))
      .finally(() => setLoading(false));
  }, []);

  const onChangeSearch = (val: string) => {
    setInput(val);
    startTransition(() => setQ(val));
  };

  const searchIndex = useMemo(
    () => buildSearchIndex(allSongs, (s) => `${s.title} ${s.artist} ${s.keywords ?? ""}`),
    [allSongs],
  );

  const songs = useMemo(() => {
    const lq = normalize(deferredQ.trim());
    if (!lq) return allSongs;
    const out: SongAdmin[] = [];
    for (let i = 0; i < allSongs.length; i++) {
      if (searchIndex[i].includes(lq)) out.push(allSongs[i]);
    }
    return out;
  }, [allSongs, searchIndex, deferredQ]);

  const onDelete = useCallback(async (s: SongAdmin) => {
    if (!confirm(`"${s.title}" 곡을 삭제하시겠습니까?\n(연결된 모든 패턴과 이미지도 함께 삭제됩니다.)`)) return;
    try {
      await adminDeleteSong(s.id);
      setAllSongs((cur) => cur.filter((x) => x.id !== s.id));
    } catch (e: any) { alert("삭제 실패: " + e.message); }
  }, []);

  const listRef = useRef<HTMLDivElement | null>(null);
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

  const empty   = !loading && songs.length === 0;
  const showVirt = !loading && songs.length > 0;

  return (
    <div>
      <div className="admin-toolbar">
        <h2>곡 목록 ({loading ? "…" : songs.length})</h2>
        <div className="grow" />
        <input
          className="search-input"
          placeholder="제목 / 아티스트 / 키워드 검색"
          value={input}
          onChange={(e) => onChangeSearch(e.target.value)}
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
        {empty && (
          <div className="admin-grid-row is-empty">등록된 곡이 없습니다.</div>
        )}

        {showVirt && (
          <div
            ref={listRef}
            style={{
              position: "relative",
              height: `${virtualizer.getTotalSize()}px`,
              opacity: isPending ? 0.6 : undefined,
              transition: "opacity 0.15s",
            }}
          >
            {virtualItems.map((vi) => {
              const s = songs[vi.index];
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`,
                  }}
                >
                  <AdminSongRow song={s} onDelete={onDelete} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
