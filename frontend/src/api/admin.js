async function req(path, init = {}) {
    const headers = {
        ...(init.headers ?? {}),
    };
    if (init.body && !(init.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }
    const r = await fetch(path, { ...init, headers, credentials: "include" });
    if (r.status === 401) {
        window.dispatchEvent(new Event("admin-unauthorized"));
        throw new Error("unauthorized");
    }
    if (!r.ok)
        throw new Error(`${path} -> ${r.status} ${await r.text()}`);
    if (r.status === 204)
        return undefined;
    return r.json();
}
export const adminLogin = (token) => fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    credentials: "include",
}).then((r) => {
    if (!r.ok)
        throw new Error("invalid token");
});
export const adminCheckSession = () => fetch("/api/admin/session", { credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false);
export const adminLogout = () => fetch("/api/admin/logout", { method: "POST", credentials: "include" }).then(() => { });
export const adminListSongs = () => req("/api/admin/songs");
export const adminGetSong = (id) => req(`/api/admin/songs/${id}`);
export const adminCreateSong = (data) => req("/api/admin/songs", { method: "POST", body: JSON.stringify(data) });
export const adminUpdateSong = (id, data) => req(`/api/admin/songs/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const adminDeleteSong = (id) => req(`/api/admin/songs/${id}`, { method: "DELETE" });
export const adminCreateChart = (data) => req("/api/admin/charts", { method: "POST", body: JSON.stringify(data) });
export const adminUpdateChart = (id, data) => req(`/api/admin/charts/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const adminDeleteChart = (id) => req(`/api/admin/charts/${id}`, { method: "DELETE" });
export const adminCreateChartImage = (data) => req("/api/admin/chart-images", { method: "POST", body: JSON.stringify(data) });
export const adminDeleteChartImage = (id) => req(`/api/admin/chart-images/${id}`, { method: "DELETE" });
export const adminListTags = () => req("/api/admin/tags");
export const adminCreateTag = (name) => req("/api/admin/tags", { method: "POST", body: JSON.stringify({ name }) });
export const adminDeleteTag = (id) => req(`/api/admin/tags/${id}`, { method: "DELETE" });
export const adminUpload = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return req("/api/admin/upload", { method: "POST", body: fd });
};
