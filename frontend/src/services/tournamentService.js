import apiClient from "../api/axios";

export async function listTournaments() {
  const response = await apiClient.get("/tournaments");
  return response.data.data;
}

export async function getTournamentDetails(tournamentId) {
  const response = await apiClient.get(`/tournaments/${tournamentId}`);
  return response.data.data;
}

export async function createTournament(payload) {
  const response = await apiClient.post("/tournaments", payload);
  return response.data.data;
}

export async function addTournamentTeams(tournamentId, payload) {
  const response = await apiClient.patch(`/tournaments/${tournamentId}/teams`, payload);
  return response.data.data;
}

export async function createTournamentGroups(tournamentId, payload) {
  const response = await apiClient.patch(`/tournaments/${tournamentId}/groups`, payload);
  return response.data.data;
}

export async function updateTournamentTeamSquad(tournamentId, teamId, payload) {
  const response = await apiClient.patch(
    `/tournaments/${tournamentId}/teams/${teamId}/squad`,
    payload,
  );
  return response.data.data;
}

export async function startTournamentSchedule(tournamentId) {
  const response = await apiClient.patch(`/tournaments/${tournamentId}/schedule`);
  return response.data.data;
}

export async function updateFixtureResult(tournamentId, fixtureId, payload) {
  const response = await apiClient.patch(
    `/tournaments/${tournamentId}/fixtures/${fixtureId}`,
    payload
  );
  return response.data.data;
}

export async function updateTournamentAwards(tournamentId, payload) {
  const response = await apiClient.patch(`/tournaments/${tournamentId}/awards`, payload);
  return response.data.data;
}
