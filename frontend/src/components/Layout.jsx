import { NavLink, Outlet, Link } from "react-router-dom";
import { api } from "../lib/api.js";

export function Layout() {
  return (
    <>
      <header className="site">
        <div className="wrap bar">
          <Link to="/" className="logo">
            Qali<span>bur</span>
            {api.isDemo() && <span className="demo-pill">Demo mode</span>}
          </Link>
          <nav className="top-nav">
            <NavLink to="/" end>
              Product
            </NavLink>
            <NavLink to="/demo">Demo run</NavLink>
            <NavLink to="/live">Live</NavLink>
            <NavLink to="/runs">Runs</NavLink>
            <a
              className="ghost"
              href="https://github.com/pragatig25/qalibur"
              target="_blank"
              rel="noopener"
            >
              GitHub &#x2197;
            </a>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-foot">
        <div className="wrap">
          <span>
            Qalibur &middot; agentic QE platform &middot; built by{" "}
            <a href="https://pragati-gupta.com" target="_blank" rel="noopener">
              Pragati Gupta
            </a>
          </span>
          <span>Anthropic Claude &middot; Node + React &middot; MIT</span>
        </div>
      </footer>
    </>
  );
}
