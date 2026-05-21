import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  completeCurrentInnings,
  getCurrentMatch,
  startSecondInnings,
  undoLastBall,
  updateCurrentMatchAward,
  updateCurrentMatchPlayers,
  updateCurrentMatchScore,
} from "../services/matchService";
import liveMatchHero from "../assets/live-match-hero.png";
import RoleNav from "../components/RoleNav";
import MatchCenterTabs from "../components/match/MatchCenterTabs";
import {
  getCurrentInnings,
  getDisplayInnings,
  getStatusLabel,
  getTotalExtras,
} from "../components/match/matchCenterUtils";
import {
  buildUniquePlayerOptions,
  buildScorePayload,
  createDefaultEventForm,
  normalizeSquadOptions,
  WICKET_TYPE_OPTIONS,
} from "../components/match/scoringFormUtils";

function createEmptySecondInningsForm() {
  return {
    striker: "",
    nonStriker: "",
    bowler: "",
  };
}

function buildPlayerForm(response) {
  const activeInnings = getCurrentInnings(response);

  return {
    striker: activeInnings?.players?.striker || "",
    nonStriker: activeInnings?.players?.nonStriker || "",
    currentBowler: activeInnings?.players?.currentBowler || "",
  };
}

function getSecondInningsFormValue(response, currentValue, preserveSecondInningsDraft) {
  if (preserveSecondInningsDraft && response?.status === "innings-break") {
    return currentValue;
  }

  return createEmptySecondInningsForm();
}

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
  const [eventForm, setEventForm] = useState(createDefaultEventForm);
  const [showAdvancedScoring, setShowAdvancedScoring] = useState(false);
  const [extraRunMode, setExtraRunMode] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMatch({ silent = false } = {}) {
      try {
        const response = await getCurrentMatch();

        if (!isMounted) {
          return;
        }

        setMatch(response);
        setPlayerForm(buildPlayerForm(response));
        setSecondInningsForm((currentValue) =>
          getSecondInningsFormValue(response, currentValue, silent),
        );
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
      setPlayerForm(buildPlayerForm(response));
      setSecondInningsForm(() => createEmptySecondInningsForm());
      setStatus("ready");
    } catch (error) {
      setStatus("ready");
      setActionError(error.message || "The requested action could not be completed.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function submitQuickEvent(payload) {
    setExtraRunMode("");
    await applyAction(() => updateCurrentMatchScore(payload));
  }

  function toggleExtraRunMode(type) {
    setExtraRunMode((currentValue) => (currentValue === type ? "" : type));
  }

  function getExtraRunModeLabel(type) {
    if (type === "wide") {
      return "Wide With Extra Runs";
    }

    if (type === "noBall") {
      return "No Ball With Bat Runs";
    }

    if (type === "bye") {
      return "Bye Runs";
    }

    if (type === "legBye") {
      return "Leg Bye Runs";
    }

    return "Extra Runs";
  }

  function getExtraRunModeOptions(type) {
    if (type === "noBall") {
      return [1, 2, 3, 4, 6];
    }

    return [1, 2, 3, 4];
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
    await applyAction(() => updateCurrentMatchScore(buildScorePayload(eventForm)));
  }

  async function handlePlayerSubmit(event) {
    event.preventDefault();
    await applyAction(() => updateCurrentMatchPlayers(playerForm));
  }

  async function handleSecondInningsSubmit(event) {
    event.preventDefault();
    await applyAction(() => startSecondInnings(secondInningsForm));
  }

  async function handleMatchAward(manOfTheMatch) {
    await applyAction(() => updateCurrentMatchAward({ manOfTheMatch }));
  }

  const currentInnings = getCurrentInnings(match);
  const firstInnings = match?.innings?.[0] || null;
  const secondInnings = match?.innings?.[1] || null;
  const displayInnings = getDisplayInnings(match);
  const battingSquadOptions = normalizeSquadOptions(match?.teamSquads, currentInnings?.battingTeam);
  const bowlingSquadOptions = normalizeSquadOptions(match?.teamSquads, currentInnings?.bowlingTeam);
  const batterOptions = buildUniquePlayerOptions(
    currentInnings?.players?.striker,
    currentInnings?.players?.nonStriker,
    ...battingSquadOptions,
  );
  const bowlerOptions = buildUniquePlayerOptions(
    currentInnings?.players?.currentBowler,
    ...bowlingSquadOptions,
  );
  const secondInningsBatters = buildUniquePlayerOptions(
    ...normalizeSquadOptions(match?.teamSquads, secondInnings?.battingTeam),
  );
  const secondInningsBowlers = buildUniquePlayerOptions(
    ...normalizeSquadOptions(match?.teamSquads, secondInnings?.bowlingTeam),
  );
  const needsNewBowler = currentInnings?.requiresNewBowler === true;

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
              handleMatchAward,
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
              {needsNewBowler ? (
                <p className="form-error">Over complete. Select the next bowler before scoring the next ball.</p>
              ) : null}
              <form className="player-grid" onSubmit={handlePlayerSubmit}>
                <label className="field-group">
                  <span>Striker</span>
                  <input
                    type="text"
                    name="striker"
                    list="match-center-batters"
                    value={playerForm.striker}
                    onChange={handlePlayerChange}
                    placeholder="Select or type striker"
                  />
                </label>
                <label className="field-group">
                  <span>Non-Striker</span>
                  <input
                    type="text"
                    name="nonStriker"
                    list="match-center-batters"
                    value={playerForm.nonStriker}
                    onChange={handlePlayerChange}
                    placeholder="Select or type non-striker"
                  />
                </label>
                <label className="field-group">
                  <span>Bowler</span>
                  <input
                    type="text"
                    name="currentBowler"
                    list="match-center-bowlers"
                    value={playerForm.currentBowler}
                    onChange={handlePlayerChange}
                    placeholder="Select or type bowler"
                  />
                </label>
                <button type="submit" className="secondary-button" disabled={isUpdating}>
                  Update Players
                </button>
              </form>
            </section>

            <section className="sidebar-card">
              <h3>Scoring Console</h3>
              <div className="scoring-stack">
                <div>
                  <p className="scoring-label">Runs</p>
                  <div className="quick-score-grid">
                    {[0, 1, 2, 3, 4, 6].map((runValue) => (
                      <button
                        key={runValue}
                        type="button"
                        className="primary-button"
                        disabled={isUpdating || needsNewBowler}
                        onClick={() => submitQuickEvent({ type: "run", runs: runValue })}
                      >
                        {runValue === 0 ? "Dot" : `+${runValue}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="scoring-label">Extras</p>
                  <div className="quick-score-grid">
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isUpdating || needsNewBowler}
                      onClick={() => submitQuickEvent({ type: "wide", runs: 0 })}
                    >
                      Wide
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isUpdating || needsNewBowler}
                      onClick={() => toggleExtraRunMode("wide")}
                    >
                      Wide +
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isUpdating || needsNewBowler}
                      onClick={() => submitQuickEvent({ type: "noBall", runs: 0 })}
                    >
                      No Ball
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isUpdating || needsNewBowler}
                      onClick={() => toggleExtraRunMode("noBall")}
                    >
                      NB +
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isUpdating || needsNewBowler}
                      onClick={() => submitQuickEvent({ type: "bye", runs: 1 })}
                    >
                      Bye
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isUpdating || needsNewBowler}
                      onClick={() => toggleExtraRunMode("bye")}
                    >
                      Bye +
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isUpdating || needsNewBowler}
                      onClick={() => submitQuickEvent({ type: "legBye", runs: 1 })}
                    >
                      Leg Bye
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isUpdating || needsNewBowler}
                      onClick={() => toggleExtraRunMode("legBye")}
                    >
                      LBye +
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={isUpdating || needsNewBowler}
                      onClick={() =>
                        setEventForm((currentValue) => ({
                          ...createDefaultEventForm(),
                          type: "wicket",
                          wicketType: currentValue.wicketType,
                          dismissedBatter: currentValue.dismissedBatter,
                        }))
                      }
                    >
                      Wicket
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={isUpdating}
                      onClick={() => setShowAdvancedScoring((currentValue) => !currentValue)}
                    >
                      {showAdvancedScoring ? "Hide Manual" : "Manual Entry"}
                    </button>
                  </div>
                </div>

                {extraRunMode ? (
                  <div className="extra-console">
                    <p className="scoring-label">{getExtraRunModeLabel(extraRunMode)}</p>
                    <div className="quick-score-grid">
                      {getExtraRunModeOptions(extraRunMode).map((runValue) => (
                        <button
                          key={`${extraRunMode}-${runValue}`}
                          type="button"
                          className="secondary-button"
                          disabled={isUpdating || needsNewBowler}
                          onClick={() => submitQuickEvent({ type: extraRunMode, runs: runValue })}
                        >
                          +{runValue}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isUpdating}
                        onClick={() => setExtraRunMode("")}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="quick-score-grid">
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
              </div>

              {eventForm.type === "wicket" ? (
                <form className="event-grid wicket-console" onSubmit={handleEventSubmit}>
                  <label className="field-group">
                    <span>Wicket Type</span>
                    <select
                      name="wicketType"
                      value={eventForm.wicketType}
                      onChange={handleEventChange}
                    >
                      {WICKET_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field-group">
                    <span>Dismissed Batter</span>
                    <select
                      name="dismissedBatter"
                      value={eventForm.dismissedBatter}
                      onChange={handleEventChange}
                    >
                      <option value="striker">Striker</option>
                      <option value="non-striker">Non-Striker</option>
                    </select>
                  </label>

                  <label className="field-group">
                    <span>Runs On Wicket Ball</span>
                    <input
                      type="number"
                      name="runs"
                      min="0"
                      max="6"
                      value={eventForm.runs}
                      onChange={handleEventChange}
                      placeholder="0 for normal wicket"
                    />
                  </label>

                  <label className="field-group">
                    <span>Next Batter</span>
                    <input
                      type="text"
                      name="nextBatter"
                      list="match-center-batters"
                      value={eventForm.nextBatter}
                      onChange={handleEventChange}
                      placeholder="Who comes in next?"
                    />
                  </label>

                  <label className="field-group">
                    <span>Fielder</span>
                    <input
                      type="text"
                      name="fielder"
                      list="match-center-batters"
                      value={eventForm.fielder}
                      onChange={handleEventChange}
                      placeholder="Optional"
                    />
                  </label>

                  <label className="field-group">
                    <span>Description</span>
                    <input
                      type="text"
                      name="description"
                      value={eventForm.description}
                      onChange={handleEventChange}
                      placeholder="Optional wicket note"
                    />
                  </label>

                  {eventForm.runs > 0 ? (
                    <p className="form-error">
                      Use wicket runs for cases like run out after completed runs.
                    </p>
                  ) : null}

                  <button type="submit" className="danger-button" disabled={isUpdating || needsNewBowler}>
                    Confirm Wicket
                  </button>
                </form>
              ) : null}

              {showAdvancedScoring && eventForm.type !== "wicket" ? (
                <form className="event-grid" onSubmit={handleEventSubmit}>
                  <label className="field-group">
                    <span>Manual Event</span>
                    <select name="type" value={eventForm.type} onChange={handleEventChange}>
                      <option value="run">Run</option>
                      <option value="wide">Wide</option>
                      <option value="noBall">No Ball</option>
                      <option value="bye">Bye</option>
                      <option value="legBye">Leg Bye</option>
                    </select>
                  </label>

                  <label className="field-group">
                    <span>
                      {eventForm.type === "wide" || eventForm.type === "noBall"
                        ? "Additional Runs"
                        : "Runs"}
                    </span>
                    <input
                      type="number"
                      name="runs"
                      min="0"
                      max="6"
                      value={eventForm.runs}
                      onChange={handleEventChange}
                    />
                  </label>

                  <button type="submit" className="secondary-button" disabled={isUpdating || needsNewBowler}>
                    Add Manual Event
                  </button>
                </form>
              ) : null}
              <datalist id="match-center-batters">
                {batterOptions.map((playerName) => (
                  <option key={playerName} value={playerName} />
                ))}
              </datalist>
              <datalist id="match-center-bowlers">
                {bowlerOptions.map((playerName) => (
                  <option key={playerName} value={playerName} />
                ))}
              </datalist>
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
                  list="match-center-second-innings-batters"
                  value={secondInningsForm.striker}
                  onChange={handleSecondInningsChange}
                  placeholder="Select or type striker"
                />
              </label>
              <label className="field-group">
                <span>Non-Striker</span>
                <input
                  type="text"
                  name="nonStriker"
                  list="match-center-second-innings-batters"
                  value={secondInningsForm.nonStriker}
                  onChange={handleSecondInningsChange}
                  placeholder="Select or type non-striker"
                />
              </label>
              <label className="field-group">
                <span>Bowler</span>
                <input
                  type="text"
                  name="bowler"
                  list="match-center-second-innings-bowlers"
                  value={secondInningsForm.bowler}
                  onChange={handleSecondInningsChange}
                  placeholder="Select or type bowler"
                />
              </label>
              <button type="submit" className="primary-button" disabled={isUpdating}>
                Start Chase
              </button>
            </form>
            <datalist id="match-center-second-innings-batters">
              {secondInningsBatters.map((playerName) => (
                <option key={playerName} value={playerName} />
              ))}
            </datalist>
            <datalist id="match-center-second-innings-bowlers">
              {secondInningsBowlers.map((playerName) => (
                <option key={playerName} value={playerName} />
              ))}
            </datalist>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default MatchCenterPage;
