import { GitConfig } from '@/config/git.config';

export interface CloneOptions {
  branch?: string;
  depth?: number;
  sparseCheckout?: string[];
  gitConfig?: GitConfig;
}

export interface DiffOptions {
  fromCommit?: string;
  toCommit?: string;
  nameOnly?: boolean;
  includeContent?: boolean;
}
