import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from sqlalchemy import create_engine, text

DIFF_MAP = {
    "novice":   "NOV",
    "advanced": "ADV",
    "exhaust":  "EXH",
    "maximum":  "MXM",
    "infinite": "INF",
    "gravity":  "GRV",
    "heavenly": "HVN",
    "vivid":    "VVD",
    "exceed":   "XCD",
    "ultimate": "ULT",
    "nabla":    "NBL",
}

_DEFAULT_DB = f"sqlite:///{Path(__file__).parent.parent / 'data' / 'songs.db'}"


def out(msg: str) -> None:
    sys.stdout.buffer.write((msg + "\n").encode("utf-8"))
    sys.stdout.buffer.flush()


def main() -> None:
    if len(sys.argv) < 2:
        out("Usage: python import_songs.py <path/to/data.json>")
        sys.exit(1)

    data_path = Path(sys.argv[1])
    if not data_path.exists():
        out(f"File not found: {data_path}")
        sys.exit(1)

    db_url = os.getenv("DATABASE_URL", _DEFAULT_DB)
    out(f"Reading: {data_path}")
    out(f"DB:      {db_url.split('@')[-1] if '@' in db_url else db_url}")

    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)

    songs = data["songs"]
    out(f"Found {len(songs)} songs")

    engine = create_engine(db_url)
    now = datetime.now(timezone.utc).isoformat()
    inserted_songs = 0
    inserted_charts = 0
    skipped_diffs: set[str] = set()

    with engine.begin() as conn:
        out("Clearing existing data ...")
        conn.execute(text("DELETE FROM chart_tag"))
        conn.execute(text("DELETE FROM chart_images"))
        conn.execute(text("DELETE FROM charts"))
        conn.execute(text("DELETE FROM songs"))
        conn.execute(text("DELETE FROM tags"))
        out("  done.")

        out("Inserting ...")
        for song in songs:
            title  = (song.get("title")  or "").strip()
            artist = (song.get("artist") or "").strip()
            if not title:
                continue

            row = conn.execute(
                text("INSERT INTO songs (title, artist, keywords, created_at)"
                     " VALUES (:title, :artist, '', :now) RETURNING id"),
                {"title": title, "artist": artist, "now": now},
            ).fetchone()
            song_id = row[0]
            inserted_songs += 1

            for sheet in song.get("sheets") or []:
                diff_raw = sheet.get("difficulty", "")
                diff = DIFF_MAP.get(diff_raw)
                if diff is None:
                    skipped_diffs.add(diff_raw)
                    continue

                level = sheet.get("levelValue")
                if level is None:
                    try:
                        level = float(sheet.get("level", 0))
                    except (ValueError, TypeError):
                        level = 0.0

                conn.execute(
                    text("INSERT INTO charts (song_id, difficulty, level, jacket_url)"
                         " VALUES (:sid, :diff, :level, NULL)"
                         " ON CONFLICT DO NOTHING"),
                    {"sid": song_id, "diff": diff, "level": float(level)},
                )
                inserted_charts += 1

    out(f"\nDone!")
    out(f"  Songs:  {inserted_songs}")
    out(f"  Charts: {inserted_charts}")
    if skipped_diffs:
        out(f"  Unknown difficulties (skipped): {skipped_diffs}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        sys.stderr.buffer.write(f"ERROR: {e}\n".encode("utf-8"))
        sys.stderr.buffer.flush()
        import traceback
        traceback.print_exc()
        sys.exit(1)
