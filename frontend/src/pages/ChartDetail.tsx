import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchChart } from "../api/client";
import type { ChartDetailDto, ChartPart } from "../types";

const PARTS: { key: ChartPart; label: string }[] = [
  { key: "intro", label: "인트로" },
  { key: "outro", label: "아웃트로" },
  { key: "main",  label: "메인파트" },
  { key: "alt",   label: "대체파트" },
];

/**
 * Pattern (chart) detail page.
 *  Top:    jacket + title + all difficulty badges (current one highlighted)
 *  Body:   horizontally-scrollable strip of pattern images
 *  Footer: saved tags
 */
export default function ChartDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<ChartDetailDto | null>(null);
  const [activePart, setActivePart] = useState<ChartPart>("main");

  useEffect(() => {
    if (!id) return;
    setActivePart("main");
    fetchChart(Number(id)).then(setData).catch(console.error);
  }, [id]);

  if (!data) return <div className="detail-shell">불러오는 중…</div>;
  const { song, difficulty, images, tags } = data;
  const jacketUrl = data.jacket_url || song.jacket_url;
  const partImages = images.filter((img) => img.part === activePart);

  return (
    <div className="detail-shell">
      <Link to="/" className="back-link">← 목록으로</Link>

      <div className="detail-top">
        {jacketUrl
          ? <img className="jacket" src={jacketUrl} alt="" />
          : <div className="jacket jacket-empty" />
        }
        <div>
          <h1>{song.title}</h1>
          <div className="artist">{song.artist}</div>

          <div className="badge-row">
            {song.charts.map((c) => (
              <div
                key={c.id}
                className={`badge ${c.difficulty} ${c.difficulty === difficulty ? "active" : ""}`}
                style={{ color: `var(--diff-${c.difficulty})` }}
                onClick={() => nav(`/charts/${c.id}`)}
                title={`${c.difficulty} ${c.level}`}
              >
                <span className="lbl">{c.difficulty}</span>
                <span className="lv">
                  {Number.isInteger(c.level) ? c.level : c.level.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body: part selector + horizontally scrollable pattern images */}
      <div className="part-selector">
        {PARTS.map(({ key, label }) => {
          const hasImages = images.some((img) => img.part === key);
          return (
            <button
              key={key}
              className={`part-btn ${activePart === key ? "active" : ""} ${!hasImages ? "empty" : ""}`}
              onClick={() => setActivePart(key)}
              disabled={!hasImages}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="image-strip">
        {partImages.length === 0
          ? <div className="empty">이 파트에 등록된 이미지가 없습니다.</div>
          : partImages.map((img) => (
              <img key={img.id} src={img.image_url} alt={`pattern ${img.order_idx + 1}`} loading="lazy" decoding="async" />
            ))}
      </div>

      {/* Footer: saved tags */}
      <div className="tag-strip">
        {tags.length === 0
          ? <span style={{ color: "#64748b", fontSize: 12 }}>등록된 태그 없음</span>
          : tags.map((t) => <span key={t.id} className="tag">#{t.name}</span>)}
      </div>
    </div>
  );
}
