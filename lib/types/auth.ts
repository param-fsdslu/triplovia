/**
 * Auth and user profile type definitions.
 *
 * User and UserProfile represent the profiles table, which is populated when an
 * auth user is created (lib/firebase/auth/users.ts). Firebase Authentication stores
 * email/password; the profiles table stores additional display info.
 *
 * Auth form types (LoginFormData, RegisterFormData, etc.) are used by React Hook Form
 * schemas in the auth components. Zod validation is defined alongside each form component.
 */

// Auth & User domain types

import type { UserRole } from './common';

// User Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  profile_image?: string;
  user_type: UserRole;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  bookings_count?: number;
  reviews_count?: number;
  wishlist_count?: number;
}

// Auth Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}
