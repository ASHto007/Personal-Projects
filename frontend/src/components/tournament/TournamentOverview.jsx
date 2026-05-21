import { useOutletContext } from "react-router-dom";
import TournamentEmptyState from "./TournamentEmptyState";
import TournamentCreateForm from "./TournamentCreateForm";

function TournamentOverview() {
  const {
    canCreateTournament,
    errorMessage,
    formatDisplayDate,
    formData,
    groupSetup,
    handleChange,
    handleAddTeams,
    handleCreateGroups,
    handleGroupSetupChange,
    handleSquadSetupChange,
    handleTeamSetupChange,
    handleStartSchedule,
    handleSubmit,
    handleUpdateTeamSquad,
    isAdmin,
    isSaving,
    selectedTournament,
    squadSetup,
    teamSetup,
  } = useOutletContext();

  const matchQueue = [...(selectedTournament?.schedule || [])].sort((left, right) => {
    if (left.matchNumber !== right.matchNumber) {
      return left.matchNumber - right.matchNumber;
    }

    return String(left.date || "").localeCompare(String(right.date || ""));
  });

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

      {isAdmin ? (
        <section className="sidebar-card">
          <h3>Tournament Setup</h3>
          <p>Add teams, create groups with manual names, then start the match schedule queue.</p>
          <div className="form-grid">
            <label className="field-group tournament-field">
              <span>Add Teams</span>
              <input
                type="text"
                name="teams"
                value={teamSetup.teams}
                onChange={handleTeamSetupChange}
                placeholder="Team A, Team B, Team C"
                disabled={selectedTournament.groups.length > 0 || selectedTournament.fixtures.length > 0}
              />
            </label>
            <label className="field-group">
              <span>Group Count</span>
              <select
                name="groupCount"
                value={groupSetup.groupCount}
                onChange={handleGroupSetupChange}
                disabled={selectedTournament.fixtures.length > 0}
              >
                <option value={1}>1 Group</option>
                <option value={2}>2 Groups</option>
                <option value={4}>4 Groups</option>
              </select>
            </label>
            <label className="field-group tournament-field">
              <span>Group Names</span>
              <input
                type="text"
                name="groupNames"
                value={groupSetup.groupNames}
                onChange={handleGroupSetupChange}
                placeholder="Group A, Group B"
                disabled={selectedTournament.fixtures.length > 0}
              />
            </label>
          </div>
          <div className="action-row">
            <button
              type="button"
              className="secondary-button"
              disabled={
                isSaving ||
                !teamSetup.teams.trim() ||
                selectedTournament.groups.length > 0 ||
                selectedTournament.fixtures.length > 0
              }
              onClick={() => handleAddTeams(selectedTournament.id)}
            >
              Add Teams
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={
                isSaving ||
                selectedTournament.teams.length < 2 ||
                selectedTournament.fixtures.length > 0
              }
              onClick={() => handleCreateGroups(selectedTournament.id)}
            >
              Create Group
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={
                isSaving ||
                !selectedTournament.groups.length ||
                selectedTournament.fixtures.length > 0
              }
              onClick={() => handleStartSchedule(selectedTournament.id)}
            >
              Start Schedule Match
            </button>
          </div>
        </section>
      ) : null}

      <section className="stats-grid">
        <section className="sidebar-card">
          <h3>Match Queue</h3>
          <div className="table-list">
            {matchQueue.length ? (
              matchQueue.slice(0, 5).map((fixture) => (
                <div key={fixture.id} className="fixture-card compact-fixture-card">
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
                </div>
              ))
            ) : (
              <p>Click Start Schedule Match to generate the fixture queue.</p>
            )}
          </div>
        </section>

        <section className="sidebar-card">
          <h3>Groups</h3>
          <div className="table-list">
            {selectedTournament.groups.length ? (
              selectedTournament.groups.map((group) => (
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
              ))
            ) : (
              <p>No groups created yet.</p>
            )}
          </div>
        </section>
      </section>

      {isAdmin && selectedTournament.groups.length ? (
        <section className="sidebar-card">
          <h3>Team Players</h3>
          <p>After groups are ready, update each team squad here.</p>
          <div className="form-grid">
            <label className="field-group">
              <span>Team</span>
              <select
                name="teamId"
                value={squadSetup.teamId}
                onChange={handleSquadSetupChange}
              >
                <option value="">Select team</option>
                {selectedTournament.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group tournament-field">
              <span>Players</span>
              <input
                type="text"
                name="players"
                value={squadSetup.players}
                onChange={handleSquadSetupChange}
                placeholder="Player 1, Player 2, Player 3"
              />
            </label>
          </div>
          <div className="action-row">
            <button
              type="button"
              className="secondary-button"
              disabled={isSaving || !squadSetup.teamId || !squadSetup.players.trim()}
              onClick={() => handleUpdateTeamSquad(selectedTournament.id)}
            >
              Add Team Players
            </button>
          </div>
        </section>
      ) : null}

      <section className="sidebar-card">
        <h3>Official Match Feed</h3>
        <div className="table-list">
          {matchQueue.length ? (
            matchQueue.map((match) => (
              <div key={match.id} className="table-row">
                <span>
                  {match.groupName ? `${match.groupName} | ` : ""}
                  Match {match.matchNumber} |{" "}
                  {match.teams}
                </span>
                <span>{match.summary || `${match.date} | ${match.venue}`}</span>
              </div>
            ))
          ) : (
            <p>No scheduled matches yet.</p>
          )}
        </div>
      </section>
    </>
  );
}

export default TournamentOverview;
