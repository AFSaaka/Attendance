import axios from "axios";
//frontend/src/api/axios.js

const instance = axios.create({
  // Ensure this matches the variable name in your .env exactly
  baseURL: "/api",
  withCredentials: true, // MANDATORY for PHP Sessions
});

/**
 * CSRF TOKEN MANAGEMENT
 * Stores the CSRF token in-memory (not localStorage) to:
 * - Prevent XSS theft to localStorage
 * - Survive page refreshes (token from auth/verify)
 * - Work with offline sync (included in _csrf body param)
 */
let csrfToken = null;

export const setCsrfToken = (token) => {
  csrfToken = token;
};

export const getCsrfToken = () => {
  return csrfToken;
};

/**
 * REQUEST INTERCEPTOR: Inject CSRF token into state-changing requests
 * - Adds X-CSRF-Token header to all POST/PUT/DELETE requests
 * - Skips auth endpoints (they don't require tokens)
 */
instance.interceptors.request.use(
  (config) => {
    // Extract the request method and path
    const method = config.method.toUpperCase();
    const path = config.url || "";

    // Skip CSRF validation for auth endpoints (they run pre-session)
    const isAuthEndpoint = path.includes("/auth/");

    // Add CSRF token to state-changing requests (POST, PUT, DELETE)
    if (!isAuthEndpoint && ["POST", "PUT", "DELETE"].includes(method)) {
      const token = getCsrfToken();
      if (token) {
        // Always send as header
        config.headers["X-CSRF-Token"] = token;

        // Also inject into JSON body as _csrf fallback
        // Handles edge cases where headers are stripped by proxies
        if (
          config.data &&
          typeof config.data === "object" &&
          !Array.isArray(config.data)
        ) {
          config.data = { ...config.data, _csrf: token };
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * RESPONSE INTERCEPTOR: Extract CSRF token from auth/verify response
 * Updates in-memory token so it persists for subsequent requests
 */
instance.interceptors.response.use(
  (response) => {
    // If this is auth/verify response, capture the csrf_token
    if (
      response.config.url &&
      (response.config.url.includes("auth/verify") ||
        response.config.url.includes("auth/csrf")) &&
      response.data?.csrf_token
    ) {
      setCsrfToken(response.data.csrf_token);
    }
    return response;
  },
  (error) => Promise.reject(error),
);

export const isCancel = axios.isCancel.bind(axios);

export default instance;
