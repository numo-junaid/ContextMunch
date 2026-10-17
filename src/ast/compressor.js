/**
 * ContextMunch - AST Compressor Engine
 * Compiler-grade AST transformations for aggressive LLM token slashing.
 * Strips comments, type annotations, and repetitive boilerplate while preserving execution semantics.
 */

import * as traverseMod from '@babel/traverse';
import * as generatorMod from '@babel/generator';
import * as t from '@babel/types';
import { parseCode, parseFile, scanDirectory } from './parser.js';
import { calculateSavings, formatSavingsReport } from './token-estimator.js';

// Resilient ESM/CJS interop for Babel modules
const traverse = traverseMod.default?.default || traverseMod.default || traverseMod;
const generate = generatorMod.default?.default || generatorMod.default || generatorMod;

/**
 * Default compression configuration
 */
export const DEFAULT_COMPRESSION_OPTIONS = {
  stripComments: true,
  stripTypes: true,
  stripBoilerplate: true,
  stripLogging: true,
  preserveErrorsAndWarnings: true,
  abstractJSX: 'compact', // 'none' | 'compact' | 'signature'
  compactOutput: false,
  filename: 'source.tsx'
};

/**
 * Strips all comment nodes from an AST.
 * @param {object} ast - Babel AST
 */
export function stripAllComments(ast) {
  if (!ast) return;
  ast.comments = [];

  traverse(ast, {
    enter(path) {
      if (path.node.leadingComments) path.node.leadingComments = null;
      if (path.node.trailingComments) path.node.trailingComments = null;
      if (path.node.innerComments) path.node.innerComments = null;
    }
  });
}

/**
 * Compiles a dense semantic string signature for JSX elements (Context Compression Loop).
 * Recursively distills UI structures down to their core architectural signature.
 * @param {object} node - JSXElement or JSXFragment node
 * @returns {string} Dense structural description
 */
export function summarizeJSXNode(node) {
  if (!node) return '';

  if (t.isJSXFragment(node)) {
    const childrenSummaries = (node.children || [])
      .map(c => summarizeJSXNode(c))
      .filter(Boolean);
    return childrenSummaries.join(', ');
  }

  if (t.isJSXElement(node)) {
    const opening = node.openingElement;
    let name = 'element';

    if (t.isJSXIdentifier(opening.name)) {
      name = opening.name.name;
    } else if (t.isJSXMemberExpression(opening.name)) {
      name = `${opening.name.object.name}.${opening.name.property.name}`;
    }

    // Collapse SVG clutter completely into a single token
    if (name.toLowerCase() === 'svg' || name.toLowerCase() === 'path') {
      return '<Icon/>';
    }

    // Extract key semantic props (id, name, type, onClick, to, href, key)
    const keyProps = (opening.attributes || [])
      .filter(attr => t.isJSXAttribute(attr) && attr.name)
      .map(attr => {
        const propName = attr.name.name;
        if (['id', 'name', 'type', 'to', 'href', 'title', 'placeholder'].includes(propName)) {
          if (t.isStringLiteral(attr.value)) return `${propName}="${attr.value.value}"`;
        }
        if (propName.startsWith('on')) return propName;
        return null;
      })
      .filter(Boolean);

    const propStr = keyProps.length > 0 ? `(${keyProps.join(' ')})` : '';

    // Summarize children
    const childSummaries = (node.children || [])
      .map(child => {
        if (t.isJSXText(child)) {
          const trimmed = child.value.trim();
          return trimmed ? `"${trimmed.slice(0, 20)}${trimmed.length > 20 ? '…' : ''}"` : null;
        }
        if (t.isJSXExpressionContainer(child)) {
          if (t.isIdentifier(child.expression)) return `{${child.expression.name}}`;
          return '{expr}';
        }
        if (t.isJSXElement(child)) {
          return summarizeJSXNode(child);
        }
        return null;
      })
      .filter(Boolean);

    if (childSummaries.length === 0) {
      return `<${name}${propStr}/>`;
    }

    return `<${name}${propStr}>[${childSummaries.join(', ')}]</${name}>`;
  }

  return '';
}

/**
 * Transforms an AST by stripping TypeScript declarations, redundant boilerplate,
 * inline comments, and compressing heavy UI trees.
 * 
 * @param {object} ast - Babel AST
 * @param {object} options - Compression rules
 * @returns {object} Transformed AST
 */
