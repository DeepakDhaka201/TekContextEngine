// Project enums
export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}


// Index mode enums (formerly sync mode)
export enum IndexMode {
  MANUAL = 'manual',
  AUTO = 'auto',
  WEBHOOK = 'webhook',
}

// Legacy alias for backward compatibility
export const SyncMode = IndexMode;

// Legacy enums - now handled by IndexJob system

// File enums
export enum FileStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
  IGNORED = 'ignored',
}

export enum DocumentType {
  MARKDOWN = 'markdown',
  PDF = 'pdf',
  TEXT = 'text',
  HTML = 'html',
  OTHER = 'other',
}

// Codebase enums
export enum CodebaseStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  ACTIVE = 'active',
  ERROR = 'error',
  ARCHIVED = 'archived',
}