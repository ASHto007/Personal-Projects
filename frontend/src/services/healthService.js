import apiClient from "../api/axios";

export async function getHealthStatus() {
  const response = await apiClient.get("/health");
  return response.data.data || response.data;
}
