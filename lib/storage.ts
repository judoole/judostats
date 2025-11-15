/**
 * Storage abstraction for competitions, matches, and techniques
 * SQLite-only implementation using better-sqlite3
 */

// Re-export types and interfaces
export type {
  StoredCompetition,
  StoredCategory,
  StoredMatch,
  CompetitorData,
  TechniqueData,
  JudokaProfile,
} from './sqlite-storage';

// Export storage factory function - SQLite only
export function createStorage() {
  const { SqliteStorage } = require('./sqlite-storage');
  return new SqliteStorage();
}

// Default export - SQLite only
export { SqliteStorage as default } from './sqlite-storage';
