/**
 * User-related type definitions
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest'
}

export interface UserCreateRequest {
  name: string;
  email: string;
  role?: UserRole;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  role?: UserRole;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface UserProfile extends User {
  avatar?: string;
  bio?: string;
  status: UserStatus;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
}
