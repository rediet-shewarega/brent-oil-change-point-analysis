const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

/**
 * Fetch JSON from the Flask API and convert unsuccessful responses
 * into readable JavaScript errors.
 */
async function apiRequest(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `The API returned an invalid response with status ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      payload.error || `API request failed with status ${response.status}.`,
    );
  }

  return payload;
}

export function getHealth() {
  return apiRequest("/api/health");
}

export function getChangePoint() {
  return apiRequest("/api/change-point");
}

export function getEventCorrelations() {
  return apiRequest("/api/event-correlations");
}

export function getEvents({
  startDate,
  endDate,
  category,
} = {}) {
  const parameters = new URLSearchParams();

  if (startDate) {
    parameters.set("start_date", startDate);
  }

  if (endDate) {
    parameters.set("end_date", endDate);
  }

  if (category) {
    parameters.set("category", category);
  }

  const queryString = parameters.toString();

  return apiRequest(
    `/api/events${queryString ? `?${queryString}` : ""}`,
  );
}

export function getPrices({
  startDate,
  endDate,
  frequency = "monthly",
} = {}) {
  const parameters = new URLSearchParams();

  if (startDate) {
    parameters.set("start_date", startDate);
  }

  if (endDate) {
    parameters.set("end_date", endDate);
  }

  parameters.set("frequency", frequency);

  return apiRequest(`/api/prices?${parameters.toString()}`);
}

export function getSummary({
  startDate,
  endDate,
} = {}) {
  const parameters = new URLSearchParams();

  if (startDate) {
    parameters.set("start_date", startDate);
  }

  if (endDate) {
    parameters.set("end_date", endDate);
  }

  const queryString = parameters.toString();

  return apiRequest(
    `/api/summary${queryString ? `?${queryString}` : ""}`,
  );
}