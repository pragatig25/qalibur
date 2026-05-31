import { NavLink, Outlet } from "react-router-dom";
import { api } from "../lib/api.js";

export function Layout() {
  return (
    <>
      {api.isDemo() && (
        <div className="demo-banner">
          Demo Mode — showing pre-recorded data, no backend required
        </div>
      )}
      <div className="layout">
        <nav className="sidebar">
          <div className="sidebar-logo">
            <span>Q</span>alibur
          </div>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/run/new">New Run</NavLink>
        </nav>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
