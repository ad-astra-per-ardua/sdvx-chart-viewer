import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { adminAuth, adminLogin } from "../../api/admin";

export default function AdminLayout() {
    const [authed, setAuthed] = useState(!!adminAuth.token);
    const loc = useLocation();
    const nav = useNavigate();

    useEffect(() => { setAuthed(!!adminAuth.token); }, [loc.pathname]);

    if (!authed) return <AdminLogin onAuthed={() => setAuthed(true)} />;

    const tabs = [
        { to: "/admin",       label: "곡 관리", end: true },
        { to: "/admin/tags",  label: "태그 관리" },
    ];

    return (
        <div className="admin-shell">
            <header className="admin-header">
                <div className="brand">🛠 ADMIN</div>
                <nav className="admin-tabs">
                    {tabs.map((t) => {
                        const active = t.end ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
                        return (
                            <Link key={t.to} to={t.to} className={active ? "active" : ""}>{t.label}</Link>
                        );
                    })}
                </nav>
                <div className="admin-actions">
                    <button className="ghost" onClick={() => { location.href = "/"; }}>↗ 사이트 보기</button>
                    <button className="ghost" onClick={() => {
                        adminAuth.clear(); setAuthed(false); nav("/admin");
                    }}>로그아웃</button>
                </div>
            </header>
            <main className="admin-main"><Outlet /></main>
        </div>
    );
}

function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
    const [token, setToken] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true); setErr(null);
        try {
            await adminLogin(token.trim());
            onAuthed();
        } catch {
            setErr("토큰이 올바르지 않습니다.");
        } finally { setBusy(false); }
    };

    return (
        <div className="admin-login">
            <form onSubmit={submit}>
                <h1>관리자 로그인</h1>
                <p className="hint">backend의 <code>ADMIN_TOKEN</code> 값을 입력하세요.</p>
                <input
                    type="password"
                    autoFocus
                    value={token}
                    placeholder="admin token"
                    onChange={(e) => setToken(e.target.value)}
                />
                {err && <div className="err">{err}</div>}
                <button type="submit" disabled={busy || !token.trim()}>
                    {busy ? "확인 중…" : "로그인"}
                </button>
            </form>
        </div>
    );
}
