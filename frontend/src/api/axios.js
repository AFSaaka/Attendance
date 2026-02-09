import axios from "axios";
//frontend/src/api/axios.js

const instance = axios.create({
  // Ensure this matches the variable name in your .env exactly
  baseURL: "/api",
  withCredentials: true, // MANDATORY for PHP Sessions
});

export default instance;
