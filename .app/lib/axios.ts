import axios from "axios";
import { handleAxiosError } from "@/utils/error-handler";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // You can add logic here to add auth headers if you're using a separate backend
    return config;
  },
  (error) => {
    return Promise.reject(handleAxiosError(error));
  },
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const formattedError = handleAxiosError(error);

    // Global error logging (optional: send to Sentry, etc.)
    if (process.env.NODE_ENV === "development") {
      console.error("[API Error]:", formattedError);
    }

    return Promise.reject(formattedError);
  },
);

export default axiosInstance;
