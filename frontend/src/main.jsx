import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard.jsx";
import { NewRun } from "./pages/NewRun.jsx";
import { RunDetail } from "./pages/RunDetail.jsx";
import { RunReport } from "./pages/RunReport.jsx";
import { Layout } from "./components/Layout.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/run/new" element={<NewRun />} />
          <Route path="/run/:id" element={<RunDetail />} />
          <Route path="/run/:id/report" element={<RunReport />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
