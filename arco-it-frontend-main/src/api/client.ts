import axios, { AxiosError } from 'axios';
import { tokenStorage } from '../utils/auth';
import { logger } from '../utils/logger';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor - attach access token and log
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  logger.apiRequest(config.method || 'GET', config.url || '');
  return config;
});

// Response interceptor - handle status, errors, and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    logger.apiResponse(response.config.method || 'GET', response.config.url || '', response.status);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const method = originalRequest?.method || 'UNKNOWN';
    const url = originalRequest?.url || 'UNKNOWN';
    const status = error.response?.status;
    const errorData = error.response?.data as { detail?: string; message?: string } | undefined;
    const safeMessage = errorData?.detail || errorData?.message || error.message;

    // Handle 401 and attempt refresh
    if (status === 401 && originalRequest && !originalRequest._retry) {
      // If the failed request was the login or refresh endpoint itself, do not loop or redirect
      if (url.includes('/auth/login/') || url.includes('/auth/refresh/')) {
        logger.apiError(method, url, status, safeMessage);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefresh();
      if (!refreshToken) {
        logger.warn('Auth', 'No refresh token available; redirecting to login');
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        logger.info('Auth', 'Attempting JWT token refresh');
        const response = await axios.post('/api/v1/auth/refresh/', {
          refresh: refreshToken,
        });
        const { access, refresh } = response.data;
        tokenStorage.setTokens(access, refresh || refreshToken);
        processQueue(null, access);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }
        logger.info('Auth', 'Token refresh successful; retrying original request');
        return apiClient(originalRequest);
      } catch (refreshError) {
        logger.error('Auth', 'Token refresh failed; clearing tokens and redirecting');
        processQueue(refreshError, null);
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Log other error codes cleanly without leaking credentials
    if (status === 403) {
      logger.apiError(method, url, 403, `Forbidden: ${safeMessage}`);
    } else if (status === 404) {
      logger.apiError(method, url, 404, `Not Found: ${safeMessage}`);
    } else if (status && status >= 500) {
      logger.apiError(method, url, status, `Server Error: ${safeMessage}`);
    } else if (error.code === 'ECONNABORTED') {
      logger.apiError(method, url, undefined, 'Request timed out');
    } else if (!error.response) {
      logger.apiError(method, url, undefined, 'Network error: Server may be unreachable');
    } else {
      logger.apiError(method, url, status, safeMessage);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
