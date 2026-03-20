import { useOutletContext } from "react-router-dom";
import {
  getLeadingBatter,
  getLeadingBowler,
  getRemainingBalls,
  getRequiredRate,
  getRunRate,
  getTargetStatus,
  getTotalExtras,
} from "./matchCenterUtils";

function MatchStatsTab() {
  const { currentInnings, match } = useOutletContext();

  if (!match || !currentInnings) {
    return null;
  }

  const leadBatter = getLeadingBatter(currentInnings);
  const leadBowler = getLeadingBowler(currentInnings);
  const remainingBalls = getRemainingBalls(match, currentInnings);
  const targetStatus = getTargetStatus(match, currentInnings);

  return (
    <div className="match-center-stack">
      <section className="sidebar-card">
        <h3>Live Rates</h3>
        <div className="progress-metrics">
          <div className="metric-pill">
            <span>Run Rate</span>
            <strong>{getRunRate(currentInnings)}</strong>
          </div>
          <div className="metric-pill">
            <span>Required Rate</span>
            <strong>{getRequiredRate(match, currentInnings) || "-"}</strong>
          </div>
          <div className="metric-pill">
            <span>Extras</span>
            <strong>{getTotalExtras(currentInnings.score)}</strong>
          </div>
          <div className="metric-pill">
            <span>Partnership</span>
            <strong>
              {currentInnings.partnership?.runs || 0}/{currentInnings.partnership?.balls || 0}
            </strong>
          </div>
          <div className="metric-pill">
            <span>Remaining Balls</span>
            <strong>{remainingBalls}</strong>
          </div>
          <div className="metric-pill">
            <span>Chase Equation</span>
            <strong>{targetStatus || "Not chasing yet"}</strong>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <section className="sidebar-card">
          <h3>Current Leaders</h3>
          <div className="table-list">
            <div className="table-row">
              <span>Top Batter</span>
              <span>
                {leadBatter
                  ? `${leadBatter.name} ${leadBatter.runs} (${leadBatter.balls})`
                  : "-"}
              </span>
            </div>
            <div className="table-row">
              <span>Best Bowler</span>
              <span>
                {leadBowler
                  ? `${leadBowler.name} ${leadBowler.wickets}/${leadBowler.runs}`
                  : "-"}
              </span>
            </div>
          </div>
        </section>

        <section className="sidebar-card">
          <h3>Extras Breakdown</h3>
          <div className="table-list">
            <div className="table-row">
              <span>Wides</span>
              <span>{currentInnings.score.extras.wides}</span>
            </div>
            <div className="table-row">
              <span>No Balls</span>
              <span>{currentInnings.score.extras.noBalls}</span>
            </div>
            <div className="table-row">
              <span>Byes</span>
              <span>{currentInnings.score.extras.byes}</span>
            </div>
            <div className="table-row">
              <span>Leg Byes</span>
              <span>{currentInnings.score.extras.legByes}</span>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

export default MatchStatsTab;
