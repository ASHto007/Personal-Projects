import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import TournamentEmptyState from "./TournamentEmptyState";

function TournamentSchedule() {
  const { formatDisplayDate, handleFixtureResult, isAdmin, selectedTournament } =
    useOutletContext();
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");

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
            <div className="fixture-actions">
              <Link to={`${detailsBasePath}/${fixture.id}`} className="secondary-link">
                View Details
              </Link>
            </div>
            {isAdmin && fixture.status !== "completed" ? (
              <div className="fixture-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    handleFixtureResult(selectedTournament.id, fixture.id, {
                      resultType: "winner",
                      winner: fixture.teamA,
                    })
                  }
                >
                  {fixture.teamA} Won
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    handleFixtureResult(selectedTournament.id, fixture.id, {
                      resultType: "winner",
                      winner: fixture.teamB,
                    })
                  }
                >
                  {fixture.teamB} Won
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    handleFixtureResult(selectedTournament.id, fixture.id, {
                      resultType: "tie",
                    })
                  }
                >
                  Tie
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    handleFixtureResult(selectedTournament.id, fixture.id, {
                      resultType: "no-result",
                    })
                  }
                >
                  No Result
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {!filteredFixtures.length ? <p>No fixtures match this filter.</p> : null}
      </div>
    </section>
  );
}

export default TournamentSchedule;
