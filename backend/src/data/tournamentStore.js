let tournaments = [];

function getTournaments() {
  return tournaments;
}

function getTournamentById(id) {
  return tournaments.find((tournament) => tournament.id === id) || null;
}

function getActiveTournament() {
  return tournaments.find((tournament) => tournament.status === "active") || null;
}

function setTournament(tournament) {
  tournaments = [tournament];
  return tournament;
}

function updateTournament(id, updater) {
  const index = tournaments.findIndex((tournament) => tournament.id === id);

  if (index === -1) {
    return null;
  }

  const updatedTournament = updater(tournaments[index]);
  tournaments[index] = updatedTournament;
  return updatedTournament;
}

module.exports = {
  getActiveTournament,
  getTournamentById,
  getTournaments,
  setTournament,
  updateTournament,
};
