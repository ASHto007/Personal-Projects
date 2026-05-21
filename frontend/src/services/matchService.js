import apiClient from "../api/axios";

export async function createMatch(payload) {
  const response = await apiClient.post("/matches", payload);
  return response.data.data;
}

export async function getCurrentMatch() {
  const response = await apiClient.get("/matches/current");
  return response.data.data;
}

export async function getRecentMatches() {
  const response = await apiClient.get("/matches/recent");
  return response.data.data;
}

export async function updateCurrentMatchScore(payload) {
  const response = await apiClient.patch("/matches/current/score", payload);
  return response.data.data;
}

export async function updateCurrentMatchPlayers(payload) {
  const response = await apiClient.patch("/matches/current/players", payload);
  return response.data.data;
}

export async function updateCurrentMatchAward(payload) {
  const response = await apiClient.patch("/matches/current/award", payload);
  return response.data.data;
}

export async function undoLastBall() {
  const response = await apiClient.post("/matches/current/score/undo");
  return response.data.data;
}

export async function completeCurrentInnings() {
  const response = await apiClient.post("/matches/current/innings/complete");
  return response.data.data;
}

export async function startSecondInnings(payload) {
  const response = await apiClient.post("/matches/current/innings/start-second", payload);
  return response.data.data;
}
