import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { fetchSong } from "../api/client";
import type { Song } from "../types";

/**
 * Song-level landing page (used when a user navigates directly to /songs/:id).
 * The discover list itself always jumps to /charts/:id — this page exists for
 * deep links / shared URLs.  It auto-redirects to the song's highest chart.
 */
export default function SongDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [song, setSong] = useState<Song | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchSong(Number(id)).then((s) => {
      setSong(s);
      const top = [...s.charts].sort((a, b) => b.level - a.level)[0];
      if (top) nav(`/charts/${top.id}`, { replace: true });
    }).catch(console.error);
  }, [id]);

  if (!song) return <div className="detail-shell">불러오는 중…</div>;
  return (
    <div className="detail-shell">
      <Link to="/" className="back-link">← 목록으로</Link>
      <h1>{song.title}</h1>
    </div>
  );
}
