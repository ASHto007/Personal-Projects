import { useEffect, useState } from "react";
import {
  completeCurrentInnings,
  getCurrentMatch,
  startSecondInnings,
  undoLastBall,
  updateCurrentMatchPlayers,
  updateCurrentMatchScore,
} from "../services/matchService";
import liveMatchHero from "../assets/live-match-hero.svg";
import RoleNav from "../components/RoleNav";

function getCurrentInnings(match) {
  return match?.innings?.find((innings) => innings.number === match.currentInnings) || null;
}

function getTotalExtras(score) {
  return (
    score.extras.wides +
    score.extras.noBalls +
    score.extras.byes +
    score.extras.legByes
  );
}

function getStatusLabel(status) {
  if (status === "live") {
    return "Live";
  }

  if (status === "innings-break") {
    return "Innings Break";
  }

  if (status === "completed") {
    return "Match Complete";
  }

  return status;
}

function LiveScorePage({ mode = "viewer" }) {
  const isAdmin = mode === "admin";
  const [match, setMatch] = useState(null);
  const [status, setStatus] = useState("loading");
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [playerForm, setPlayerForm] = useState({
    striker: "",
    nonStriker: "",
    currentBowler: "",
  });
  const [secondInningsForm, setSecondInningsForm] = useState({
    striker: "",
    nonStriker: "",
    bowler: "",
  });
  const [eventForm, setEventForm] = useState({
    type: "run",
    runs: 1,
  });

  function syncForms(response) {
    const activeInnings = getCurrentInnings(response);

    setPlayerForm({
      striker: activeInnings?.players?.striker || "",
      nonStriker: activeInnings?.players?.nonStriker || "",
      currentBowler: activeInnings?.players?.currentBowler || "",
    });

    setSecondInningsForm({
      striker: "",
      nonStriker: "",
      bowler: "",
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function loadMatch() {
      try {
        const response = await getCurrentMatch();

        if (isMounted) {
          setMatch(response);
          syncForms(response);
          setStatus("ready");
        }
      } catch {
        if (isMounted) {
          setStatus("empty");
        }
      }
    }

    loadMatch();

    return () => {
      isMounted = false;
    };
  }, []);

  async function applyAction(action) {
    setIsUpdating(true);
    setActionError("");

    try {
      const response = await action();
      setMatch(response);
      syncForms(response);
      setStatus("ready");
    } catch (error) {
      setStatus("ready");
      setActionError(error.message || "The requested action could not be completed.");
    } finally {
      setIsUpdating(false);
    }
  }

  function handleEventChange(event) {
    const { name, value } = event.target;

    setEventForm((currentValue) => ({
      ...currentValue,
      [name]: name === "runs" ? Number(value) : value,
    }));
  }

  async function handleEventSubmit(event) {
    event.preventDefault();
    await applyAction(() => updateCurrentMatchScore(eventForm));
  }

  function handlePlayerChange(event) {
    const { name, value } = event.target;

    setPlayerForm((currentValue) => ({
      ...currentValue,
      [name]: value,
    }));
  }

  function handleSecondInningsChange(event) {
    const { name, value } = event.target;

    setSecondInningsForm((currentValue) => ({
      ...currentValue,
      [name]: value,
    }));
  }

  async function handlePlayerSubmit(event) {
    event.preventDefault();
    await applyAction(() => updateCurrentMatchPlayers(playerForm));
  }

  async function handleSecondInningsSubmit(event) {
    event.preventDefault();
    await applyAction(() => startSecondInnings(secondInningsForm));
  }

  const currentInnings = getCurrentInnings(match);
  const firstInnings = match?.innings?.[0];
  const secondInnings = match?.innings?.[1];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <RoleNav role={mode} />

        <section className="hero-panel">
          <div className="hero-layout">
            <div className="hero-copy">
              <span className="eyebrow">{isAdmin ? "Admin Scoring" : "Live Score"}</span>
              <h1>
                {match?.teamOne && match?.teamTwo
                  ? `${match.teamOne} vs ${match.teamTwo}`
                  : "Live Cricket Match Center"}
              </h1>
              <p>
                Follow the current score, batting pair, bowler, innings progress,
                and match result from one screen.
              </p>
                <div className="hero-meta">
                  <span>{match?.format || "Match"}</span>
                  <span>{getStatusLabel(match?.status || "loading")}</span>
                  {match?.target ? <span>Target {match.target}</span> : null}
              </div>
            </div>

            <div className="hero-visual-panel">
              <img
                src={liveMatchHero}
                alt="Cricket live scoring illustration"
                className="hero-illustration"
              />
              <div className="hero-floating-card">
                <div className="floating-card-mark floating-mark-placeholder">FP</div>
                <div>
                  <strong>
                    {match?.status === "completed"
                      ? "Final result"
                      : isAdmin
                      ? "Scoring live"
                      : "Viewer feed"}
                  </strong>
                  <span>
                    {currentInnings
                      ? `${currentInnings.battingTeam} ${currentInnings.score.runs}/${currentInnings.score.wickets}`
                      : "Waiting for live match data"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sidebar-card scoreboard-card">
          <h3>Scoreboard</h3>
          {status === "loading" ? <p>Loading current match...</p> : null}

          {status === "empty" ? (
            <p>No match setup found yet. Create one from the match setup page.</p>
          ) : null}

          {status === "ready" && match ? (
            <>
              <div className="headline-score">
                <strong>
                  {currentInnings?.score.runs ?? 0}/{currentInnings?.score.wickets ?? 0}
                </strong>
                <span>{currentInnings?.battingTeam || "Current Team"}</span>
              </div>

              <div className="score-summary-grid">
                <div className="summary-box">
                  <span>Overs</span>
                  <strong>{currentInnings?.score.overs ?? 0}</strong>
                </div>
                <div className="summary-box">
                  <span>Innings</span>
                  <strong>{match.currentInnings}</strong>
                </div>
                <div className="summary-box">
                  <span>Target</span>
                  <strong>{match.target || "-"}</strong>
                </div>
              </div>

              <div className="match-summary">
                <p>
                  Toss: {match.tossWinner} chose to {match.tossDecision} first
                </p>
                <p>Match overs: {match.overs}</p>
                {match.result ? <p className="result-text">Result: {match.result}</p> : null}
              </div>
            </>
          ) : null}
        </section>

        {status === "ready" && currentInnings ? (
          <section className="sidebar-card">
            <h3>Current Situation</h3>
            {actionError ? <p className="form-error">{actionError}</p> : null}
            <div className="situation-grid">
              <div className="summary-box">
                <span>Batting Team</span>
                <strong>{currentInnings.battingTeam}</strong>
              </div>
              <div className="summary-box">
                <span>Bowling Team</span>
                <strong>{currentInnings.bowlingTeam}</strong>
              </div>
              <div className="summary-box">
                <span>Striker</span>
                <strong>{currentInnings.players.striker || "Not set"}</strong>
              </div>
              <div className="summary-box">
                <span>Non-Striker</span>
                <strong>{currentInnings.players.nonStriker || "Not set"}</strong>
              </div>
              <div className="summary-box">
                <span>Current Bowler</span>
                <strong>{currentInnings.players.currentBowler || "Not set"}</strong>
              </div>
              <div className="summary-box">
                <span>Total Extras</span>
                <strong>{getTotalExtras(currentInnings.score)}</strong>
              </div>
            </div>

            <div className="match-summary">
              <p>
                Extras breakdown: Wd {currentInnings.score.extras.wides}, Nb{" "}
                {currentInnings.score.extras.noBalls}, Byes {currentInnings.score.extras.byes},
                Leg Byes {currentInnings.score.extras.legByes}
              </p>
              <p>
                Recent balls:{" "}
                {currentInnings.score.recentBalls.length
                  ? currentInnings.score.recentBalls.join(" ")
                  : "No balls bowled yet"}
              </p>
            </div>
          </section>
        ) : null}

        {isAdmin && status === "ready" && currentInnings?.status === "live" ? (
          <section className="sidebar-card">
            <h3>Change Players</h3>
            <form className="player-grid" onSubmit={handlePlayerSubmit}>
              <label className="field-group">
                <span>Striker</span>
                <input
                  type="text"
                  name="striker"
                  value={playerForm.striker}
                  onChange={handlePlayerChange}
                />
              </label>
              <label className="field-group">
                <span>Non-Striker</span>
                <input
                  type="text"
                  name="nonStriker"
                  value={playerForm.nonStriker}
                  onChange={handlePlayerChange}
                />
              </label>
              <label className="field-group">
                <span>Bowler</span>
                <input
                  type="text"
                  name="currentBowler"
                  value={playerForm.currentBowler}
                  onChange={handlePlayerChange}
                />
              </label>
              <button type="submit" className="secondary-button" disabled={isUpdating}>
                Update Players
              </button>
            </form>
          </section>
        ) : null}

        {isAdmin && status === "ready" && currentInnings?.status === "live" ? (
          <section className="sidebar-card">
            <h3>Update Score</h3>
            <div className="scoring-grid">
              <button
                type="button"
                className="primary-button"
                disabled={isUpdating}
                onClick={() => applyAction(() => updateCurrentMatchScore({ type: "run", runs: 0 }))}
              >
                Dot Ball
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={isUpdating}
                onClick={() => applyAction(() => updateCurrentMatchScore({ type: "run", runs: 1 }))}
              >
                +1 Run
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={isUpdating}
                onClick={() => applyAction(() => updateCurrentMatchScore({ type: "run", runs: 4 }))}
              >
                Four
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={isUpdating}
                onClick={() => applyAction(() => updateCurrentMatchScore({ type: "run", runs: 6 }))}
              >
                Six
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={isUpdating}
                onClick={() => applyAction(() => updateCurrentMatchScore({ type: "wicket" }))}
              >
                Wicket
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={isUpdating}
                onClick={() => applyAction(() => undoLastBall())}
              >
                Undo Last Ball
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={isUpdating}
                onClick={() => applyAction(() => completeCurrentInnings())}
              >
                Complete Innings
              </button>
            </div>

            <form className="event-grid" onSubmit={handleEventSubmit}>
              <label className="field-group">
                <span>Event Type</span>
                <select
                  name="type"
                  value={eventForm.type}
                  onChange={handleEventChange}
                >
                  <option value="run">Run</option>
                  <option value="wide">Wide</option>
                  <option value="noBall">No Ball</option>
                  <option value="bye">Bye</option>
                  <option value="legBye">Leg Bye</option>
                  <option value="wicket">Wicket</option>
                </select>
              </label>

              <label className="field-group">
                <span>Runs</span>
                <input
                  type="number"
                  name="runs"
                  min="0"
                  max="6"
                  value={eventForm.runs}
                  onChange={handleEventChange}
                  disabled={eventForm.type === "wicket"}
                />
              </label>

              <button type="submit" className="secondary-button" disabled={isUpdating}>
                Add Event
              </button>
            </form>
          </section>
        ) : null}

        {isAdmin && status === "ready" && match?.status === "innings-break" ? (
          <section className="sidebar-card">
            <h3>Start The Chase</h3>
            <p>First innings is complete. Enter the opening batters and bowler for the chase.</p>
            <form className="player-grid" onSubmit={handleSecondInningsSubmit}>
              <label className="field-group">
                <span>Striker</span>
                <input
                  type="text"
                  name="striker"
                  value={secondInningsForm.striker}
                  onChange={handleSecondInningsChange}
                />
              </label>
              <label className="field-group">
                <span>Non-Striker</span>
                <input
                  type="text"
                  name="nonStriker"
                  value={secondInningsForm.nonStriker}
                  onChange={handleSecondInningsChange}
                />
              </label>
              <label className="field-group">
                <span>Bowler</span>
                <input
                  type="text"
                  name="bowler"
                  value={secondInningsForm.bowler}
                  onChange={handleSecondInningsChange}
                />
              </label>
              <button type="submit" className="primary-button" disabled={isUpdating}>
                Start Chase
              </button>
            </form>
          </section>
        ) : null}

        {status === "ready" && match ? (
          <section className="stats-grid">
            {[firstInnings, secondInnings].map((innings) =>
              innings ? (
                <section key={innings.number} className="sidebar-card">
                  <h3>
                    Innings {innings.number}: {innings.battingTeam}
                  </h3>
                  <div className="table-list">
                    <div className="table-row">
                      <span>{innings.battingTeam}</span>
                      <span>
                        {innings.score.runs}/{innings.score.wickets} ({innings.score.overs})
                      </span>
                    </div>
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

                  <h4 className="subheading">Batting Card</h4>
                  <div className="table-list">
                    {innings.battingCard.length ? (
                      innings.battingCard.map((player) => (
                        <div key={`${innings.number}-${player.name}`} className="table-row">
                          <span>{player.name}</span>
                          <span>
                            {player.runs} ({player.balls}) - {player.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p>No batters yet.</p>
                    )}
                  </div>

                  <h4 className="subheading">Bowling Card</h4>
                  <div className="table-list">
                    {innings.bowlingCard.length ? (
                      innings.bowlingCard.map((player) => (
                        <div key={`${innings.number}-${player.name}`} className="table-row">
                          <span>{player.name}</span>
                          <span>
                            {player.overs} ov, {player.runs} r, {player.wickets} w
                          </span>
                        </div>
                      ))
                    ) : (
                      <p>No bowlers yet.</p>
                    )}
                  </div>
                </section>
              ) : null
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default LiveScorePage;
