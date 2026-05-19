"""Import data.json into songs.db (full reset + reimport).

Usage:
  py backend/scripts/import_songs.py D:/11/arcade-songs-fetch/dist/sdvx/data.json
"""
import json
import sqlite3
import sys
from pathlib import Path
from datetime import datetime, timezone

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

DB_PATH = Path(__file__).parent.parent / "data" / "songs.db"


def out(msg: str) -> None:
    sys.stdout.buffer.write((msg + "\n").encode("utf-8"))
    sys.stdout.buffer.flush()


def main() -> None:
    if len(sys.argv) < 2:
        out("Usage: py import_songs.py <path/to/data.json>")
        sys.exit(1)

    data_path = Path(sys.argv[1])
    if not data_path.exists():
        out(f"File not found: {data_path}")
        sys.exit(1)

    out(f"Reading: {data_path}")
    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)

    songs = data["songs"]
    out(f"Found {len(songs)} songs")
    out(f"DB path: {DB_PATH}")

    con = sqlite3.connect(str(DB_PATH))
    con.execute("PRAGMA foreign_keys=ON")
    cur = con.cursor()

    out("Clearing existing data ...")
    cur.execute("DELETE FROM chart_tag")
    cur.execute("DELETE FROM chart_images")
    cur.execute("DELETE FROM charts")
    cur.execute("DELETE FROM songs")
    cur.execute("DELETE FROM tags")
    con.commit()
    out("  done.")

    now = datetime.now(timezone.utc).isoformat()
    inserted_songs = 0
    inserted_charts = 0
    skipped_diffs: set[str] = set()

    out("Inserting ...")
    for song in songs:
        title  = (song.get("title")  or "").strip()
        artist = (song.get("artist") or "").strip()
        if not title:
            continue

        cur.execute(
            "INSERT INTO songs (title, artist, keywords, created_at) VALUES (?, ?, '', ?)",
            (title, artist, now),
        )
        song_id = cur.lastrowid
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

            cur.execute(
                "INSERT OR IGNORE INTO charts (song_id, difficulty, level, jacket_url)"
                " VALUES (?, ?, ?, NULL)",
                (song_id, diff, float(level)),
            )
            inserted_charts += 1

    con.commit()
    con.close()

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
