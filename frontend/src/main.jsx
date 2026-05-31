import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./pages/Landing.jsx";
import { Demo } from "./pages/Demo.jsx";
import { Live } from "./pages/Live.jsx";
import { Runs } from "./pages/Runs.jsx";
import { RunDetail } from "./pages/RunDetail.jsx";
import { RunReport } from "./pages/RunReport.jsx";
import { Layout } from "./components/Layout.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/live" element={<Live />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/run/:id" element={<RunDetail />} />
          <Route path="/run/:id/report" element={<RunReport />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
