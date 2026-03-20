import { Outlet } from "react-router-dom";
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
import MatchCenterTabs from "../components/match/MatchCenterTabs";
import {
  getCurrentInnings,
  getDisplayInnings,
  getStatusLabel,
  getTotalExtras,
} from "../components/match/matchCenterUtils";

function MatchCenterPage({ mode = "viewer" }) {
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

  function createEmptySecondInningsForm() {
    return {
      striker: "",
      nonStriker: "",
      bowler: "",
    };
  }

  function syncForms(response, { preserveSecondInningsDraft = false } = {}) {
    const activeInnings = getCurrentInnings(response);

    setPlayerForm({
      striker: activeInnings?.players?.striker || "",
      nonStriker: activeInnings?.players?.nonStriker || "",
      currentBowler: activeInnings?.players?.currentBowler || "",
    });

    setSecondInningsForm((currentValue) => {
      if (preserveSecondInningsDraft && response?.status === "innings-break") {
        return currentValue;
      }

      return createEmptySecondInningsForm();
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function loadMatch({ silent = false } = {}) {
      try {
        const response = await getCurrentMatch();

        if (!isMounted) {
          return;
        }

        setMatch(response);
        syncForms(response, { preserveSecondInningsDraft: silent });
        setStatus("ready");
        if (!silent) {
          setActionError("");
        }
      } catch {
        if (isMounted) {
          setStatus("empty");
        }
      }
    }

    loadMatch();

    const intervalId = window.setInterval(() => {
      loadMatch({ silent: true });
    }, isAdmin ? 5000 : 7000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isAdmin]);

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

  async function handleEventSubmit(event) {
    event.preventDefault();
    await applyAction(() => updateCurrentMatchScore(eventForm));
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
  const firstInnings = match?.innings?.[0] || null;
  const secondInnings = match?.innings?.[1] || null;
  const displayInnings = getDisplayInnings(match);

  return (
    <main className="app-shell">
      <div className="app-frame">
        <RoleNav role={mode} />

        <section className="hero-panel">
          <div className="hero-layout">
            <div className="hero-copy">
              <span className="eyebrow">{isAdmin ? "Admin Scoring Desk" : "Viewer Match Center"}</span>
              <h1>
                {match?.teamOne && match?.teamTwo
                  ? `${match.teamOne} vs ${match.teamTwo}`
                  : "Live Cricket Match Center"}
              </h1>
              <p>
                Dedicated center for summary, full scorecard, commentary, search, and live
                match statistics.
              </p>
              <div className="hero-meta">
                <span>{match?.format || "Match"}</span>
                <span>{getStatusLabel(match?.status)}</span>
                <span>{isAdmin ? "Auto-refresh 5s" : "Auto-refresh 7s"}</span>
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
                      {displayInnings
                        ? `${displayInnings.battingTeam} ${displayInnings.score.runs}/${displayInnings.score.wickets}`
                        : "Waiting for live match data"}
                    </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MatchCenterTabs mode={mode} />

        <section className="sidebar-card scoreboard-card">
          <h3>
            {match?.teamOne && match?.teamTwo
              ? `${match.teamOne} vs ${match.teamTwo}`
              : "Live Score"}
          </h3>
          {status === "loading" ? <p>Loading current match...</p> : null}
          {status === "empty" ? (
            <p>No match setup found yet. Create one from the match setup page.</p>
          ) : null}
          {status === "ready" && match && displayInnings ? (
            <>
              <div className="headline-score">
                <strong>
                  {displayInnings.score.runs}/{displayInnings.score.wickets}
                </strong>
                <span>
                  {displayInnings.battingTeam} | {displayInnings.score.overs} ov
                </span>
              </div>

              <div className="score-summary-grid">
                <div className="summary-box">
                  <span>Innings</span>
                  <strong>
                    {displayInnings.number}
                    {displayInnings.status === "pending" ? " Pending" : ""}
                  </strong>
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
              </div>
            </>
          ) : null}
        </section>

        {status === "ready" && match ? (
          <Outlet
            context={{
              actionError,
              currentInnings,
              displayInnings,
              firstInnings,
              isAdmin,
              match,
              secondInnings,
              status,
            }}
          />
        ) : null}

        {isAdmin && status === "ready" && currentInnings?.status === "live" ? (
          <section className="stats-grid">
            <section className="sidebar-card">
              <h3>Players Control</h3>
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

            <section className="sidebar-card">
              <h3>Scoring Console</h3>
              <div className="scoring-grid">
                <button
                  type="button"
                  className="primary-button"
                  disabled={isUpdating}
                  onClick={() => applyAction(() => updateCurrentMatchScore({ type: "run", runs: 0 }))}
                >
                  Dot
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={isUpdating}
                  onClick={() => applyAction(() => updateCurrentMatchScore({ type: "run", runs: 1 }))}
                >
                  +1
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
                  Undo
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
                  <select name="type" value={eventForm.type} onChange={handleEventChange}>
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
      </div>
    </main>
  );
}

export default MatchCenterPage;
