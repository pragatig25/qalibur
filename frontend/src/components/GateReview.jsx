export function GateReview({ review }) {
  return (
    <div className="gate">
      <div className="gate-head">
        <div>
          <div className="who">
            {review.agent} · attempt {review.attempt}
          </div>
          <div className="panel-sub" style={{ margin: 0 }}>
            {review.passed ? "passed" : "rejected"}
          </div>
        </div>
        <div className={`gate-score ${review.passed ? "pass" : "fail"}`}>
          {review.score.toFixed(1)}
          <span style={{ color: "var(--muted)", fontSize: 14, marginLeft: 4 }}>/10</span>
        </div>
      </div>
      {review.criteria && (
        <div className="criteria">
          {Object.entries(review.criteria).map(([name, { score, reasoning }]) => (
            <div className="criterion" key={name}>
              <div className="cn">{name}</div>
              <div className="cv">{score}</div>
              <div className="cr">{reasoning}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
