import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { adminCreateTag, adminDeleteTag, adminListTags } from "../../api/admin";
export default function AdminTags() {
    const [tags, setTags] = useState([]);
    const [name, setName] = useState("");
    const load = () => adminListTags().then(setTags).catch(console.error);
    useEffect(() => { load(); }, []);
    const onCreate = async () => {
        const n = name.trim();
        if (!n)
            return;
        try {
            await adminCreateTag(n);
            setName("");
            load();
        }
        catch (e) {
            alert("생성 실패: " + e.message);
        }
    };
    const onDelete = async (t) => {
        if (!confirm(`"${t.name}" 태그를 삭제할까요?\n(곡-태그 연결만 끊어지고 곡은 유지됩니다)`))
            return;
        try {
            await adminDeleteTag(t.id);
            load();
        }
        catch (e) {
            alert("삭제 실패: " + e.message);
        }
    };
    return (_jsxs("div", { children: [_jsx("div", { className: "admin-toolbar", children: _jsxs("h2", { children: ["\uD0DC\uADF8 \uAD00\uB9AC (", tags.length, ")"] }) }), _jsxs("section", { className: "card", children: [_jsx("h3", { children: "\uC0C8 \uD0DC\uADF8" }), _jsxs("div", { className: "inline-form", children: [_jsx("input", { value: name, onChange: (e) => setName(e.target.value), placeholder: "\uC608: PEAK, ONE-HAND, TSUMAMI", onKeyDown: (e) => { if (e.key === "Enter")
                                    onCreate(); } }), _jsx("button", { className: "primary", onClick: onCreate, disabled: !name.trim(), children: "+ \uCD94\uAC00" })] })] }), _jsxs("section", { className: "card", children: [_jsx("h3", { children: "\uB4F1\uB85D\uB41C \uD0DC\uADF8" }), _jsx("div", { className: "chip-row", children: tags.length === 0
                            ? _jsx("div", { className: "muted", children: "\uC544\uC9C1 \uB4F1\uB85D\uB41C \uD0DC\uADF8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })
                            : tags.map((t) => (_jsxs("span", { className: "chip tag deletable", children: ["#", t.name, _jsx("button", { onClick: () => onDelete(t), title: "\uC0AD\uC81C", children: "\u00D7" })] }, t.id))) })] })] }));
}
