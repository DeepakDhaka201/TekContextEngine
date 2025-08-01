export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  files: GitFileChange[];
}

export interface GitFileChange {
  path: string;
  operation: 'A' | 'M' | 'D' | 'R'; // Added, Modified, Deleted, Renamed
  oldPath?: string; // For renames
}
