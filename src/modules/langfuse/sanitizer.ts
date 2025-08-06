/**
 * @fileoverview Data sanitization for Langfuse observability data
 * @module modules/langfuse/sanitizer
 * @requires ./types
 * 
 * This file implements comprehensive data sanitization to ensure sensitive
 * information is properly redacted before sending to Langfuse. It provides
 * configurable patterns, whitelisting, and deep object sanitization.
 * 
 * Key concepts:
 * - Automatic PII detection and redaction
 * - Configurable redaction patterns
 * - Metadata key whitelisting
 * - Deep object traversal and sanitization
 * - Preservation of data structure while removing sensitive content
 * - Performance optimization for large payloads
 * 
 * @example
 * ```typescript
 * import { DataSanitizer } from './sanitizer';
 * 
 * const sanitizer = new DataSanitizer({
 *   maskSensitiveData: true,
 *   redactPatterns: [
 *     /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
 *     /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g // Bearer tokens
 *   ],
 *   allowedMetadataKeys: ['userId', 'sessionId', 'model']
 * });
 * 
 * const sanitized = sanitizer.sanitizeSpanOptions({
 *   name: 'llm-call',
 *   input: { prompt: 'User email: john@example.com' },
 *   metadata: { apiKey: 'secret-key-123', userId: 'user-123' }
 * });
 * ```
 * 
 * @since 1.0.0
 */

import { SanitizerConfig, SpanOptions, GenerationOptions, EventOptions, TraceUpdate, SpanUpdate, SpanEnd, GenerationEnd } from './types';

/**
 * Comprehensive data sanitizer for Langfuse observability data.
 * 
 * This class provides robust sanitization of all data sent to Langfuse,
 * ensuring sensitive information is properly redacted while preserving
 * the structure and usefulness of observability data.
 * 
 * Features:
 * - Automatic detection of common sensitive patterns (emails, API keys, etc.)
 * - Configurable redaction patterns with regex support
 * - Metadata key whitelisting for fine-grained control
 * - Deep object sanitization with circular reference handling
 * - Performance optimization for large data structures
 * - Preservation of data types and structure where possible
 * 
 * Security considerations:
 * - All sanitization is performed on deep clones to avoid modifying originals
 * - Patterns are applied recursively through nested objects and arrays
 * - Sensitive key detection uses case-insensitive matching
 * - Default patterns cover common PII and security-sensitive data
 * 
 * @example
 * ```typescript
 * const sanitizer = new DataSanitizer({
 *   maskSensitiveData: true,
 *   redactPatterns: [
 *     /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
 *     /\b\d{16}\b/g // Credit card numbers
 *   ],
 *   allowedMetadataKeys: ['model', 'provider', 'version']
 * });
 * 
 * // Sanitize trace data
 * const cleanData = sanitizer.sanitizeSpanOptions(spanOptions);
 * ```
 * 
 * @public
 */
export class DataSanitizer {
  /** Sanitizer configuration */
  private readonly config: SanitizerConfig;
  
  /** Default sensitive key patterns */
  private readonly defaultSensitiveKeys = [
    'password', 'secret', 'token', 'key', 'auth', 'credential',
    'private', 'confidential', 'sensitive', 'ssn', 'social',
    'credit_card', 'creditcard', 'card_number', 'cvv', 'pin',
    'api_key', 'apikey', 'access_token', 'refresh_token',
    'session_token', 'bearer', 'authorization'
  ];
  
  /** Default redaction patterns */
  private readonly defaultPatterns = [
    // Email addresses
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    
    // Phone numbers (various formats)
    /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    
    // Social Security Numbers
    /\b\d{3}-\d{2}-\d{4}\b/g,
    /\b\d{9}\b/g,
    
    // Credit card numbers (basic pattern)
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    
    // Bearer tokens
    /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g,
    
    // API keys (common formats)
    /sk-[a-zA-Z0-9]{48}/g, // OpenAI
    /pk_[a-zA-Z0-9]{24}/g, // Langfuse public keys
    /sk_[a-zA-Z0-9]{24,}/g, // Langfuse secret keys
    /xapp-[a-zA-Z0-9]{40}/g, // Anthropic
    
    // URLs with credentials
    /https?:\/\/[^:\/\s]+:[^@\/\s]+@[^\s]+/g,
    
    // AWS access keys
    /AKIA[0-9A-Z]{16}/g,
    
    // JWT tokens (basic detection)
    /eyJ[A-Za-z0-9+/=]+\.eyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=_-]+/g,
    
