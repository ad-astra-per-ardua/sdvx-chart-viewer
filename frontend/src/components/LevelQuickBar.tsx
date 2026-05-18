interface Props {
  active?: number;
  onPick: (lv: number | undefined) => void;
}

/**
 * 1~20 quick-filter row.  Clicking a number sets ?quick_level=N which makes
 * the song list show only songs that have a chart at that integer level,
 * and inside each song row only that matching chart is shown.
 */
export default function LevelQuickBar({ active, onPick }: Props) {
  return (
    <div className="level-quick-bar">
      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          className={active === n ? "active" : ""}
          onClick={() => onPick(active === n ? undefined : n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
