import { jsx as _jsx } from "react/jsx-runtime";
export default function LevelQuickBar({ active, onPick }) {
    return (_jsx("div", { className: "level-quick-bar", children: Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (_jsx("button", { className: active === n ? "active" : "", onClick: () => onPick(active === n ? undefined : n), children: n }, n))) }));
}
