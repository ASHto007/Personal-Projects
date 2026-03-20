import { useOutletContext } from "react-router-dom";
import {
  getBatterEntry,
  getBowlerEntry,
  getEconomyRate,
  getRequiredRate,
  getRunRate,
  getStrikeRate,
  getTargetStatus,
  getTotalExtras,
} from "./matchCenterUtils";

function MatchSummaryTab() {
  const { actionError, currentInnings, displayInnings, isAdmin, match } = useOutletContext();

  if (!match || !displayInnings) {
    return null;
  }

  const partnership = displayInnings.partnership || { batters: [], runs: 0, balls: 0 };
  const inningsSnapshots = (match.innings || []).filter((innings) => innings.status !== "pending");
  const strikerStats = getBatterEntry(displayInnings, displayInnings.players.striker);
  const nonStrikerStats = getBatterEntry(displayInnings, displayInnings.players.nonStriker);
  const bowlerStats = getBowlerEntry(displayInnings, displayInnings.players.currentBowler);
  const requiredRate = getRequiredRate(match, currentInnings || displayInnings);
  const targetStatus = getTargetStatus(match, currentInnings || displayInnings);

  return (
    <div className="match-center-stack">
      {actionError ? (
        <section className="sidebar-card">
          <p className="form-error">{actionError}</p>
        </section>
      ) : null}

      <section className="stats-grid">
        <section className="sidebar-card">
          <h3>{isAdmin ? "Live Pair" : "Live Overview"}</h3>
          {!isAdmin ? (
            <div className="score-summary-grid">
              <div className="summary-box">
                <span>Batting Team</span>
                <strong>{displayInnings.battingTeam}</strong>
              </div>
              <div className="summary-box">
                <span>Run Rate</span>
                <strong>{getRunRate(displayInnings)}</strong>
              </div>
              <div className="summary-box">
                <span>Required Rate</span>
                <strong>{requiredRate || "-"}</strong>
              </div>
              <div className="summary-box">
                <span>Extras</span>
                <strong>{getTotalExtras(displayInnings.score)}</strong>
              </div>
              <div className="summary-box">
                <span>Target</span>
                <strong>{targetStatus || "First innings in progress"}</strong>
              </div>
              <div className="summary-box">
                <span>Recent Balls</span>
                <strong>
                  {displayInnings.score.recentBalls.length
                    ? displayInnings.score.recentBalls.join(" ")
                    : "No balls yet"}
                </strong>
              </div>
            </div>
          ) : null}

          <div className="table-list">
            {!isAdmin ? <div className="match-section-divider" /> : null}
            <article className="live-player-card">
              <div className="live-player-topline">
                <span>Striker</span>
                <strong>{strikerStats ? `${strikerStats.runs} (${strikerStats.balls})` : "-"}</strong>
              </div>
              <div className="live-player-name">{displayInnings.players.striker || "Not set"}</div>
              {!isAdmin ? (
                <div className="live-player-subtext">
                  SR {strikerStats ? getStrikeRate(strikerStats) : "0.00"}
                </div>
              ) : null}
            </article>
            <article className="live-player-card">
              <div className="live-player-topline">
                <span>Non-striker</span>
                <strong>
                  {nonStrikerStats ? `${nonStrikerStats.runs} (${nonStrikerStats.balls})` : "-"}
                </strong>
              </div>
              <div className="live-player-name">
                {displayInnings.players.nonStriker || "Not set"}
              </div>
              {!isAdmin ? (
                <div className="live-player-subtext">
                  SR {nonStrikerStats ? getStrikeRate(nonStrikerStats) : "0.00"}
                </div>
              ) : null}
            </article>
            <article className="live-player-card bowler-live-card">
              <div className="live-player-topline">
                <span>Current Bowler</span>
                <strong>
                  {bowlerStats ? `${bowlerStats.overs}-${bowlerStats.runs}-${bowlerStats.wickets}` : "-"}
                </strong>
              </div>
              <div className="live-player-name">
                {displayInnings.players.currentBowler || "Not set"}
              </div>
              <div className="live-player-subtext">
                {bowlerStats
                  ? `${bowlerStats.balls} balls | Econ ${getEconomyRate(bowlerStats)}`
                  : "Bowler figures unavailable"}
              </div>
            </article>
            <div className="table-row">
              <span>Partnership</span>
              <span>
                {partnership.runs} runs ({partnership.balls} balls)
              </span>
            </div>
            <div className="table-row">
              <span>Toss</span>
              <span>
                {match.tossWinner} chose to {match.tossDecision}
              </span>
            </div>
            <div className="table-row">
              <span>Format</span>
              <span>
                {match.format} | {match.overs} overs
              </span>
            </div>
            <div className="table-row">
              <span>Status</span>
              <span>{match.status}</span>
            </div>
            {match.target ? (
              <div className="table-row">
                <span>Target</span>
                <span>{match.target}</span>
              </div>
            ) : null}
            {match.result ? (
              <div className="table-row">
                <span>Result</span>
                <span>{match.result}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="sidebar-card">
          <h3>Innings Snapshot</h3>
          <div className="table-list">
            {inningsSnapshots.map((innings) => (
              <div key={innings.number} className="table-row">
                <span>
                  Innings {innings.number} | {innings.battingTeam}
                </span>
                <span>
                  {innings.score.runs}/{innings.score.wickets} ({innings.score.overs})
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="stats-grid">
        {isAdmin ? (
          <section className="sidebar-card">
            <h3>Admin Workflow</h3>
            <div className="table-list">
              <div className="table-row">
                <span>Players Ready</span>
                <span>
                  {currentInnings?.players?.striker &&
                  currentInnings?.players?.nonStriker &&
                  currentInnings?.players?.currentBowler
                    ? "Yes"
                    : "Set players first"}
                </span>
              </div>
              <div className="table-row">
                <span>Scoring Status</span>
                <span>{currentInnings?.status === "live" ? "Live scoring open" : "Scoring paused"}</span>
              </div>
              <div className="table-row">
                <span>Next Step</span>
                <span>
                  {match.status === "innings-break"
                    ? "Start second innings"
                    : match.status === "completed"
                    ? "Match completed"
                    : "Use console below to score"}
                </span>
              </div>
            </div>
          </section>
        ) : (
          <section className="sidebar-card">
            <h3>Viewer Notes</h3>
            <div className="table-list">
              <div className="table-row">
                <span>Current Innings</span>
                <span>{displayInnings.number}</span>
              </div>
              <div className="table-row">
                <span>Bowling Team</span>
                <span>{displayInnings.bowlingTeam}</span>
              </div>
              <div className="table-row">
                <span>Match State</span>
                <span>{match.result || targetStatus || match.status}</span>
              </div>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}

export default MatchSummaryTab;
