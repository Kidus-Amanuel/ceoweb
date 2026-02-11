import axios from "axios";
import { handleAxiosError } from "@/lib/utils/error-handler";
import logger from "@/lib/utils/logger";

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

    // Global error logging using centralized logger
    logger.error(
      {
        context: "axios-interceptor",
        path: error.config?.url,
        status: formattedError.status,
      },
      formattedError.message,
    );

    return Promise.reject(formattedError);
  },
);

export default axiosInstance;