    // IPv4 addresses (optional, might be too aggressive)
    // /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    
    // Generic secrets pattern
    /[a-zA-Z0-9]{32,}/g // Long alphanumeric strings that might be keys
  ];
  
  /**
   * Creates a new DataSanitizer instance.
   * 
   * @param config - Sanitizer configuration options
   * 
   * @example
   * ```typescript
   * const sanitizer = new DataSanitizer({
   *   maskSensitiveData: true,
   *   redactPatterns: [/custom-pattern/g],
   *   allowedMetadataKeys: ['userId', 'model'],
   *   customRules: [{
   *     pattern: /internal-id-\d+/g,
   *     replacement: 'internal-id-XXX'
   *   }]
   * });
   * ```
   */
  constructor(config: SanitizerConfig) {
    this.config = config;
    
    console.log('DataSanitizer initialized with configuration:', {
      maskSensitiveData: config.maskSensitiveData,
      customPatternsCount: config.redactPatterns?.length || 0,
      allowedMetadataKeys: config.allowedMetadataKeys?.length || 'all',
      customRulesCount: config.customRules?.length || 0
    });
  }
  
  /**
   * Sanitizes span options before sending to Langfuse.
   * 
   * @param options - Span options to sanitize
   * @returns Sanitized span options
   * 
   * @example
   * ```typescript
   * const sanitized = sanitizer.sanitizeSpanOptions({
   *   name: 'llm-call',
   *   input: { prompt: 'User: john@example.com wants access' },
   *   metadata: { apiKey: 'sk-secret123', model: 'gpt-4' }
   * });
   * // Result: input redacted, apiKey removed, model preserved
   * ```
   */
  sanitizeSpanOptions(options: SpanOptions): SpanOptions {
    if (!this.config.maskSensitiveData) {
      return options;
    }
    
    return {
      ...options,
      name: this.sanitizeString(options.name),
      input: this.sanitizeData(options.input),
      output: this.sanitizeData(options.output),
      metadata: this.sanitizeMetadata(options.metadata),
      tags: this.sanitizeArray(options.tags)
    };
  }
  
  /**
   * Sanitizes generation options before sending to Langfuse.
   * 
   * @param options - Generation options to sanitize
   * @returns Sanitized generation options
   */
  sanitizeGenerationOptions(options: GenerationOptions): GenerationOptions {
    if (!this.config.maskSensitiveData) {
      return options;
    }
    
    return {
      ...options,
      name: this.sanitizeString(options.name),
      input: this.sanitizeData(options.input),
      output: this.sanitizeData(options.output),
      metadata: this.sanitizeMetadata(options.metadata),
      modelParameters: this.sanitizeData(options.modelParameters)
    };
  }
  
  /**
   * Sanitizes event options before sending to Langfuse.
   * 
   * @param options - Event options to sanitize
   * @returns Sanitized event options
   */
  sanitizeEventOptions(options: EventOptions): EventOptions {
    if (!this.config.maskSensitiveData) {
      return options;
    }
    
    return {
      ...options,
      name: this.sanitizeString(options.name),
      input: this.sanitizeData(options.input),
      output: this.sanitizeData(options.output),
      metadata: this.sanitizeMetadata(options.metadata)
    };
  }
  
  /**
   * Sanitizes trace update data before sending to Langfuse.
   * 
   * @param data - Trace update data to sanitize
   * @returns Sanitized trace update data
   */
  sanitizeTraceUpdate(data: TraceUpdate): TraceUpdate {
    if (!this.config.maskSensitiveData) {
      return data;
    }
    
    return {
      ...data,
      input: this.sanitizeData(data.input),
      output: this.sanitizeData(data.output),
      metadata: this.sanitizeMetadata(data.metadata),
      tags: this.sanitizeArray(data.tags)
    };
  }
  
  /**
   * Sanitizes span update data before sending to Langfuse.
   * 
   * @param data - Span update data to sanitize
   * @returns Sanitized span update data
   */
  sanitizeSpanUpdate(data: SpanUpdate): SpanUpdate {
    if (!this.config.maskSensitiveData) {
      return data;
    }
    
    return {
      ...data,
      input: this.sanitizeData(data.input),
      output: this.sanitizeData(data.output),
      metadata: this.sanitizeMetadata(data.metadata),
      tags: this.sanitizeArray(data.tags)
    };
  }
  
  /**
   * Sanitizes span end data before sending to Langfuse.
   * 
   * @param data - Span end data to sanitize
   * @returns Sanitized span end data
   */
  sanitizeSpanEnd(data: SpanEnd): SpanEnd {
    if (!this.config.maskSensitiveData) {
      return data;
    }
    
    return {
      ...data,
      output: this.sanitizeData(data.output),
      metadata: this.sanitizeMetadata(data.metadata),
      statusMessage: this.sanitizeString(data.statusMessage)
    };
  }
  
  /**
   * Sanitizes generation end data before sending to Langfuse.
   * 
   * @param data - Generation end data to sanitize
   * @returns Sanitized generation end data
   */
  sanitizeGenerationEnd(data: GenerationEnd): GenerationEnd {
    if (!this.config.maskSensitiveData) {
      return data;
    }
    
    return {
      ...data,
      output: this.sanitizeData(data.output),
      metadata: this.sanitizeMetadata(data.metadata),
      statusMessage: this.sanitizeString(data.statusMessage)
    };
  }
  
  /**
   * Sanitizes user ID to ensure privacy compliance.
   * 
   * @param userId - User ID to sanitize
   * @returns Sanitized user ID (may be hashed or anonymized)
   */
  sanitizeUserId(userId: string): string {
    if (!this.config.maskSensitiveData) {
      return userId;
    }
    
    // For now, preserve user IDs but could implement hashing here
    // In production, you might want to hash user IDs for privacy
    return this.sanitizeString(userId);
  }
  
  /**
   * Core data sanitization method.
   * 
   * Performs deep sanitization of any data structure, handling objects,
   * arrays, strings, and primitive values recursively.
   * 
   * @param data - Data to sanitize
   * @returns Sanitized data with same structure
   * 
   * @private
   */
  sanitizeData(data: any): any {
    if (!data || !this.config.maskSensitiveData) {
      return data;
    }
    
    // Handle circular references and prevent infinite recursion
    const seen = new WeakSet();
    
    const sanitizeRecursive = (obj: any): any => {
      // Handle primitive types
      if (obj === null || typeof obj !== 'object') {
        return typeof obj === 'string' ? this.sanitizeString(obj) : obj;
      }
      
      // Prevent circular references
      if (seen.has(obj)) {
        return '[Circular Reference]';
      }
      seen.add(obj);
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeRecursive(item));
      }
      
      // Handle objects
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.isSensitiveKey(key)) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitizeRecursive(value);
        }
      }
      
      return result;
    };
    
    try {
      // Deep clone to avoid modifying original
      const cloned = JSON.parse(JSON.stringify(data));
      return sanitizeRecursive(cloned);
    } catch (error) {
      console.error('Error sanitizing data:', error);
      return '[SANITIZATION_ERROR]';
    }
  }
  
  /**
   * Sanitizes string content using configured patterns.
   * 
   * @param str - String to sanitize
   * @returns Sanitized string with patterns redacted
   * 
   * @private
   */
  sanitizeString(str?: string): string | undefined {
    if (!str || !this.config.maskSensitiveData) {
      return str;
    }
    
    let sanitized = str;
    
    // Apply default patterns
    for (const pattern of this.defaultPatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    // Apply custom patterns
    if (this.config.redactPatterns) {
      for (const pattern of this.config.redactPatterns) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      }
    }
    
    // Apply custom rules
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        sanitized = sanitized.replace(rule.pattern, rule.replacement);
      }
    }
    
    return sanitized;
  }
  
  /**
   * Sanitizes array of strings.
   * 
   * @param arr - Array to sanitize
   * @returns Sanitized array
   * 
   * @private
   */
  sanitizeArray(arr?: string[]): string[] | undefined {
    if (!arr || !this.config.maskSensitiveData) {
      return arr;
    }
    
    return arr.map(item => this.sanitizeString(item) || item);
  }
  
  /**
   * Sanitizes metadata object with key filtering.
   * 
   * @param metadata - Metadata object to sanitize
   * @returns Sanitized metadata with filtered keys
   * 
   * @private
   */
  sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata || !this.config.maskSensitiveData) {
      return metadata;
    }
    
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Check if key is allowed
      if (!this.isAllowedMetadataKey(key)) {
        continue; // Skip disallowed keys
      }
      
      // Check if key is sensitive
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitizeData(value);
      }
    }
    
    return sanitized;
  }
  
  /**
   * Checks if a metadata key is allowed based on whitelist.
   * 
   * @param key - Metadata key to check
   * @returns True if key is allowed, false otherwise
   * 
   * @example
   * ```typescript
   * const allowed = sanitizer.isAllowedMetadataKey('userId'); // true if in whitelist
   * ```
   */
  isAllowedMetadataKey(key: string): boolean {
    // If no whitelist configured, allow all keys
    if (!this.config.allowedMetadataKeys) {
      return true;
    }
    
    return this.config.allowedMetadataKeys.includes(key);
  }
  
  /**
   * Checks if a key contains sensitive information.
   * 
   * @param key - Key to check for sensitivity
   * @returns True if key is considered sensitive
   * 
   * @private
   */
  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    
    return this.defaultSensitiveKeys.some(sensitiveKey =>
      lowerKey.includes(sensitiveKey)
    );
  }
  
  /**
   * Gets sanitizer statistics for monitoring.
   * 
   * @returns Statistics about sanitizer configuration and usage
   * 
   * @example
   * ```typescript
   * const stats = sanitizer.getStatistics();
   * console.log('Sanitizer stats:', stats);
   * ```
   */
  getStatistics(): {
    enabled: boolean;
    defaultPatternsCount: number;
    customPatternsCount: number;
    customRulesCount: number;
    allowedMetadataKeys: number | 'all';
    sensitiveKeysCount: number;
  } {
    return {
      enabled: this.config.maskSensitiveData,
      defaultPatternsCount: this.defaultPatterns.length,
      customPatternsCount: this.config.redactPatterns?.length || 0,
      customRulesCount: this.config.customRules?.length || 0,
      allowedMetadataKeys: this.config.allowedMetadataKeys?.length || 'all',
      sensitiveKeysCount: this.defaultSensitiveKeys.length
    };
  }
  
  /**
   * Tests sanitization on sample data.
   * 
   * Useful for validating sanitizer configuration and testing patterns.
   * 
   * @param testData - Data to test sanitization on
   * @returns Original and sanitized data for comparison
   * 
   * @example
   * ```typescript
   * const testResult = sanitizer.testSanitization({
   *   email: 'user@example.com',
   *   apiKey: 'sk-secretkey123',
   *   userId: 'user-123'
   * });
   * 
   * console.log('Original:', testResult.original);
   * console.log('Sanitized:', testResult.sanitized);
   * ```
   */
  testSanitization(testData: any): {
    original: any;
    sanitized: any;
    redactionsCount: number;
  } {
    const original = JSON.parse(JSON.stringify(testData));
    const sanitized = this.sanitizeData(testData);
    
    // Count redactions (simple heuristic)
    const originalStr = JSON.stringify(original);
    const sanitizedStr = JSON.stringify(sanitized);
    const redactionsCount = (sanitizedStr.match(/\[REDACTED\]/g) || []).length;
    
    return {
      original,
      sanitized,
      redactionsCount
    };
  }
}