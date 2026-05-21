import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { getCurrentMatch, getRecentMatches } from "../../services/matchService";
import {
  getLeadingBatter,
  getLeadingBowler,
  getRequiredRate,
  getRunRate,
  getCurrentInnings,
  getDisplayInnings,
  getRemainingBalls,
  getTargetStatus,
  getTotalExtras,
} from "../match/matchCenterUtils";
import TournamentEmptyState from "./TournamentEmptyState";

function TournamentMatchDetails() {
  const { fixtureId } = useParams();
  const { formatDisplayDate, isAdmin, selectedTournament } = useOutletContext();
  const [relatedMatch, setRelatedMatch] = useState(null);
  const fixture = selectedTournament?.schedule?.find((item) => item.id === fixtureId) || null;
  const teamA = selectedTournament?.teams?.find((team) => team.id === fixture?.teamAId) || null;
  const teamB = selectedTournament?.teams?.find((team) => team.id === fixture?.teamBId) || null;
  const backPath = isAdmin ? "/admin/tournaments/schedule" : "/tournaments/schedule";
  const fixtureTeamNames = fixture ? [fixture.teamA, fixture.teamB].sort().join("|") : "";
  const storedMatchData = fixture?.matchRef?.matchData || null;

  useEffect(() => {
    if (!fixture) {
      return undefined;
    }

    let isMounted = true;

    async function loadRelatedMatch() {
      if (storedMatchData) {
        setRelatedMatch(storedMatchData);
        return;
      }

      try {
        const [currentMatchResponse, recentMatchesResponse] = await Promise.allSettled([
          getCurrentMatch(),
          getRecentMatches(),
        ]);

        if (!isMounted) {
          return;
        }

        const currentMatchValue =
          currentMatchResponse.status === "fulfilled" ? currentMatchResponse.value : null;
        const recentMatchesValue =
          recentMatchesResponse.status === "fulfilled" ? recentMatchesResponse.value : [];

        const matchingCurrentMatch = currentMatchValue
          ? [currentMatchValue.teamOne, currentMatchValue.teamTwo].filter(Boolean).sort().join("|") ===
            fixtureTeamNames
            ? currentMatchValue
            : null
          : null;

        const matchingRecentMatch =
          recentMatchesValue.find(
            (match) =>
              [match?.teamOne, match?.teamTwo].filter(Boolean).sort().join("|") === fixtureTeamNames,
          ) || null;

        setRelatedMatch(matchingCurrentMatch || matchingRecentMatch || null);
      } catch {
        if (isMounted) {
          setRelatedMatch(null);
        }
      }
    }

    loadRelatedMatch();

    return () => {
      isMounted = false;
    };
  }, [fixture, fixtureTeamNames, storedMatchData]);

  const relatedMatchScore = !fixture || !relatedMatch?.innings?.length
    ? null
    : (() => {
        const teamAInnings = relatedMatch.innings.find((innings) => innings.battingTeam === fixture.teamA);
        const teamBInnings = relatedMatch.innings.find((innings) => innings.battingTeam === fixture.teamB);

        return {
          status: relatedMatch.status,
          result: relatedMatch.result,
          teamALine: teamAInnings
            ? `${teamAInnings.score.runs}/${teamAInnings.score.wickets} (${teamAInnings.score.overs})`
            : "Yet to bat",
          teamBLine: teamBInnings
            ? `${teamBInnings.score.runs}/${teamBInnings.score.wickets} (${teamBInnings.score.overs})`
            : "Yet to bat",
        };
      })();

  if (!selectedTournament) {
    return <TournamentEmptyState isAdmin={isAdmin} />;
  }

  if (!fixture) {
    return (
      <section className="sidebar-card">
        <h3>Match Not Found</h3>
        <p>This match is not available in the current tournament.</p>
        <Link to={backPath} className="secondary-link">
          Back To Schedule
        </Link>
      </section>
    );
  }

  const fixtureScore = {
    teamALine: fixture.result?.teamAScore || "Score not available",
    teamBLine: fixture.result?.teamBScore || "Score not available",
    status: fixture.status,
    result: fixture.result?.summary || null,
  };
  const displayedScore = relatedMatchScore || fixtureScore;
  const currentInnings = getCurrentInnings(relatedMatch);
  const displayInnings = getDisplayInnings(relatedMatch);
  const headlineScore = displayInnings
    ? `${displayInnings.score.runs}/${displayInnings.score.wickets}`
    : fixture.result?.summary || "Match details";
  const headlineMeta = displayInnings
    ? `${displayInnings.battingTeam} | ${displayInnings.score.overs} ov`
    : `${fixture.groupName || "Match"} | ${formatDisplayDate(fixture.date)} | ${fixture.venue}`;
  const leadBatter = getLeadingBatter(currentInnings);
  const leadBowler = getLeadingBowler(currentInnings);
  const requiredRate = getRequiredRate(relatedMatch, currentInnings);
  const targetStatus = getTargetStatus(relatedMatch, currentInnings);
  const remainingBalls = getRemainingBalls(relatedMatch, currentInnings);
  const commentaryItems = relatedMatch?.innings?.flatMap((innings) => innings.commentary || []) || [];

  return (
    <div className="match-center-stack">
      <section className="sidebar-card scoreboard-card">
        <div className="section-toolbar">
          <div>
            <h3>{fixture.teamA} vs {fixture.teamB}</h3>
            <p>Tournament match center for this specific fixture.</p>
          </div>
          <Link to={backPath} className="secondary-link">
            Back To Schedule
          </Link>
        </div>

        <div className="headline-score">
          <strong>{headlineScore}</strong>
          <span>{headlineMeta}</span>
        </div>

        <div className="score-summary-grid">
          {displayInnings ? (
            <>
              <div className="summary-box">
                <span>Innings</span>
                <strong>{displayInnings.number}</strong>
              </div>
              <div className="summary-box">
                <span>Striker</span>
                <strong>{displayInnings.players.striker || "Not set"}</strong>
              </div>
              <div className="summary-box">
                <span>Bowler</span>
                <strong>{displayInnings.players.currentBowler || "Not set"}</strong>
              </div>
              <div className="summary-box">
                <span>Extras</span>
                <strong>{getTotalExtras(displayInnings.score)}</strong>
              </div>
              <div className="summary-box">
                <span>Partnership</span>
                <strong>
                  {displayInnings.partnership?.runs || 0} ({displayInnings.partnership?.balls || 0})
                </strong>
              </div>
              <div className="summary-box">
                <span>Recent</span>
                <strong>
                  {displayInnings.score.recentBalls.length
                    ? displayInnings.score.recentBalls.join(" ")
                    : "No balls yet"}
                </strong>
              </div>
            </>
          ) : (
            <>
              <div className="summary-box">
                <span>Match</span>
                <strong>{fixture.matchNumber}</strong>
              </div>
              <div className="summary-box">
                <span>Group</span>
                <strong>{fixture.groupName || "-"}</strong>
              </div>
              <div className="summary-box">
                <span>Stage</span>
                <strong>{fixture.stage || "-"}</strong>
              </div>
              <div className="summary-box">
                <span>Date</span>
                <strong>{formatDisplayDate(fixture.date)}</strong>
              </div>
              <div className="summary-box">
                <span>Venue</span>
                <strong>{fixture.venue || "Venue TBA"}</strong>
              </div>
              <div className="summary-box">
                <span>Status</span>
                <strong>{fixture.status}</strong>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="stats-grid">
        {displayInnings ? (
          <section className="sidebar-card">
            <h3>Live Pair</h3>
            <div className="table-list">
              <div className="table-row">
                <span>Striker</span>
                <span>{displayInnings.players.striker || "Not set"}</span>
              </div>
              <div className="table-row">
                <span>Non-Striker</span>
                <span>{displayInnings.players.nonStriker || "Not set"}</span>
              </div>
              <div className="table-row">
                <span>Bowler</span>
                <span>{displayInnings.players.currentBowler || "Not set"}</span>
              </div>
              <div className="table-row">
                <span>Partnership</span>
                <span>
                  {displayInnings.partnership?.runs || 0} ({displayInnings.partnership?.balls || 0})
                </span>
              </div>
              <div className="table-row">
                <span>Recent</span>
                <span>
                  {displayInnings.score.recentBalls.length
                    ? displayInnings.score.recentBalls.join(" ")
                    : "No balls yet"}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="sidebar-card">
          <h3>Match Notes</h3>
          <div className="table-list">
            <div className="team-score-strip active">
              <div className="team-strip-name">
                <span className="team-badge">{fixture.teamA.slice(0, 2).toUpperCase()}</span>
                <strong>{fixture.teamA}</strong>
              </div>
              <div className="team-strip-score">
                <strong>{displayedScore.teamALine}</strong>
                <span>{relatedMatchScore ? "Match center score" : "Fixture score"}</span>
              </div>
            </div>
            <div className="team-score-strip">
              <div className="team-strip-name">
                <span className="team-badge muted-badge">{fixture.teamB.slice(0, 2).toUpperCase()}</span>
                <strong>{fixture.teamB}</strong>
              </div>
              <div className="team-strip-score">
                <strong>{displayedScore.teamBLine}</strong>
                <span>{relatedMatchScore ? "Match center score" : "Fixture score"}</span>
              </div>
            </div>
            <div className="table-list">
              <div className="table-row">
                <span>Fixture</span>
                <span>{fixture.teamA} vs {fixture.teamB}</span>
              </div>
              <div className="table-row">
                <span>Match Status</span>
                <span>{displayedScore.status}</span>
              </div>
              <div className="table-row">
                <span>Summary</span>
                <span>{displayedScore.result || "Result not available yet."}</span>
              </div>
              <div className="table-row">
                <span>Date</span>
                <span>{formatDisplayDate(fixture.date)}</span>
              </div>
              <div className="table-row">
                <span>Venue</span>
                <span>{fixture.venue || "Venue TBA"}</span>
              </div>
              {fixture.result?.winner ? (
                <div className="table-row">
                  <span>Winner</span>
                  <span>{fixture.result.winner}</span>
                </div>
              ) : null}
              {fixture.result?.manOfTheMatch || relatedMatch?.manOfTheMatch ? (
                <div className="table-row">
                  <span>Man Of The Match</span>
                  <span>{fixture.result?.manOfTheMatch || relatedMatch?.manOfTheMatch}</span>
                </div>
              ) : null}
              {relatedMatchScore ? (
                <div className="table-row">
                  <span>Live Center</span>
                  <Link to="/live-score/scorecard" className="secondary-link">
                    Open Live Match Center
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="sidebar-card">
          <h3>{displayInnings ? "Innings Snapshot" : "Tournament Context"}</h3>
          <div className="table-list">
            {relatedMatch?.innings?.length ? (
              relatedMatch.innings.map((innings) => (
                <div key={innings.number} className="table-row">
                  <span>
                    Innings {innings.number} | {innings.battingTeam}
                  </span>
                  <span>
                    {innings.score.runs}/{innings.score.wickets} ({innings.score.overs})
                  </span>
                </div>
              ))
            ) : (
              <>
                <div className="table-row">
                  <span>Tournament</span>
                  <span>{selectedTournament.name}</span>
                </div>
                <div className="table-row">
                  <span>Format</span>
                  <span>{selectedTournament.format}</span>
                </div>
                <div className="table-row">
                  <span>Location</span>
                  <span>{selectedTournament.venue}</span>
                </div>
                <div className="table-row">
                  <span>Tournament Status</span>
                  <span>{selectedTournament.status}</span>
                </div>
              </>
            )}
          </div>
        </section>
      </section>

      {relatedMatch?.innings?.length ? (
        <section className="stats-grid">
          {relatedMatch.innings.map((innings) => (
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

              <h4 className="subheading">Batting</h4>
              <div className="match-scorecard-table">
                <div className="match-scorecard-head">
                  <span>Batter</span>
                  <span>R</span>
                  <span>B</span>
                  <span>Status</span>
                </div>
                {innings.battingCard.length ? (
                  innings.battingCard.map((player) => (
                    <div key={`${innings.number}-${player.name}`} className="match-scorecard-row">
                      <span>{player.name}</span>
                      <span>{player.runs}</span>
                      <span>{player.balls}</span>
                      <span>{player.status}</span>
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
                  <span>W</span>
                </div>
                {innings.bowlingCard.length ? (
                  innings.bowlingCard.map((player) => (
                    <div key={`${innings.number}-${player.name}`} className="match-scorecard-row">
                      <span>{player.name}</span>
                      <span>{player.overs}</span>
                      <span>{player.runs}</span>
                      <span>{player.wickets}</span>
                    </div>
                  ))
                ) : (
                  <p>No bowling card yet.</p>
                )}
              </div>
            </section>
          ))}
        </section>
      ) : null}

      <section className="stats-grid">
        <section className="sidebar-card">
          <h3>Commentary</h3>
          <div className="commentary-list">
            {commentaryItems.length ? (
              commentaryItems
                .slice(0, 12)
                .map((item) => (
                  <article key={item.id} className="commentary-card compact-commentary-card">
                    <div className="commentary-topline">
                      <span className="section-label">
                        Inn {item.inningsNumber} | Over {item.over}
                      </span>
                      <strong>{item.event}</strong>
                    </div>
                    <h4>{item.text}</h4>
                    <div className="commentary-meta">
                      <span>
                        Score {item.totalRuns}/{item.wickets}
                      </span>
                      <span>
                        {item.batter} vs {item.bowler}
                      </span>
                    </div>
                  </article>
                ))
            ) : (
              <p>{fixture.result?.summary || "No commentary available for this fixture yet."}</p>
            )}
          </div>
        </section>

        <section className="sidebar-card">
          <h3>Match Stats</h3>
          <div className="table-list">
            <div className="table-row">
              <span>Run Rate</span>
              <span>{currentInnings ? getRunRate(currentInnings) : "-"}</span>
            </div>
            <div className="table-row">
              <span>Required Rate</span>
              <span>{requiredRate || "-"}</span>
            </div>
            <div className="table-row">
              <span>Chase Equation</span>
              <span>{targetStatus || "Not chasing yet"}</span>
            </div>
            <div className="table-row">
              <span>Remaining Balls</span>
              <span>{remainingBalls || 0}</span>
            </div>
            <div className="table-row">
              <span>Top Batter</span>
              <span>
                {leadBatter ? `${leadBatter.name} ${leadBatter.runs} (${leadBatter.balls})` : "-"}
              </span>
            </div>
            <div className="table-row">
              <span>Best Bowler</span>
              <span>
                {leadBowler ? `${leadBowler.name} ${leadBowler.wickets}/${leadBowler.runs}` : "-"}
              </span>
            </div>
            <div className="table-row">
              <span>Total Extras</span>
              <span>{currentInnings ? getTotalExtras(currentInnings.score) : "-"}</span>
            </div>
          </div>
        </section>
      </section>

      <section className="stats-grid">
        <section className="sidebar-card">
          <h3>{fixture.teamA} Squad</h3>
          <div className="team-chip-list">
            {(teamA?.squad || []).map((player) => (
              <span key={player.id} className="team-chip">
                {player.name}
              </span>
            ))}
            {!teamA?.squad?.length ? <p>Squad not available.</p> : null}
          </div>
        </section>

        <section className="sidebar-card">
          <h3>{fixture.teamB} Squad</h3>
          <div className="team-chip-list">
            {(teamB?.squad || []).map((player) => (
              <span key={player.id} className="team-chip">
                {player.name}
              </span>
            ))}
            {!teamB?.squad?.length ? <p>Squad not available.</p> : null}
          </div>
        </section>
      </section>
    </div>
  );
}

export default TournamentMatchDetails;
