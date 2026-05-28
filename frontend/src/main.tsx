import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

import SongList from "./pages/SongList";
import "./styles/global.css";

const SongDetail  = lazy(() => import("./pages/SongDetail"));
const ChartDetail = lazy(() => import("./pages/ChartDetail"));
const Megamix     = lazy(() => import("./pages/Megamix"));

const AdminLayout   = lazy(() => import("./pages/admin/AdminLayout"));
const AdminSongList = lazy(() => import("./pages/admin/AdminSongList"));
const AdminSongEdit = lazy(() => import("./pages/admin/AdminSongEdit"));
const AdminTags     = lazy(() => import("./pages/admin/AdminTags"));

const Fallback = () => <div className="detail-shell">불러오는 중…</div>;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/"           element={<SongList />} />
          <Route path="/megamix"    element={<Megamix />} />
          <Route path="/songs/:id"  element={<SongDetail />} />
          <Route path="/charts/:id" element={<ChartDetail />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index            element={<AdminSongList />} />
            <Route path="songs/new" element={<AdminSongEdit />} />
            <Route path="songs/:id" element={<AdminSongEdit />} />
            <Route path="tags"      element={<AdminTags />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <SpeedInsights />
      <Analytics />
    </BrowserRouter>
  </React.StrictMode>
);
