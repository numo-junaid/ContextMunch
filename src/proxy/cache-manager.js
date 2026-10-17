/**
 * ContextMunch - SQLite Cache Manager
 * Embedded SQLite cache layer tracking AST token signatures and deduplication hits.
 * Powered by Node.js native node:sqlite DatabaseSync for zero native compilation overhead.
 */

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { MODEL_PRICING } from '../ast/token-estimator.js';

export class CacheManager {
  /**
   * Initializes the SQLite cache database.
   * @param {string} dbPath - File path to sqlite database
   */
  constructor(dbPath = '.contextmunch/cache.db') {
    if (dbPath === ':memory:') {
      this.dbPath = ':memory:';
      this.db = new DatabaseSync(':memory:');
    } else {
      this.dbPath = path.resolve(dbPath);
      this.dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(this.dbDir)) {
        fs.mkdirSync(this.dbDir, { recursive: true });
      }
      this.db = new DatabaseSync(this.dbPath);
    }
    this._initTables();
  }

  /**
   * Initialize table schemas.
   */
  _initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS token_cache (
        hash TEXT PRIMARY KEY,
        file_path TEXT,
        original_tokens INTEGER NOT NULL,
        compressed_tokens INTEGER NOT NULL,
        tokens_saved INTEGER NOT NULL,
        reduction_pct REAL NOT NULL,
        compressed_code TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_accessed INTEGER NOT NULL,
        hits INTEGER DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_token_cache_hash ON token_cache(hash);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_type TEXT,
        tokens_original INTEGER,
        tokens_compressed INTEGER,
        tokens_saved INTEGER,
        reduction_pct REAL,
        created_at INTEGER
      );
    `);
  }

  /**
   * Generates a deterministic SHA-256 signature for code and compression options.
   * @param {string} code - Source code
   * @param {object} options - Compression options
   * @returns {string} Hex hash
   */
  generateSignature(code, options = {}) {
    const serializedOpts = JSON.stringify({
      stripComments: options.stripComments ?? true,
      stripTypes: options.stripTypes ?? true,
      stripBoilerplate: options.stripBoilerplate ?? true,
      stripLogging: options.stripLogging ?? true,
      abstractJSX: options.abstractJSX || 'compact',
      compactOutput: options.compactOutput || false
    });

    return crypto
      .createHash('sha256')
      .update(`${code}::${serializedOpts}`)
      .digest('hex');
  }

  /**
   * Look up cached compressed code by signature.
   * @param {string} code - Original source code
   * @param {object} options - Compression options
   * @returns {object|null} Cached record
   */
  get(code, options = {}) {
    const hash = this.generateSignature(code, options);
    const query = this.db.prepare('SELECT * FROM token_cache WHERE hash = ?');
    const row = query.get(hash);

    if (row) {
      // Increment hit counter and update access timestamp
      const update = this.db.prepare(`
        UPDATE token_cache 
        SET hits = hits + 1, last_accessed = ? 
        WHERE hash = ?
      `);
      update.run(Date.now(), hash);

      return {
        hash: row.hash,
        filePath: row.file_path,
        compressedCode: row.compressed_code,
        metrics: {
          tokens: {
            original: row.original_tokens,
            compressed: row.compressed_tokens,
            saved: row.tokens_saved,
            reductionPct: row.reduction_pct
          }
        },
        hits: row.hits + 1,
        fromCache: true
      };
    }

    return null;
  }

  /**
   * Cache newly compressed code result.
   * @param {string} code - Original code
   * @param {object} options - Compression options
   * @param {object} result - Compression result { compressedCode, metrics }
   * @param {string} filePath - Optional source file label
   */
  set(code, options = {}, result = {}, filePath = 'inline') {
    const hash = this.generateSignature(code, options);
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO token_cache (
        hash, file_path, original_tokens, compressed_tokens,
        tokens_saved, reduction_pct, compressed_code,
        created_at, last_accessed, hits
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    stmt.run(
      hash,
      filePath,
      result.metrics?.tokens?.original || 0,
      result.metrics?.tokens?.compressed || 0,
      result.metrics?.tokens?.saved || 0,
      result.metrics?.tokens?.reductionPct || 0,
      result.compressedCode || '',
      now,
      now
    );

    // Record audit log entry
    this.recordAudit(
      'compression',
      result.metrics?.tokens?.original || 0,
      result.metrics?.tokens?.compressed || 0,
      result.metrics?.tokens?.saved || 0,
      result.metrics?.tokens?.reductionPct || 0
    );
  }

  /**
   * Record transaction audit log.
   */
  recordAudit(type, orig, comp, saved, pct) {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (request_type, tokens_original, tokens_compressed, tokens_saved, reduction_pct, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(type, orig, comp, saved, pct, Date.now());
  }

  /**
   * Retrieve aggregate statistics from the SQLite cache.
   * @returns {object} Overall cache and savings metrics
   */
  getStats() {
    const totalRow = this.db.prepare(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(hits) as total_hits,
        SUM(tokens_saved * hits) as cumulative_tokens_saved,
        SUM(original_tokens * hits) as cumulative_original_tokens,
        AVG(reduction_pct) as avg_reduction_pct
      FROM token_cache
    `).get() || {};

    const cumulativeTokensSaved = totalRow.cumulative_tokens_saved || 0;
    const cumulativeOriginalTokens = totalRow.cumulative_original_tokens || 0;

    // Dollar savings calculation across models
    const cumulativeDollarSavings = {};
    for (const [key, meta] of Object.entries(MODEL_PRICING)) {
      const savedDollars = (cumulativeTokensSaved * meta.costPer1MTokens) / 1_000_000;
      cumulativeDollarSavings[key] = {
        modelName: meta.name,
        costPer1MTokens: meta.costPer1MTokens,
        savedDollars: Number(savedDollars.toFixed(4))
      };
    }

    const recentLogs = this.db.prepare(`
      SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10
    `).all() || [];

    return {
      totalEntries: totalRow.total_entries || 0,
      totalHits: totalRow.total_hits || 0,
      cumulativeTokensSaved,
      cumulativeOriginalTokens,
      avgReductionPct: Number((totalRow.avg_reduction_pct || 0).toFixed(2)),
      cumulativeDollarSavings,
      recentLogs
    };
  }

  /**
   * Clears the cache completely.
   */
  clear() {
    this.db.exec('DELETE FROM token_cache; DELETE FROM audit_logs;');
  }

  /**
   * Closes the database connection cleanly.
   */
  close() {
    this.db.close();
  }
}

// Global default singleton instance
export const defaultCache = new CacheManager();
export default CacheManager;
