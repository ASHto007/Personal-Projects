import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import TournamentEmptyState from "./TournamentEmptyState";

function TournamentResults() {
  const { isAdmin, selectedTournament } = useOutletContext();
  const [query, setQuery] = useState("");

  const filteredResults = useMemo(() => {
    if (!selectedTournament) {
      return [];
    }

    return selectedTournament.results.filter((fixture) => {
      if (!query) {
        return true;
      }

      return [fixture.teamA, fixture.teamB, fixture.groupName, fixture.result?.summary]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query.trim().toLowerCase()));
    });
  }, [query, selectedTournament]);

  if (!selectedTournament) {
    return <TournamentEmptyState isAdmin={isAdmin} />;
  }

  const detailsBasePath = isAdmin ? "/admin/tournaments/match" : "/tournaments/match";

  return (
    <section className="sidebar-card">
      <div className="section-toolbar">
        <div>
          <h3>Match Results</h3>
          <p>Search completed results by team or result line.</p>
        </div>
        <label className="toolbar-search">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Team or result"
          />
        </label>
      </div>
      <div className="table-list">
        {filteredResults.length ? (
          filteredResults.map((fixture) => (
            <article key={fixture.id} className="fixture-card compact-fixture-card">
              <div className="fixture-topline">
                <span className="fixture-round">{fixture.groupName}</span>
                <span className="fixture-status fixture-status-completed">completed</span>
              </div>
              <div className="fixture-title">
                {fixture.teamA} vs {fixture.teamB}
              </div>
              <p className="fixture-result-text">{fixture.result?.summary}</p>
              {fixture.result?.manOfTheMatch ? (
                <p className="fixture-result-text">
                  Man of the match: <strong>{fixture.result.manOfTheMatch}</strong>
                </p>
              ) : null}
              <div className="fixture-actions">
                <Link to={`${detailsBasePath}/${fixture.id}`} className="secondary-link">
                  View Details
                </Link>
              </div>
            </article>
          ))
        ) : (
          <p>No completed matches yet.</p>
        )}
      </div>
    </section>
  );
}

export default TournamentResults;