export function transformAST(ast, options = {}) {
  const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };

  // 1. Strip comments at root and AST level
  if (opts.stripComments) {
    stripAllComments(ast);
  }

  // 2. Traversal passes
  traverse(ast, {
    // ─── Comment Stripping per Node ───────────────────────────────────
    enter(path) {
      if (opts.stripComments) {
        if (path.node.leadingComments) path.node.leadingComments = null;
        if (path.node.trailingComments) path.node.trailingComments = null;
        if (path.node.innerComments) path.node.innerComments = null;
      }
    },

    // ─── TypeScript Type Stripping (Semantics Preserved) ───────────────
    TSInterfaceDeclaration(path) {
      if (opts.stripTypes) {
        path.remove();
      }
    },
    TSTypeAliasDeclaration(path) {
      if (opts.stripTypes) {
        path.remove();
      }
    },
    TSTypeAnnotation(path) {
      if (opts.stripTypes) {
        path.remove();
      }
    },
    TSTypeParameterDeclaration(path) {
      if (opts.stripTypes) {
        path.remove();
      }
    },
    TSTypeParameterInstantiation(path) {
      if (opts.stripTypes) {
        path.remove();
      }
    },
    TSAsExpression(path) {
      if (opts.stripTypes) {
        path.replaceWith(path.node.expression);
      }
    },
    TSTypeAssertion(path) {
      if (opts.stripTypes) {
        path.replaceWith(path.node.expression);
      }
    },
    TSNonNullExpression(path) {
      if (opts.stripTypes) {
        path.replaceWith(path.node.expression);
      }
    },
    TSDeclareFunction(path) {
      if (opts.stripTypes) {
        path.remove();
      }
    },
    TSIndexSignature(path) {
      if (opts.stripTypes) {
        path.remove();
      }
    },
    TSModuleDeclaration(path) {
      if (opts.stripTypes && path.node.declare) {
        path.remove();
      }
    },
    ClassProperty(path) {
      if (opts.stripTypes) {
        path.node.typeAnnotation = null;
        if (path.node.accessibility) delete path.node.accessibility;
        if (path.node.readonly) delete path.node.readonly;
      }
    },
    ClassPrivateProperty(path) {
      if (opts.stripTypes) {
        path.node.typeAnnotation = null;
      }
    },
    TSParameterProperty(path) {
      if (opts.stripTypes) {
        // Unwrap parameter property to normal param (e.g. `private config = {}` -> `config = {}`)
        path.replaceWith(path.node.parameter);
      }
    },
    ClassMethod(path) {
      if (opts.stripTypes) {
        if (path.node.accessibility) delete path.node.accessibility;
        path.node.returnType = null;
        path.node.typeParameters = null;
      }
    },
    Function(path) {
      if (opts.stripTypes) {
        path.node.returnType = null;
        path.node.typeParameters = null;
        for (const param of path.node.params) {
          if (param.typeAnnotation) param.typeAnnotation = null;
          if (t.isAssignmentPattern(param) && param.left.typeAnnotation) {
            param.left.typeAnnotation = null;
          }
        }
      }
    },

    // ─── Repetitive Boilerplate & Noise Elimination ───────────────────
    EmptyStatement(path) {
      if (opts.stripBoilerplate) {
        path.remove();
      }
    },

    // Strip debug / tracing console logs while preserving errors & warnings
    CallExpression(path) {
      if (opts.stripLogging) {
        const callee = path.node.callee;
        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.object, { name: 'console' }) &&
          t.isIdentifier(callee.property)
        ) {
          const method = callee.property.name;
          const isErrorOrWarn = ['error', 'warn'].includes(method);

          if (!opts.preserveErrorsAndWarnings || !isErrorOrWarn) {
            // If statement is standalone console.log(...); remove entire statement
            if (path.parentPath.isExpressionStatement()) {
              path.parentPath.remove();
            } else {
              // If part of expression, replace with undefined
              path.replaceWith(t.identifier('undefined'));
            }
          }
        }
      }
    },

    // Strip empty JSXExpressionContainer nodes ({/* comment */} leaves empty {})
    JSXExpressionContainer(path) {
      if (t.isJSXEmptyExpression(path.node.expression)) {
        path.remove();
      }
    },

    // Strip React PropTypes (Component.propTypes = { ... })
    AssignmentExpression(path) {
      if (opts.stripBoilerplate) {
        const left = path.node.left;
        if (
          t.isMemberExpression(left) &&
          t.isIdentifier(left.property, { name: 'propTypes' })
        ) {
          if (path.parentPath.isExpressionStatement()) {
            path.parentPath.remove();
          }
        }
      }
    },

    // ─── Context Compression Loop: JSX / UI Tree Reduction ───────────
    JSXElement(path) {
      const opening = path.node.openingElement;

      // 1. Collapse SVG vectors into concise semantic <Icon/>
      if (t.isJSXIdentifier(opening.name, { name: 'svg' })) {
        const iconElement = t.jsxElement(
          t.jsxOpeningElement(t.jsxIdentifier('Icon'), [], true),
          null,
          [],
          true
        );
        path.replaceWith(iconElement);
        return;
      }

      // 2. Heavy Tailwind / CSS class attribute minimization
      if (opts.abstractJSX === 'compact' || opts.abstractJSX === 'signature') {
        opening.attributes = (opening.attributes || []).map(attr => {
          if (
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name, { name: 'className' }) &&
            t.isStringLiteral(attr.value)
          ) {
            const classValue = attr.value.value;
            // Retain layout clues, eliminate verbose micro-styles
            const tokens = classValue.split(/\s+/).filter(cls => {
              return (
                cls.startsWith('flex') ||
                cls.startsWith('grid') ||
                cls.startsWith('hidden') ||
                cls.includes('modal') ||
                cls.includes('card') ||
                cls.includes('btn') ||
                cls.includes('container')
              );
            });
            const condensed = tokens.slice(0, 3).join(' ');
            return condensed ? t.jsxAttribute(attr.name, t.stringLiteral(condensed)) : null;
          }
          return attr;
        }).filter(Boolean);
      }
    },

    // 3. Signature mode: Abstract heavy return JSX inside components to dense structural signature
    ReturnStatement(path) {
      if (opts.abstractJSX === 'signature') {
        const arg = path.node.argument;
        if (arg && (t.isJSXElement(arg) || t.isJSXFragment(arg))) {
          const signature = summarizeJSXNode(arg);
          const signatureComment = `/* UI-Tree: ${signature} */`;
          
          // Replace with concise semantic return stub
          const stubElement = t.jsxElement(
            t.jsxOpeningElement(
              t.jsxIdentifier('UIStub'),
              [t.jsxAttribute(t.jsxIdentifier('signature'), t.stringLiteral(signature))],
              true
            ),
            null,
            [],
            true
          );
          path.node.argument = stubElement;
        }
      }
    }
  });

  return ast;
}

