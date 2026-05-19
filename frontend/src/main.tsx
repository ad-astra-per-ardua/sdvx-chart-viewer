import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import SongList    from "./pages/SongList";
import SongDetail  from "./pages/SongDetail";
import ChartDetail from "./pages/ChartDetail";
import Megamix     from "./pages/Megamix";

import AdminLayout   from "./pages/admin/AdminLayout";
import AdminSongList from "./pages/admin/AdminSongList";
import AdminSongEdit from "./pages/admin/AdminSongEdit";
import AdminTags     from "./pages/admin/AdminTags";

import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
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
    </BrowserRouter>
  </React.StrictMode>
);
