import axios from "axios";

import useAuthStore from "@/store/authStore";

const api = axios.create({
  baseURL: "http://192.168.1.15:5000/api",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().jwt;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;