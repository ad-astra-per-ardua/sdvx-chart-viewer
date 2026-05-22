import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchChart } from "../api/client";
import type { ChartDetailDto, ChartPart } from "../types";

const PARTS: { key: ChartPart; label: string }[] = [
  { key: "intro", label: "인트로" },
  { key: "outro", label: "아웃트로" },
  { key: "main",  label: "메인파트" },
  { key: "alt",   label: "대체파트" },
];

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomed) setZoomed(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed, onClose]);

  const handleImgClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (zoomed) {
      setZoomed(false);
      return;
    }
    const rect = imgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(2);
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(2);
    setOrigin(`${x}% ${y}%`);
    setZoomed(true);
  };

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <img
        ref={imgRef}
        className={`lightbox-img${zoomed ? " lb-zoomed" : ""}`}
        style={{ transformOrigin: origin }}
        src={src}
        alt=""
        onClick={handleImgClick}
      />
    </div>
  );
}

export default function ChartDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<ChartDetailDto | null>(null);
  const [activePart, setActivePart] = useState<ChartPart>("main");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <button onClick={()=>{location.href="/"}} className="ghost">← 목록으로</button>

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
                  {c.level >= 18 || !Number.isInteger(c.level) ? c.level.toFixed(1) : c.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="part-selector">
        {PARTS.map(({ key, label }) => {
          const hasImages = images.some((img) => img.part === key);
          const count = images.filter((img) => img.part === key).length;
          return (
            <button
              key={key}
              className={`part-btn ${activePart === key ? "active" : ""} ${!hasImages ? "empty" : ""}`}
              onClick={() => setActivePart(key)}
              disabled={!hasImages}
            >
              {label}
              {hasImages && <span className="part-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="image-strip">
        {partImages.length === 0
          ? <div className="empty">이 파트에 등록된 이미지가 없습니다.</div>
          : partImages.map((img) => (
              <img
                key={img.id}
                className="strip-img"
                src={img.image_url}
                alt={`pattern ${img.order_idx + 1}`}
                loading="lazy"
                decoding="async"
                onClick={() => setLightboxSrc(img.image_url)}
              />
            ))}
      </div>

      <div className="tag-strip">
        {tags.length === 0
          ? <span style={{ color: "#64748b", fontSize: 12 }}>등록된 태그 없음</span>
          : tags.map((t) => <span key={t.id} className="tag">#{t.name}</span>)}
      </div>
    </div>
  );
}
