import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { adminCheckSession, adminLogin, adminLogout } from "../../api/admin";
export default function AdminLayout() {
    const [authed, setAuthed] = useState(null);
    const loc = useLocation();
    const nav = useNavigate();
    useEffect(() => {
        adminCheckSession().then(setAuthed);
    }, []);
    useEffect(() => {
        const onUnauth = () => setAuthed(false);
        window.addEventListener("admin-unauthorized", onUnauth);
        return () => window.removeEventListener("admin-unauthorized", onUnauth);
    }, []);
    if (authed === null)
        return null;
    if (!authed)
        return _jsx(AdminLogin, { onAuthed: () => setAuthed(true) });
    const tabs = [
        { to: "/admin", label: "곡 관리", end: true },
        { to: "/admin/tags", label: "태그 관리" },
    ];
    return (_jsxs("div", { className: "admin-shell", children: [_jsxs("header", { className: "admin-header", children: [_jsx("div", { className: "brand", children: "\uD83D\uDEE0 ADMIN" }), _jsx("nav", { className: "admin-tabs", children: tabs.map((t) => {
                            const active = t.end ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
                            return (_jsx(Link, { to: t.to, className: active ? "active" : "", children: t.label }, t.to));
                        }) }), _jsxs("div", { className: "admin-actions", children: [_jsx("button", { className: "ghost", onClick: () => nav("/"), children: "\u2197 \uC0AC\uC774\uD2B8 \uBCF4\uAE30" }), _jsx("button", { className: "ghost", onClick: () => {
                                    adminLogout().then(() => { setAuthed(false); nav("/admin"); });
                                }, children: "\uB85C\uADF8\uC544\uC6C3" })] })] }), _jsx("main", { className: "admin-main", children: _jsx(Outlet, {}) })] }));
}
function AdminLogin({ onAuthed }) {
    const [token, setToken] = useState("");
    const [err, setErr] = useState(null);
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            await adminLogin(token.trim());
            onAuthed();
        }
        catch {
            setErr("토큰이 올바르지 않습니다.");
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsx("div", { className: "admin-login", children: _jsxs("form", { onSubmit: submit, children: [_jsx("h1", { children: "\uAD00\uB9AC\uC790 \uB85C\uADF8\uC778" }), _jsxs("p", { className: "hint", children: ["backend\uC758 ", _jsx("code", { children: "ADMIN_TOKEN" }), " \uAC12\uC744 \uC785\uB825\uD558\uC138\uC694."] }), _jsx("input", { type: "password", autoFocus: true, value: token, placeholder: "admin token", onChange: (e) => setToken(e.target.value) }), err && _jsx("div", { className: "err", children: err }), _jsx("button", { type: "submit", disabled: busy || !token.trim(), children: busy ? "확인 중…" : "로그인" })] }) }));
}
