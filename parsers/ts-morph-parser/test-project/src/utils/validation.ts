import { UserCreateRequest, UserUpdateRequest, UserRole } from '../types/user';

/**
 * Validation utilities for user data
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate user name
 */
export function validateName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 50;
}

/**
 * Validate user role
 */
export function validateUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * Validate user creation data
 */
export function validateUserCreate(data: UserCreateRequest): ValidationResult {
  const errors: string[] = [];

  // Validate name
  if (!data.name || !validateName(data.name)) {
    errors.push('Name must be between 2 and 50 characters');
  }

  // Validate email
  if (!data.email || !validateEmail(data.email)) {
    errors.push('Please provide a valid email address');
  }

  // Validate role if provided
  if (data.role && !validateUserRole(data.role)) {
    errors.push('Invalid user role');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate user update data
 */
export function validateUserUpdate(data: UserUpdateRequest): ValidationResult {
  const errors: string[] = [];

  // Validate name if provided
  if (data.name !== undefined && !validateName(data.name)) {
    errors.push('Name must be between 2 and 50 characters');
  }

  // Validate email if provided
  if (data.email !== undefined && !validateEmail(data.email)) {
    errors.push('Please provide a valid email address');
  }

  // Validate role if provided
  if (data.role !== undefined && !validateUserRole(data.role)) {
    errors.push('Invalid user role');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize user input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Check if password meets requirements
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Form validation helper
 */
export class FormValidator {
  private errors: Map<string, string[]> = new Map();

  /**
   * Add validation error for a field
   */
  addError(field: string, error: string): void {
    const fieldErrors = this.errors.get(field) || [];
    fieldErrors.push(error);
    this.errors.set(field, fieldErrors);
  }

  /**
   * Check if form has any errors
   */
  hasErrors(): boolean {
    return this.errors.size > 0;
  }

  /**
   * Get errors for a specific field
   */
  getFieldErrors(field: string): string[] {
    return this.errors.get(field) || [];
  }

  /**
   * Get all errors
   */
  getAllErrors(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    this.errors.forEach((errors, field) => {
      result[field] = errors;
    });
    return result;
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors.clear();
  }

  /**
   * Clear errors for a specific field
   */
  clearField(field: string): void {
    this.errors.delete(field);
  }
}
