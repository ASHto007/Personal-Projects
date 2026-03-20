import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isBackendUnavailable =
      !error.response &&
      (error.code === "ECONNABORTED" ||
        error.code === "ERR_NETWORK" ||
        /Network Error/i.test(error.message || ""));

    const message =
      (isBackendUnavailable
        ? "Backend server is offline or unreachable. Start the API server on port 5000 and try again."
        : null) ||
      error.response?.data?.message ||
      error.message ||
      "Request failed. Please try again.";

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
