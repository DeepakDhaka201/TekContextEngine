/**
 * @fileoverview Shared utility functions for the AgentHub system
 * @module shared/utils
 * @requires None - Pure utility functions
 * 
 * This file provides common utility functions used throughout the AgentHub system.
 * These functions are designed to be pure, reusable, and well-tested.
 * 
 * Key concepts:
 * - ID generation for consistent unique identifiers
 * - Timeout utilities for async operations
 * - Type checking and validation helpers
 * - Common data manipulation functions
 * 
 * @example
 * ```typescript
 * import { generateId, withTimeout } from '@/shared/utils';
 * 
 * const id = generateId('user');
 * const result = await withTimeout(slowOperation(), 5000);
 * ```
 * 
 * @since 1.0.0
 */

/**
 * Generates a unique identifier with an optional prefix.
 * 
 * Creates identifiers that are:
 * - Unique across the application
 * - Sortable by creation time
 * - Human-readable with meaningful prefixes
 * - URL-safe (no special characters)
 * 
 * @param prefix - Optional prefix for the ID (default: 'id')
 * @returns A unique identifier string
 * 
 * @example
 * ```typescript
 * const sessionId = generateId('ses');     // 'ses_1691234567890_abc123'
 * const userId = generateId('user');       // 'user_1691234567890_def456'
 * const defaultId = generateId();          // 'id_1691234567890_ghi789'
 * ```
 * 
 * Implementation notes:
 * - Uses timestamp for sortability and uniqueness
 * - Adds random suffix to prevent collisions
 * - Base36 encoding for compact representation
 * - Total length typically 20-25 characters
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Wraps a promise with a timeout.
 * 
 * Useful for preventing operations from hanging indefinitely
 * and providing predictable failure modes.
 * 
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message for timeout (optional)
 * @returns Promise that resolves/rejects with timeout
 * @throws {TimeoutError} When the operation times out
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await withTimeout(
 *     fetch('/api/slow-endpoint'),
 *     5000,
 *     'API request timed out'
 *   );
 * } catch (error) {
 *   if (error.name === 'TimeoutError') {
 *     console.log('Request timed out');
 *   }
 * }
 * ```
 * 
 * Implementation notes:
 * - Race between the original promise and timeout
 * - Timeout promise always rejects
 * - Original promise continues even after timeout
 * - Memory leak prevention with proper cleanup
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`);
      error.name = 'TimeoutError';
      reject(error);
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle);
    throw error;
  }
}

/**
 * Checks if a value is a plain object (not an array, null, or other type).
 * 
 * @param value - The value to check
 * @returns True if value is a plain object
 * 
 * @example
 * ```typescript
 * isPlainObject({});           // true
 * isPlainObject({ a: 1 });     // true
 * isPlainObject([]);           // false
 * isPlainObject(null);         // false
 * isPlainObject('string');     // false
 * ```
 */
export function isPlainObject(value: any): value is Record<string, any> {
  return value !== null && 
         typeof value === 'object' && 
         !Array.isArray(value) &&
         !(value instanceof Date) &&
         !(value instanceof Error);
}

/**
 * Deep merges two or more objects.
 * 
 * Creates a new object with properties from all source objects.
 * Later sources override earlier sources for conflicting keys.
 * 
 * @param target - The target object to merge into
 * @param sources - Source objects to merge
 * @returns New merged object
 * 
 * @example
 * ```typescript
 * const config = deepMerge(
 *   { database: { host: 'localhost', port: 5432 } },
 *   { database: { port: 3306, ssl: true } }
 * );
 * // Result: { database: { host: 'localhost', port: 3306, ssl: true } }
 * ```
 */
export function deepMerge<T = any>(target: any, ...sources: any[]): T {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key in source) {
      if (isPlainObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

/**
 * Creates a deep copy of an object or array.
 * 
 * @param obj - The object to clone
 * @returns Deep copy of the object
 * 
 * @example
 * ```typescript
 * const original = { nested: { value: 42 } };
 * const copy = deepClone(original);
 * copy.nested.value = 99;
 * console.log(original.nested.value); // Still 42
 * ```
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (isPlainObject(obj)) {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        (cloned as any)[key] = deepClone((obj as any)[key]);
      }
    }
    return cloned;
  }
  
  // For other object types, return as-is
  return obj;
}

/**
 * Debounces a function call.
 * 
 * Ensures a function is called at most once per time period,
 * useful for performance optimization and rate limiting.
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 * 
 * @example
 * ```typescript
 * const debouncedSave = debounce((data) => {
 *   console.log('Saving:', data);
 * }, 1000);
 * 
 * debouncedSave('data1'); // Will be called
 * debouncedSave('data2'); // Cancels previous, will be called
 * debouncedSave('data3'); // Cancels previous, will be called after 1s
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), wait);
  };
}

/**
 * Throttles a function call.
 * 
 * Ensures a function is called at most once per time period,
 * executing immediately and then ignoring subsequent calls.
 * 
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 * 
 * @example
 * ```typescript
 * const throttledLog = throttle((message) => {
 *   console.log(message);
 * }, 1000);
 * 
 * throttledLog('msg1'); // Logs immediately
 * throttledLog('msg2'); // Ignored
 * throttledLog('msg3'); // Ignored
 * // After 1 second, next call will work
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Retries an async operation with exponential backoff.
 * 
 * @param operation - Async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Promise that resolves with the operation result
 * 
 * @example
 * ```typescript
 * const result = await retry(
 *   async () => {
 *     const response = await fetch('/api/unreliable');
 *     if (!response.ok) throw new Error('Request failed');
 *     return response.json();
 *   },
 *   3,  // 3 attempts
 *   500 // Start with 500ms delay
 * );
 * ```
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't delay after the last attempt
      if (attempt === maxAttempts) {
        break;
      }
      
      // Exponential backoff: baseDelay * 2^(attempt-1)
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Sanitizes a string for use as an identifier.
 * 
 * @param str - String to sanitize
 * @returns Sanitized string safe for use as identifier
 * 
 * @example
 * ```typescript
 * sanitizeId('My Module!');     // 'my-module'
 * sanitizeId('API_v2.0');       // 'api-v2-0'
 * sanitizeId('  spaces  ');     // 'spaces'
 * ```
 */
export function sanitizeId(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/**
 * Formats bytes into a human-readable string.
 * 
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 * 
 * @example
 * ```typescript
 * formatBytes(1024);        // '1.00 KB'
 * formatBytes(1234567);     // '1.18 MB'
 * formatBytes(1234567890);  // '1.15 GB'
 * ```
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Checks if code is running in development environment.
 * 
 * @returns True if in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Checks if code is running in production environment.
 * 
 * @returns True if in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Checks if code is running in test environment.
 * 
 * @returns True if in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}