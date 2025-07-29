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

// Symbol enums
export enum SymbolKind {
  CLASS = 'class',
  INTERFACE = 'interface',
  FUNCTION = 'function',
  METHOD = 'method',
  CONSTRUCTOR = 'constructor',
  FIELD = 'field',
  VARIABLE = 'variable',
  CONSTANT = 'constant',
  ENUM = 'enum',
  ENUM_MEMBER = 'enum_member',
  MODULE = 'module',
  NAMESPACE = 'namespace',
  PACKAGE = 'package',
  TYPE = 'type',
  PARAMETER = 'parameter',
  PROPERTY = 'property',
}

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