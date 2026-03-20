import { useOutletContext } from "react-router-dom";
import TournamentEmptyState from "./TournamentEmptyState";
import TournamentCreateForm from "./TournamentCreateForm";

function TournamentOverview() {
  const {
    canCreateTournament,
    errorMessage,
    formatDisplayDate,
    formData,
    handleChange,
    handleSubmit,
    isAdmin,
    isSaving,
    selectedTournament,
  } = useOutletContext();

  if (!selectedTournament) {
    if (canCreateTournament) {
      return (
        <TournamentCreateForm
          formData={formData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          errorMessage={errorMessage}
        />
      );
    }

    return <TournamentEmptyState isAdmin={isAdmin} />;
  }

  return (
    <>
      {canCreateTournament ? (
        <TournamentCreateForm
          formData={formData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          errorMessage={errorMessage}
        />
      ) : null}

      <section className="stats-grid">
        <section className="sidebar-card">
          <h3>Featured Fixtures</h3>
          <div className="table-list">
            {selectedTournament.schedule.slice(0, 3).map((fixture) => (
              <div key={fixture.id} className="fixture-card compact-fixture-card">
                <div className="fixture-topline">
                  <span className="fixture-round">{fixture.groupName}</span>
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
              </div>
            ))}
          </div>
        </section>

        <section className="sidebar-card">
          <h3>Groups</h3>
          <div className="table-list">
            {selectedTournament.groups.map((group) => (
              <div key={group.id} className="fixture-card">
                <div className="fixture-topline">
                  <span className="fixture-round">{group.name}</span>
                  <span className="fixture-status fixture-status-scheduled">
                    {group.teams.length} teams
                  </span>
                </div>
                <div className="team-chip-list">
                  {group.teams.map((team) => (
                    <span key={team.id} className="team-chip">
                      {team.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="sidebar-card">
        <h3>Official Match Feed</h3>
        <div className="table-list">
          {selectedTournament.matches.map((match) => (
            <div key={match.id} className="table-row">
              <span>
                {match.groupName ? `${match.groupName} | ` : ""}
                {match.teams}
              </span>
              <span>{match.summary || `${match.date} | ${match.venue}`}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default TournamentOverview;
