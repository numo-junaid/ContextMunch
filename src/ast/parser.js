/**
 * ContextMunch - AST Parser Engine
 * Resilient multi-dialect JavaScript / TypeScript / JSX parser with AST extraction and directory indexing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

/**
 * Standard Babel parser plugins for modern ECMAScript, TypeScript, and JSX features.
 */
export const DEFAULT_PLUGINS = [
  'asyncGenerators',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'doExpressions',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'functionBind',
  'functionSent',
  'importMeta',
  'nullishCoalescingOperator',
  'numericSeparator',
  'objectRestSpread',
  'optionalCatchBinding',
  'optionalChaining',
  'topLevelAwait'
];

/**
 * Detect language dialect based on file extension and content hints.
 * @param {string} filename - File path or name
 * @param {string} code - Source code string
 * @returns {{ isTypeScript: boolean, isJSX: boolean, dialect: string }}
 */
export function detectDialect(filename = '', code = '') {
  const ext = path.extname(filename).toLowerCase();
  
  const isTypeScript = ext === '.ts' || ext === '.tsx' || ext === '.mts' || ext === '.cts' ||
    /:\s*(string|number|boolean|any|void|unknown|never|Record<|Array<)\b/.test(code) ||
    /\b(interface|type|declare)\s+[A-Z]/.test(code);

  const isJSX = ext === '.jsx' || ext === '.tsx' ||
    /<([A-Z][A-Za-z0-9]*|div|span|p|button|input|form|section|h[1-6]|ul|li)\b[^>]*>/.test(code) ||
    /import\s+.*\bReact\b/.test(code);

  let dialect = 'javascript';
  if (isTypeScript && isJSX) dialect = 'tsx';
  else if (isTypeScript) dialect = 'typescript';
  else if (isJSX) dialect = 'jsx';

  return { isTypeScript, isJSX, dialect };
}

/**
 * Get tailored Babel parser plugins for given dialect configuration.
 * @param {object} dialect - { isTypeScript, isJSX }
 * @param {Array} additionalPlugins - Extra custom plugins
 * @returns {Array} Plugin list
 */
export function getParserPlugins(dialect = {}, additionalPlugins = []) {
  const plugins = [...DEFAULT_PLUGINS];

  if (dialect.isTypeScript !== false) {
    plugins.push('typescript');
  }

  if (dialect.isJSX !== false) {
    plugins.push('jsx');
  }

  for (const plug of additionalPlugins) {
    if (!plugins.includes(plug)) {
      plugins.push(plug);
    }
  }

  return plugins;
}

/**
 * Parses raw code into an Abstract Syntax Tree (AST).
 * Employs a resilient fallback mechanism if dialect ambiguity arises.
 * 
 * @param {string} code - Source code text
 * @param {object} options - Parser options
 * @returns {object} Babel AST
 */
export function parseCode(code, options = {}) {
  const filename = options.filename || 'source.tsx';
  const dialect = detectDialect(filename, code);

  const parserConfig = {
    sourceType: options.sourceType || 'unambiguous',
    sourceFilename: filename,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    plugins: getParserPlugins(dialect, options.plugins || []),
    tokens: options.tokens || false,
    ranges: true,
    errorRecovery: true
  };

  try {
    return parse(code, parserConfig);
  } catch (initialError) {
    // Resilient fallback: Try parsing with both TS + JSX enabled regardless of extension
    try {
      const fallbackConfig = {
        ...parserConfig,
        plugins: getParserPlugins({ isTypeScript: true, isJSX: true }, options.plugins || [])
      };
      return parse(code, fallbackConfig);
    } catch (fallbackError) {
      throw new Error(
        `[ContextMunch AST Parser] Failed to parse ${filename} at line ${initialError.loc?.line || '?'}, column ${initialError.loc?.column || '?'}: ${initialError.message}`
      );
    }
  }
}

/**
 * Reads and parses a local file into an AST.
 * @param {string} filePath - Absolute or relative file path
 * @param {object} options - Parser options
 * @returns {{ ast: object, code: string, dialect: object, filePath: string }}
 */
export function parseFile(filePath, options = {}) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`[ContextMunch] File not found: ${resolvedPath}`);
  }

  const code = fs.readFileSync(resolvedPath, 'utf8');
  const dialect = detectDialect(resolvedPath, code);
  const ast = parseCode(code, { ...options, filename: resolvedPath });

  return { ast, code, dialect, filePath: resolvedPath };
}

/**
 * Scan a codebase directory recursively, collecting all supported JS/TS/JSX files.
 * @param {string} dirPath - Directory to scan
 * @param {object} options - Scanning filters and ignores
 * @returns {Array<{ filePath: string, relativePath: string, code: string, dialect: object }>}
 */
export function scanDirectory(dirPath, options = {}) {
  const baseDir = path.resolve(dirPath);
  const supportedExtensions = new Set(
    options.extensions || ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.mts', '.cts']
  );

  const ignoreDirs = new Set(
    options.ignoreDirs || [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      '.turbo',
      'coverage',
      '.cache',
      'public'
    ]
  );

  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name) && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (supportedExtensions.has(ext)) {
          try {
            const code = fs.readFileSync(fullPath, 'utf8');
            const dialect = detectDialect(fullPath, code);
            results.push({
              filePath: fullPath,
              relativePath: path.relative(baseDir, fullPath).replace(/\\/g, '/'),
              code,
              dialect
            });
          } catch (err) {
            // Skip unreadable files gracefully
            console.warn(`[ContextMunch] Warning: Could not read ${fullPath}: ${err.message}`);
          }
        }
      }
    }
  }

  if (fs.existsSync(baseDir)) {
    walk(baseDir);
  }

  return results;
}
