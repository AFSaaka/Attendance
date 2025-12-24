import axios from "axios";

const instance = axios.create({
  // Ensure this matches the variable name in your .env exactly
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // MANDATORY for PHP Sessions
  headers: {
    "Content-Type": "application/json",
  },
});

export default instance;
