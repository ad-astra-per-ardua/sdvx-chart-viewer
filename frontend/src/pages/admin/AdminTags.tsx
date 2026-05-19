import { useEffect, useState } from "react";
import { adminCreateTag, adminDeleteTag, adminListTags } from "../../api/admin";
import type { Tag } from "../../types";

export default function AdminTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");

  const load = () => adminListTags().then(setTags).catch(console.error);
  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    const n = name.trim();
    if (!n) return;
    try { await adminCreateTag(n); setName(""); load(); }
    catch (e: any) { alert("생성 실패: " + e.message); }
  };

  const onDelete = async (t: Tag) => {
    if (!confirm(`"${t.name}" 태그를 삭제할까요?\n(곡-태그 연결만 끊어지고 곡은 유지됩니다)`)) return;
    try { await adminDeleteTag(t.id); load(); }
    catch (e: any) { alert("삭제 실패: " + e.message); }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <h2>태그 관리 ({tags.length})</h2>
      </div>

      <section className="card">
        <h3>새 태그</h3>
        <div className="inline-form">
          <input value={name} onChange={(e) => setName(e.target.value)}
                 placeholder="예: PEAK, ONE-HAND, TSUMAMI"
                 onKeyDown={(e) => { if (e.key === "Enter") onCreate(); }} />
          <button className="primary" onClick={onCreate} disabled={!name.trim()}>+ 추가</button>
        </div>
      </section>

      <section className="card">
        <h3>등록된 태그</h3>
        <div className="chip-row">
          {tags.length === 0
            ? <div className="muted">아직 등록된 태그가 없습니다.</div>
            : tags.map((t) => (
                <span key={t.id} className="chip tag deletable">
                  #{t.name}
                  <button onClick={() => onDelete(t)} title="삭제">×</button>
                </span>
              ))}
        </div>
      </section>
    </div>
  );
}
