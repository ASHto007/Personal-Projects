import { useOutletContext } from "react-router-dom";
import TournamentEmptyState from "./TournamentEmptyState";

function TournamentSquads() {
  const { isAdmin, selectedTournament } = useOutletContext();

  if (!selectedTournament) {
    return <TournamentEmptyState isAdmin={isAdmin} />;
  }

  return (
    <section className="sidebar-card">
      <h3>Squads</h3>
      <div className="squad-grid">
        {selectedTournament.teams.map((team) => (
          <div key={team.id} className="fixture-card">
            <div className="fixture-topline">
              <span className="fixture-round">{team.name}</span>
              <span className="fixture-status fixture-status-scheduled">
                {team.squad.length} players
              </span>
            </div>
            <div className="table-list">
              {team.squad.map((player) => (
                <div key={player.id} className="table-row">
                  <span>{player.name}</span>
                  <span>{player.role}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TournamentSquads;
