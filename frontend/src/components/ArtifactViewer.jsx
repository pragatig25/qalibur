import { useState } from "react";

export function ArtifactViewer({ artifacts }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="empty">
        <p>No artefacts yet — they appear as agents complete.</p>
      </div>
    );
  }

  const active = artifacts[activeIdx];

  return (
    <div className="viewport">
      <div className="vp-chrome">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <em>{active.filename}</em>
      </div>
      <div className="vp-body">
        <h4>
          {active.type
            .split("-")
            .map((w) => w[0].toUpperCase() + w.slice(1))
            .join(" ")}
        </h4>
        <div className="file">
          by <strong>{active.agent}</strong> · {active.filename}
        </div>
        <div className="tabs">
          {artifacts.map((a, i) => (
            <button
              key={a.id || i}
              className={`tab ${i === activeIdx ? "active" : ""}`}
              onClick={() => setActiveIdx(i)}
            >
              {a.agent}
            </button>
          ))}
        </div>
        <pre className="vp-content">{active.content}</pre>
      </div>
    </div>
  );
}
