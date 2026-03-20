import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import TournamentEmptyState from "./TournamentEmptyState";

function TournamentMatches() {
  const { formatDisplayDate, isAdmin, selectedTournament } = useOutletContext();
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredMatches = useMemo(() => {
    if (!selectedTournament?.matches?.length) {
      return [];
    }

    if (statusFilter === "all") {
      return selectedTournament.matches;
    }

    return selectedTournament.matches.filter((match) => match.status === statusFilter);
  }, [selectedTournament, statusFilter]);

  if (!selectedTournament) {
    return <TournamentEmptyState isAdmin={isAdmin} />;
  }

  return (
    <section className="sidebar-card">
      <div className="section-toolbar">
        <div>
          <h3>Tournament Match Feed</h3>
          <p>Viewer-style list of scheduled, live-style, and completed fixtures.</p>
        </div>
        <label className="toolbar-select">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All matches</option>
            <option value="scheduled">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </div>

      <div className="table-list">
        {filteredMatches.length ? (
          filteredMatches.map((match) => (
            <article key={match.id} className="fixture-card">
              <div className="fixture-topline">
                <span className="fixture-round">
                  {match.groupName ? `${match.groupName} | ` : ""}Match {match.matchNumber}
                </span>
                <span className={`fixture-status fixture-status-${match.status}`}>
                  {match.status}
                </span>
              </div>
              <div className="fixture-title">{match.teams}</div>
              <p className="fixture-result-text">
                {formatDisplayDate(match.date)} | {match.venue}
              </p>
              <p className="fixture-result-text">
                {match.summary || "Awaiting official result"}
              </p>
            </article>
          ))
        ) : (
          <p>No matches found for this filter.</p>
        )}
      </div>
    </section>
  );
}

export default TournamentMatches;
