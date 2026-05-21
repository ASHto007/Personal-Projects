import { useOutletContext } from "react-router-dom";

function HomeResultsSection() {
  const { recentMatches, getMatchLabel, getTeamScoreLine, formatDisplayDate } =
    useOutletContext();

  if (!recentMatches.length) {
    return null;
  }

  return (
    <section className="sidebar-card">
      <div className="section-label">Recent Results</div>
      <div className="recent-results-grid">
        {recentMatches.map((matchItem) => (
          <div key={matchItem.id} className="recent-result-row">
            <div className="recent-result-main">
              <span className="recent-result-kicker">{getMatchLabel(matchItem)}</span>
              <strong className="recent-result-title">
                {matchItem.teamOne} vs {matchItem.teamTwo}
              </strong>
              <div className="recent-score-lines">
                <div className="recent-score-line">
                  <span className="recent-team-name">{matchItem.teamOne}</span>
                  <strong>{getTeamScoreLine(matchItem, matchItem.teamOne)}</strong>
                </div>
                <div className="recent-score-line">
                  <span className="recent-team-name">{matchItem.teamTwo}</span>
                  <strong>{getTeamScoreLine(matchItem, matchItem.teamTwo)}</strong>
                </div>
              </div>
              {matchItem.manOfTheMatch ? (
                <p className="fixture-result-text">
                  Man of the match: <strong>{matchItem.manOfTheMatch}</strong>
                </p>
              ) : null}
            </div>
            <div className="recent-result-meta">
              <span className="recent-result-badge">
                {matchItem.result || "Result pending"}
              </span>
              {formatDisplayDate(matchItem.createdAt) ? (
                <small>{formatDisplayDate(matchItem.createdAt)}</small>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HomeResultsSection;
