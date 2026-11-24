import apiClient from './client';
import type {
  LoginResult,
  LoginResponse,
  LoginPendingResponse,
  OTPVerifyRequest,
  OTPResendRequest,
  ForgotPasswordRequest,
  VerifyResetOTPRequest,
  ResetPasswordRequest,
  User,
} from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResult> => {
    const response = await apiClient.post('/auth/login/', { email, password });
    return response.data;
  },

  verifyOTP: async (data: OTPVerifyRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/verify-otp/', data);
    return response.data;
  },

  resendOTP: async (data: OTPResendRequest): Promise<LoginPendingResponse> => {
    const response = await apiClient.post('/auth/resend-otp/', data);
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ message: string; temp_token?: string; email?: string }> => {
    const response = await apiClient.post('/auth/forgot-password/', data);
    return response.data;
  },

  verifyResetOTP: async (data: VerifyResetOTPRequest): Promise<{ message: string; reset_token: string }> => {
    const response = await apiClient.post('/auth/verify-reset-otp/', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/reset-password/', data);
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout/', { refresh: refreshToken });
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  },

  changePassword: async (data: { current_password?: string; old_password?: string; new_password: string; confirm_password?: string }): Promise<{ message: string }> => {
    const payload = {
      current_password: data.current_password || data.old_password,
      new_password: data.new_password,
      confirm_password: data.confirm_password,
    };
    const response = await apiClient.post('/auth/change-password/', payload);
    return response.data;
  },
};
