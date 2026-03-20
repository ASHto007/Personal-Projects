import { Link, useOutletContext } from "react-router-dom";

function HomeLiveOverviewSection() {
  const {
    currentBowler,
    currentInnings,
    currentMatch,
    currentPartnership,
    getShortName,
    isLiveMatchActive,
    totalMatchExtras,
  } = useOutletContext();

  if (!isLiveMatchActive) {
    return null;
  }

  return (
    <section className="sidebar-card live-match-card">
      <div className="section-label">Live Match</div>
      <div className="cricbuzz-match-panel">
        <div className="match-strip-top">
          <div>
            <h3>
              {currentMatch.teamOne} vs {currentMatch.teamTwo}
            </h3>
            <p>
              {currentMatch.format} | {currentMatch.overs} overs
            </p>
          </div>
          <span className="live-pill">LIVE</span>
        </div>

        <div className="team-score-strip active">
          <div className="team-strip-name">
            <span className="team-badge">
              {getShortName(currentInnings.battingTeam)}
            </span>
            <strong>{currentInnings.battingTeam}</strong>
          </div>
          <div className="team-strip-score">
            <strong>
              {currentInnings.score.runs}/{currentInnings.score.wickets}
            </strong>
            <span>{currentInnings.score.overs} ov</span>
          </div>
        </div>

        <div className="match-strip-footer">
          <span>{currentInnings.players.striker || "Batter not set"} on strike</span>
          <span>
            {currentMatch.target
              ? `Target ${currentMatch.target}`
              : `${currentMatch.tossWinner} chose to ${currentMatch.tossDecision}`}
          </span>
        </div>

        <div className="home-live-insights">
          <div className="summary-box compact-summary-box">
            <span>Current Bowler</span>
            <strong>
              {currentBowler
                ? `${currentBowler.name} ${currentBowler.overs}-${currentBowler.runs}-${currentBowler.wickets}`
                : "Not set"}
            </strong>
          </div>
          <div className="summary-box compact-summary-box">
            <span>Match Extras</span>
            <strong>{totalMatchExtras}</strong>
          </div>
          <div className="summary-box compact-summary-box">
            <span>Partnership</span>
            <strong>
              {currentPartnership
                ? `${currentPartnership.runs} (${currentPartnership.balls})`
                : "0 (0)"}
            </strong>
          </div>
        </div>

        <Link to="/live-score" className="primary-link">
          Open Live Score
        </Link>
      </div>
    </section>
  );
}

export default HomeLiveOverviewSection;
