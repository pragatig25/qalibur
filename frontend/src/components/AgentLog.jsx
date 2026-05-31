import { useEffect, useRef } from "react";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AgentLog({ entries }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="agent-log">
      {entries.map((entry, i) => (
        <div className="log-entry" key={i}>
          <span className="log-time">{formatTime(entry.timestamp)}</span>
          <span className="log-agent">{entry.agent}</span>
          <span className={`log-event--${entry.event}`}>{entry.message}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