/**
 * Emits code from transformed AST with optimal LLM context settings.
 * @param {object} ast - Transformed AST
 * @param {object} options - Generator options
 * @returns {string} Emitted code string
 */
export function emitCode(ast, options = {}) {
  const genResult = generate(ast, {
    comments: false,
    compact: options.compactOutput || false,
    concise: false,
    retainLines: false,
    minified: false,
    jsescOption: { minimal: true }
  });

  let code = genResult.code || '';

  // Clean excessive blank lines (collapse 3+ newlines to max 1-2 newlines)
  code = code.replace(/\n{3,}/g, '\n\n').trim();

  return code;
}

/**
 * Main compilation entry point.
 * Ingests raw source code, strips comments/types/boilerplate, emits minified code,
 * and performs precision token estimation & dollar savings calculation.
 * 
 * @param {string} sourceCode - Raw JS, TS, or JSX code
 * @param {object} options - Compression and parsing options
 * @returns {object} { compressedCode, ast, metrics, report }
 */
export function compressCode(sourceCode, options = {}) {
  const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };
  const filename = opts.filename || 'source.tsx';

  if (!sourceCode || typeof sourceCode !== 'string') {
    return {
      compressedCode: '',
      ast: null,
      metrics: calculateSavings('', ''),
      report: ''
    };
  }

  // 1. Parse AST
  const ast = parseCode(sourceCode, { filename });

  // 2. Transform AST (Compiler Passes)
  transformAST(ast, opts);

  // 3. Emit clean code
  const compressedCode = emitCode(ast, opts);

  // 4. Token & Financial Metrics Calculation
  const metrics = calculateSavings(sourceCode, compressedCode);
  const report = formatSavingsReport(metrics, filename);

  return {
    compressedCode,
    ast,
    metrics,
    report,
    filename
  };
}

/**
 * Ingests a local file, parses, compresses, and returns metrics.
 * @param {string} filePath - Path to file
 * @param {object} options - Compression options
 * @returns {object} Compression result
 */
export function compressFile(filePath, options = {}) {
  const { code } = parseFile(filePath, options);
  return compressCode(code, { ...options, filename: filePath });
}

/**
 * Compresses an entire directory codebase, aggregating token reduction and monetary savings.
 * @param {string} dirPath - Codebase directory
 * @param {object} options - Compression options
 * @returns {object} { files, aggregateMetrics, summaryReport }
 */
export function compressDirectory(dirPath, options = {}) {
  const files = scanDirectory(dirPath, options);
  const results = [];

  let combinedOriginal = '';
  let combinedCompressed = '';

  for (const file of files) {
    try {
      const res = compressCode(file.code, { ...options, filename: file.filePath });
      results.push({
        filePath: file.filePath,
        relativePath: file.relativePath,
        originalCode: file.code,
        compressedCode: res.compressedCode,
        metrics: res.metrics
      });

      combinedOriginal += `\n/* File: ${file.relativePath} */\n${file.code}`;
      combinedCompressed += `\n/* File: ${file.relativePath} */\n${res.compressedCode}`;
    } catch (err) {
      console.warn(`[ContextMunch] Skipped ${file.relativePath}: ${err.message}`);
    }
  }

  const aggregateMetrics = calculateSavings(combinedOriginal, combinedCompressed);
  const summaryReport = formatSavingsReport(aggregateMetrics, `Directory: ${dirPath} (${results.length} files)`);

  return {
    files: results,
    totalFiles: results.length,
    aggregateMetrics,
    summaryReport
  };
}

// Default export
export default {
  compressCode,
  compressFile,
  compressDirectory,
  transformAST,
  emitCode,
  stripAllComments,
  summarizeJSXNode,
  DEFAULT_COMPRESSION_OPTIONS
};
