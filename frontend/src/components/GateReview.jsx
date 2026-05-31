export function GateReview({ review }) {
  const scoreClass = review.passed ? "gate-score--pass" : "gate-score--fail";

  return (
    <div className="card gate-card">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <span className={`gate-score ${scoreClass}`}>{review.score.toFixed(1)}</span>
        <div>
          <div style={{ fontWeight: 600 }}>{review.agent} — Attempt {review.attempt}</div>
          <span className={`badge badge--${review.passed ? "completed" : "failed"}`}>
            {review.passed ? "PASSED" : "FAILED"}
          </span>
        </div>
      </div>
      {review.criteria && (
        <div className="criteria-grid">
          {Object.entries(review.criteria).map(([name, { score, reasoning }]) => (
            <div className="criteria-item" key={name}>
              <div className="criteria-name">{name}</div>
              <div className="criteria-score">{score}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {reasoning}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
