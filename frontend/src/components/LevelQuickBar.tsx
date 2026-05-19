interface Props {
  active?: number;
  onPick: (lv: number | undefined) => void;
}

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
