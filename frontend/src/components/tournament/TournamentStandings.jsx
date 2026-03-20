import { useOutletContext } from "react-router-dom";
import TournamentEmptyState from "./TournamentEmptyState";

function TournamentStandings() {
  const { isAdmin, selectedTournament } = useOutletContext();

  if (!selectedTournament) {
    return <TournamentEmptyState isAdmin={isAdmin} />;
  }

  return (
    <section className="sidebar-card">
      <h3>Group Points Table</h3>
      <div className="table-list">
        {selectedTournament.groupStandings.map((group) => (
          <div key={group.groupId} className="points-group-block">
            <h4 className="subheading">{group.groupName}</h4>
            <div className="points-table-wrap">
              <table className="points-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>L</th>
                    <th>T</th>
                    <th>NR</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {group.standings.map((team, index) => (
                    <tr key={`${group.groupId}-${team.team}`}>
                      <td>{index + 1}</td>
                      <td>{team.team}</td>
                      <td>{team.played}</td>
                      <td>{team.won}</td>
                      <td>{team.lost}</td>
                      <td>{team.tied}</td>
                      <td>{team.noResult}</td>
                      <td>{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TournamentStandings;
