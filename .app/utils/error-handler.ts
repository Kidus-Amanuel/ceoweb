export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export function handleAxiosError(error: any): ApiError {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const data = error.response.data;
    return {
      message:
        data?.message ||
        data?.error?.message ||
        "An error occurred while processing your request.",
      status: error.response.status,
      code: data?.code || "SERVER_ERROR",
      details: data?.details || data,
    };
  } else if (error.request) {
    // The request was made but no response was received
    return {
      message:
        "No response received from server. Please check your internet connection.",
      code: "NETWORK_ERROR",
    };
  } else {
    // Something happened in setting up the request that triggered an Error
    return {
      message: error.message || "An unexpected error occurred.",
      code: "UNKNOWN_ERROR",
    };
  }
}
