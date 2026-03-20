import { useOutletContext } from "react-router-dom";

function MatchScorecardTab() {
  const { firstInnings, match, secondInnings } = useOutletContext();

  if (!match) {
    return null;
  }

  return (
    <div className="match-center-stack">
      <section className="sidebar-card">
        <h3>Match Notes</h3>
        <div className="table-list">
          <div className="table-row">
            <span>Match</span>
            <span>
              {match.teamOne} vs {match.teamTwo}
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

      <section className="stats-grid">
        {[firstInnings, secondInnings].map((innings) =>
          innings ? (
            <section key={innings.number} className="sidebar-card">
              <h3>
                Innings {innings.number}: {innings.battingTeam}
              </h3>
              <div className="innings-score-banner">
                <strong>
                  {innings.score.runs}/{innings.score.wickets}
                </strong>
                <span>{innings.score.overs} overs</span>
              </div>
              <div className="table-list">
                <div className="table-row">
                  <span>Status</span>
                  <span>{innings.status}</span>
                </div>
                {innings.target ? (
                  <div className="table-row">
                    <span>Target</span>
                    <span>{innings.target}</span>
                  </div>
                ) : null}
              </div>

              <h4 className="subheading">Batting</h4>
              <div className="match-scorecard-table">
                <div className="match-scorecard-head">
                  <span>Batter</span>
                  <span>R</span>
                  <span>B</span>
                  <span>SR/Status</span>
                </div>
                {innings.battingCard.length ? (
                  innings.battingCard.map((player) => (
                    <div key={`${innings.number}-${player.name}`} className="match-scorecard-row">
                      <span>{player.name}</span>
                      <span>{player.runs}</span>
                      <span>{player.balls}</span>
                      <span>
                        {player.balls ? ((player.runs / player.balls) * 100).toFixed(2) : "0.00"} |{" "}
                        {player.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>No batting card yet.</p>
                )}
              </div>

              <h4 className="subheading">Bowling</h4>
              <div className="match-scorecard-table">
                <div className="match-scorecard-head">
                  <span>Bowler</span>
                  <span>O</span>
                  <span>R</span>
                  <span>W/Econ</span>
                </div>
                {innings.bowlingCard.length ? (
                  innings.bowlingCard.map((player) => (
                    <div key={`${innings.number}-${player.name}`} className="match-scorecard-row">
                      <span>{player.name}</span>
                      <span>{player.overs}</span>
                      <span>{player.runs}</span>
                      <span>
                        {player.wickets} |{" "}
                        {player.balls ? ((player.runs / player.balls) * 6).toFixed(2) : "0.00"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>No bowling card yet.</p>
                )}
              </div>
            </section>
          ) : null
        )}
      </section>
    </div>
  );
}

export default MatchScorecardTab;
