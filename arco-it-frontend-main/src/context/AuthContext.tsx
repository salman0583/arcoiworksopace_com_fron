import React, { createContext, useContext, useEffect, useReducer, useRef, useCallback } from 'react';
import type { User, LoginPendingResponse } from '../types';
import { authApi } from '../api/auth';
import { tokenStorage } from '../utils/auth';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
const WARNING_TRIGGER_MS = 55 * 60 * 1000; // 55 minutes (5 min warning before timeout)

interface PendingLoginState {
  temp_token: string;
  email: string;
  expires_in: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  pendingLogin: PendingLoginState | null;
  showSessionWarning: boolean;
  sessionRemainingSeconds: number;
  sessionExpiredMessage: string | null;
}

type AuthAction =
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_PENDING_OTP'; payload: PendingLoginState }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT'; payload?: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_PENDING' }
  | { type: 'SET_SESSION_WARNING'; payload: { show: boolean; remainingSeconds: number } };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  verifyOTP: (otp: string) => Promise<void>;
  resendOTP: () => Promise<void>;
  cancelPendingLogin: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
  continueSession: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  pendingLogin: null,
  showSessionWarning: false,
  sessionRemainingSeconds: 300,
  sessionExpiredMessage: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload,
        error: null,
        pendingLogin: null,
        showSessionWarning: false,
        sessionExpiredMessage: null,
      };
    case 'AUTH_PENDING_OTP':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        pendingLogin: action.payload,
        error: null,
      };
    case 'AUTH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
        pendingLogin: null,
        showSessionWarning: false,
        sessionExpiredMessage: action.payload || null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null, sessionExpiredMessage: null };
    case 'CLEAR_PENDING':
      return { ...state, pendingLogin: null, error: null };
    case 'SET_SESSION_WARNING':
      return {
        ...state,
        showSessionWarning: action.payload.show,
        sessionRemainingSeconds: action.payload.remainingSeconds,
      };
    default:
      return state;
  }
}

function getFormattedAuthError(error: unknown, defaultMessage: string): string {
  const axiosError = error as {
    code?: string;
    message?: string;
    response?: {
      status?: number;
      data?: { detail?: string; message?: string; error?: string };
    };
  };

  const status = axiosError?.response?.status;
  const serverMsg =
    axiosError?.response?.data?.detail ||
    axiosError?.response?.data?.message ||
    axiosError?.response?.data?.error;

  if (serverMsg && typeof serverMsg === 'string') {
    return serverMsg;
  }

  if (status === 401) {
    return 'Invalid email or password.';
  }
  if (status === 403) {
    return 'Your account is not permitted to sign in. Please contact your IT Administrator.';
  }
  if (status && status >= 500) {
    return 'ARCO Workplace server is currently unavailable. Please try again later.';
  }
  if (axiosError?.code === 'ECONNABORTED' || axiosError?.message?.includes('timeout')) {
    return 'ARCO Workplace is taking too long to respond. Please try again.';
  }
  if (
    axiosError?.code === 'ECONNREFUSED' ||
    axiosError?.code === 'ERR_NETWORK' ||
    axiosError?.message === 'Network Error' ||
    !axiosError?.response
  ) {
    return 'Unable to connect to ARCO Workplace. Please check that the server is running and try again.';
  }

  return defaultMessage;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const lastActivityRef = useRef<number>(Date.now());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount, check if we have a valid token and load user
  useEffect(() => {
    const initAuth = async () => {
      const token = tokenStorage.getAccess();
      if (!token) {
        dispatch({ type: 'AUTH_LOGOUT' });
        return;
      }
      try {
        const user = await authApi.me();
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } catch {
        tokenStorage.clearTokens();
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };
    initAuth();
  }, []);

  // Update last activity timestamp (debounced to avoid performance cost)
  const recordActivity = useCallback(() => {
    if (debounceTimerRef.current) return;
    debounceTimerRef.current = setTimeout(() => {
      lastActivityRef.current = Date.now();
      debounceTimerRef.current = null;
    }, 1000);
  }, []);

  // Session Inactivity & Idle Timeout Monitor
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= IDLE_TIMEOUT_MS) {
        // Inactivity timeout exceeded -> auto logout
        tokenStorage.clearTokens();
        dispatch({
          type: 'AUTH_LOGOUT',
          payload: 'Your session has expired due to inactivity. Please sign in again.',
        });
      } else if (elapsed >= WARNING_TRIGGER_MS) {
        // Within 5 minutes of timeout -> show warning modal with countdown
        const remainingSeconds = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
        dispatch({
          type: 'SET_SESSION_WARNING',
          payload: { show: true, remainingSeconds },
        });
      } else {
        if (state.showSessionWarning) {
          dispatch({
            type: 'SET_SESSION_WARNING',
            payload: { show: false, remainingSeconds: 300 },
          });
        }
      }
    }, 1000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, recordActivity));
      clearInterval(interval);
    };
  }, [state.isAuthenticated, state.showSessionWarning, recordActivity]);

  const continueSession = async () => {
    lastActivityRef.current = Date.now();
    dispatch({
      type: 'SET_SESSION_WARNING',
      payload: { show: false, remainingSeconds: 300 },
    });
    try {
      await authApi.me();
    } catch {
      // ignore ping failure
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const result = await authApi.login(email, password);

      if ('status' in result && result.status === 'otp_required') {
        dispatch({
          type: 'AUTH_PENDING_OTP',
          payload: {
            temp_token: result.temp_token,
            email: result.email,
            expires_in: result.expires_in || 300,
          },
        });
        return false; // OTP required
      }

      if ('access' in result) {
        tokenStorage.setTokens(result.access, result.refresh);
        dispatch({ type: 'AUTH_SUCCESS', payload: result.user });
        lastActivityRef.current = Date.now();
        return true; // Directly logged in
      }

      return false;
    } catch (error: unknown) {
      const message = getFormattedAuthError(error, 'Invalid email or password.');
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  };

  const verifyOTP = async (otp: string) => {
    if (!state.pendingLogin) {
      throw new Error('No pending verification session.');
    }
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const data = await authApi.verifyOTP({
        temp_token: state.pendingLogin.temp_token,
        otp,
      });
      tokenStorage.setTokens(data.access, data.refresh);
      dispatch({ type: 'AUTH_SUCCESS', payload: data.user });
      lastActivityRef.current = Date.now();
    } catch (error: unknown) {
      const message = getFormattedAuthError(error, 'Invalid verification code.');
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  };

  const resendOTP = async () => {
    if (!state.pendingLogin) return;
    try {
      const result = await authApi.resendOTP({
        temp_token: state.pendingLogin.temp_token,
      });
      dispatch({
        type: 'AUTH_PENDING_OTP',
        payload: {
          temp_token: result.temp_token,
          email: result.email || state.pendingLogin.email,
          expires_in: result.expires_in || 300,
        },
      });
    } catch (error: unknown) {
      const message = getFormattedAuthError(error, 'Failed to resend code.');
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  };

  const cancelPendingLogin = () => {
    dispatch({ type: 'CLEAR_PENDING' });
  };

  const logout = async () => {
    const refreshToken = tokenStorage.getRefresh();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore errors on logout
      }
    }
    tokenStorage.clearTokens();
    dispatch({ type: 'AUTH_LOGOUT' });
  };

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        verifyOTP,
        resendOTP,
        cancelPendingLogin,
        logout,
        clearError,
        continueSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
