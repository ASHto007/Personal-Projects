import { useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import TournamentEmptyState from "./TournamentEmptyState";
import { getCurrentMatch } from "../../services/matchService";

function createResultDraft(fixture) {
  return {
    resultType: fixture?.result?.type || "winner",
    winner: fixture?.result?.winner || fixture?.teamA || "",
    teamAScore: fixture?.result?.teamAScore || "",
    teamBScore: fixture?.result?.teamBScore || "",
    summary: fixture?.result?.summary || "",
    manOfTheMatch: fixture?.result?.manOfTheMatch || "",
  };
}

function TournamentSchedule() {
  const { formatDisplayDate, handleFixtureResult, isAdmin, selectedTournament } =
    useOutletContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [warningMessage, setWarningMessage] = useState("");
  const [activeFixtureId, setActiveFixtureId] = useState("");
  const [resultForms, setResultForms] = useState({});

  const filteredFixtures = useMemo(() => {
    if (!selectedTournament) {
      return [];
    }

    return selectedTournament.schedule.filter((fixture) => {
      const matchesQuery =
        !query ||
        [fixture.teamA, fixture.teamB, fixture.groupName, fixture.venue]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query.trim().toLowerCase()));
      const matchesGroup = groupFilter === "all" || fixture.groupId === groupFilter;

      return matchesQuery && matchesGroup;
    });
  }, [groupFilter, query, selectedTournament]);

  if (!selectedTournament) {
    return <TournamentEmptyState isAdmin={isAdmin} />;
  }

  const detailsBasePath = isAdmin ? "/admin/tournaments/match" : "/tournaments/match";

  async function handleStartMatch(fixture) {
    setWarningMessage("");

    try {
      const currentMatch = await getCurrentMatch();

      if (currentMatch && ["live", "innings-break"].includes(currentMatch.status)) {
        setWarningMessage(
          `A live match is already running: ${currentMatch.teamOne} vs ${currentMatch.teamTwo}. Finish that match before starting a new one.`,
        );
        return;
      }
    } catch {
      // No current live match found, continue to match setup.
    }

    const teamA = selectedTournament.teams.find((team) => team.id === fixture.teamAId);
    const teamB = selectedTournament.teams.find((team) => team.id === fixture.teamBId);
    const teamASquad = teamA?.squad || [];
    const teamBSquad = teamB?.squad || [];
    const openingBowler =
      teamBSquad.find((player) => /bowler/i.test(player.role || ""))?.name ||
      teamBSquad[0]?.name ||
      "";

    navigate("/admin/match-setup", {
      state: {
        prefill: {
          teamOne: fixture.teamA,
          teamTwo: fixture.teamB,
          format: selectedTournament.format || "T20",
          overs: selectedTournament.overs || 20,
          tossWinner: fixture.teamA,
          tossDecision: "bat",
          striker: teamASquad[0]?.name || "",
          nonStriker: teamASquad[1]?.name || "",
          bowler: openingBowler,
          teamSquads: {
            [fixture.teamA]: teamASquad.map((player) => player.name),
            [fixture.teamB]: teamBSquad.map((player) => player.name),
          },
          tournamentContext: {
            tournamentId: selectedTournament.id,
            fixtureId: fixture.id,
          },
        },
      },
    });
  }

  function getFixtureResultForm(fixture) {
    return resultForms[fixture.id] || createResultDraft(fixture);
  }

  function handleResultFormChange(fixture, event) {
    const { name, value } = event.target;

    setResultForms((currentValue) => ({
      ...currentValue,
      [fixture.id]: {
        ...getFixtureResultForm(fixture),
        [name]: value,
      },
    }));
  }

  async function handleResultSubmit(event, fixture) {
    event.preventDefault();
    const formValue = getFixtureResultForm(fixture);

    await handleFixtureResult(selectedTournament.id, fixture.id, {
      resultType: formValue.resultType,
      winner: formValue.resultType === "winner" ? formValue.winner : "",
      teamAScore: formValue.teamAScore,
      teamBScore: formValue.teamBScore,
      summary: formValue.summary,
      manOfTheMatch: formValue.manOfTheMatch,
      venue: fixture.venue,
      date: fixture.date,
    });

    setActiveFixtureId("");
  }

  return (
    <section className="sidebar-card">
      <div className="section-toolbar">
        <div>
          <h3>Matches & Schedule</h3>
          <p>Browse all tournament fixtures, results, groups, and venue details in one place.</p>
        </div>
        <div className="toolbar-cluster">
          <label className="toolbar-search">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Team or venue"
            />
          </label>
          <label className="toolbar-select">
            <span>Group</span>
            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
            >
              <option value="all">All groups</option>
              {selectedTournament.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {warningMessage ? <p className="form-error">{warningMessage}</p> : null}
      <div className="table-list">
        {filteredFixtures.map((fixture) => (
          <div key={fixture.id} className="fixture-card">
            <div className="fixture-topline">
              <span className="fixture-round">
                {fixture.groupName} | Match {fixture.matchNumber}
              </span>
              <span className={`fixture-status fixture-status-${fixture.status}`}>
                {fixture.status}
              </span>
            </div>
            <div className="fixture-title">
              {fixture.teamA} vs {fixture.teamB}
            </div>
              <p className="fixture-result-text">
                {formatDisplayDate(fixture.date)} | {fixture.venue}
              </p>
              {fixture.result?.summary ? (
                <p className="fixture-result-text">{fixture.result.summary}</p>
              ) : null}
              {fixture.result?.manOfTheMatch ? (
                <p className="fixture-result-text">
                  Man of the match: <strong>{fixture.result.manOfTheMatch}</strong>
                </p>
              ) : null}
              <div className="fixture-actions">
                {isAdmin && fixture.status !== "completed" ? (
                  <button
                  type="button"
                  className="primary-button"
                  onClick={() => handleStartMatch(fixture)}
                >
                  Start Match
                </button>
                ) : (
                  <Link to={`${detailsBasePath}/${fixture.id}`} className="secondary-link">
                    View Details
                  </Link>
                )}
                {isAdmin ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setActiveFixtureId((currentValue) =>
                        currentValue === fixture.id ? "" : fixture.id,
                      )
                    }
                  >
                    {activeFixtureId === fixture.id
                      ? "Close Result Form"
                      : fixture.status === "completed"
                        ? "Edit Result"
                        : "Finish Match"}
                  </button>
                ) : null}
              </div>
              {isAdmin && activeFixtureId === fixture.id ? (
                <form className="event-grid tournament-result-form" onSubmit={(event) => handleResultSubmit(event, fixture)}>
                  <label className="field-group">
                    <span>Result</span>
                    <select
                      name="resultType"
                      value={getFixtureResultForm(fixture).resultType}
                      onChange={(event) => handleResultFormChange(fixture, event)}
                    >
                      <option value="winner">Winner</option>
                      <option value="tie">Tie</option>
                      <option value="no-result">No Result</option>
                    </select>
                  </label>
                  <label className="field-group">
                    <span>Winner</span>
                    <select
                      name="winner"
                      value={getFixtureResultForm(fixture).winner}
                      onChange={(event) => handleResultFormChange(fixture, event)}
                      disabled={getFixtureResultForm(fixture).resultType !== "winner"}
                    >
                      <option value={fixture.teamA}>{fixture.teamA}</option>
                      <option value={fixture.teamB}>{fixture.teamB}</option>
                    </select>
                  </label>
                  <label className="field-group">
                    <span>{fixture.teamA} Score</span>
                    <input
                      type="text"
                      name="teamAScore"
                      value={getFixtureResultForm(fixture).teamAScore}
                      onChange={(event) => handleResultFormChange(fixture, event)}
                      placeholder="150/6 (20)"
                    />
                  </label>
                  <label className="field-group">
                    <span>{fixture.teamB} Score</span>
                    <input
                      type="text"
                      name="teamBScore"
                      value={getFixtureResultForm(fixture).teamBScore}
                      onChange={(event) => handleResultFormChange(fixture, event)}
                      placeholder="148/8 (20)"
                    />
                  </label>
                  <label className="field-group">
                    <span>Match Summary</span>
                    <input
                      type="text"
                      name="summary"
                      value={getFixtureResultForm(fixture).summary}
                      onChange={(event) => handleResultFormChange(fixture, event)}
                      placeholder="Team A won by 2 runs"
                    />
                  </label>
                  <label className="field-group">
                    <span>Man Of The Match</span>
                    <select
                      name="manOfTheMatch"
                      value={getFixtureResultForm(fixture).manOfTheMatch}
                      onChange={(event) => handleResultFormChange(fixture, event)}
                    >
                      <option value="">Select player</option>
                      {[fixture.teamAId, fixture.teamBId]
                        .flatMap((teamId) => {
                          const team = selectedTournament.teams.find((item) => item.id === teamId);
                          return (team?.squad || []).map((player) => ({
                            id: player.id,
                            label: `${player.name} (${team?.name || "Team"})`,
                          }));
                        })
                        .map((player) => (
                          <option key={`${fixture.id}-${player.id}`} value={player.label}>
                            {player.label}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button type="submit" className="primary-button">
                    Save Match Result
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        {!filteredFixtures.length ? <p>No fixtures match this filter.</p> : null}
      </div>
    </section>
  );
}

export default TournamentSchedule;
