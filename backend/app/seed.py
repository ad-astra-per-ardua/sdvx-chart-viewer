from datetime import *
from .database import engine, SessionLocal, Base
from . import models


MOCK_SONGS = [
    ("Dement ~After Legend~",     "Cosmograph",
        [("NOV", 6), ("ADV", 13), ("EXH", 16), ("MXM", 18.5)], ["PEAK", "NOTES"]),
    ("Leflector",                 "庭師",
        [("NOV", 6), ("ADV", 13), ("EXH", 16), ("MXM", 18.5)], ["PEAK"]),
    ("It's All Right",            "りりぃろっく feat.ЄИ1GM4",
        [("NOV", 5), ("ADV", 12), ("EXH", 15), ("MXM", 17.0)], ["ONE-HAND"]),
    ("Vanishment for reconstruction", "影虎。",
        [("NOV", 6), ("ADV", 13), ("EXH", 16), ("MXM", 18.5)], ["TSUMAMI", "TRICKY"]),
    ("あすはまたたくほしのように",   "NAMV",
        [("NOV", 6), ("ADV", 13), ("EXH", 16), ("MXM", 18.2)], ["NOTES"]),
    ("Silent Flame, Never Fade",  "不知火フレア",
        [("NOV", 3), ("ADV", 11), ("EXH", 14), ("MXM", 17.5)], ["HAND-TRIP"]),
    ("Smile & Go!!",              "不知火フレア",
        [("NOV", 4), ("ADV", 13), ("EXH", 16), ("MXM", 18.2)], ["ONE-HAND"]),
    ("架空と本当",                  "不知火フレア",
        [("NOV", 2), ("ADV", 9),  ("EXH", 13), ("MXM", 16)],   ["NOTES"]),
    ("Homesick Pt.2&3",           "covered by 不知火フレア",
        [("NOV", 5), ("ADV", 11), ("EXH", 14), ("MXM", 17.0)], ["TSUMAMI"]),
    ("cyanotype",                 "Synthion",
        [("NOV", 6), ("ADV", 13), ("EXH", 16), ("MXM", 18.0)], ["PEAK"]),
    ("Excelsia",                  "ak+q",
        [("NOV", 6), ("ADV", 13), ("EXH", 16), ("MXM", 18.4)], ["PEAK", "TRICKY"]),
    ("G.L.I.T.C.H.",              "Yuta Imai feat. 重音テト",
        [("NOV", 6), ("ADV", 13), ("EXH", 16), ("MXM", 18.4)], ["NOTES"]),
    ("Twilight Drive",            "demo artist A",
        [("NOV", 2), ("ADV", 7),  ("EXH", 10), ("MXM", 13)],   ["ONE-HAND"]),
    ("Neon Pulse",                "demo artist B",
        [("NOV", 1), ("ADV", 5),  ("EXH", 9),  ("MXM", 12)],   ["HAND-TRIP"]),
    ("ULTRAMARINE",               "demo artist C",
        [("NOV", 7), ("ADV", 14), ("EXH", 18), ("MXM", 19.5), ("ULT", 20)], ["PEAK", "TSUMAMI"]),
]

ALL_TAGS = ["NOTES", "PEAK", "TSUMAMI", "TRICKY", "HAND-TRIP", "ONE-HAND"]


def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        tag_map = {}
        for t in ALL_TAGS:
            obj = models.Tag(name=t)
            db.add(obj)
            tag_map[t] = obj
        db.flush()

        now = datetime.now(timezone.utc)
        for idx, (title, artist, charts, tags) in enumerate(MOCK_SONGS):
            song = models.Song(
                title=title,
                artist=artist,
                created_at=now - timedelta(days=idx),
            )
            for diff, lvl in charts:
                chart = models.Chart(difficulty=diff, level=float(lvl))
                for i in range(3):
                    chart.images.append(models.ChartImage(
                        image_url=f"https://picsum.photos/seed/{abs(hash((title, diff, i))) % 10**8}/600/900",
                        order_idx=i,
                    ))
                song.charts.append(chart)
            db.add(song)

        db.commit()
        print(f"Seeded {len(MOCK_SONGS)} songs.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
