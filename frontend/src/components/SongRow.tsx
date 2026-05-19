import { memo } from "react";
import { useNavigate } from "react-router-dom";
import type { Difficulty, Song } from "../types";

const ALL_DIFFS: Difficulty[] =
  ["NOV", "ADV", "EXH", "MXM", "INF", "GRV", "HVN", "VVD", "XCD", "ULT", "NBL"];

interface Props {
  song: Song;
  titleTargetChartId: number;
}

export default memo(function SongRow({ song, titleTargetChartId }: Props) {
  const nav = useNavigate();
  const byDiff = new Map(song.charts.map((c) => [c.difficulty, c]));

  const jacketUrl = song.jacket_url || song.charts.find((c) => c.jacket_url)?.jacket_url;

  return (
    <div className="song-row">
      {jacketUrl
        ? <img className="jacket" src={jacketUrl} alt="" loading="lazy" />
        : <div className="jacket jacket-empty" />
      }

      <div className="meta">
        <div className="title" onClick={() => nav(`/charts/${titleTargetChartId}`)}>
          {song.title}
        </div>
        <div className="artist">{song.artist}</div>
      </div>

      <div className="chart-pills">
        {ALL_DIFFS.map((d) => {
          const c = byDiff.get(d);
          if (!c) return null;
          return (
            <div
              key={d}
              className={`chart-pill ${d}`}
              onClick={(e) => { e.stopPropagation(); nav(`/charts/${c.id}`); }}
              title={`Go to ${d} ${c.level}`}
            >
              <span className="lbl">{d}</span>
              <span className="lv">{c.level >= 18 || !Number.isInteger(c.level) ? c.level.toFixed(1) : c.level}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
