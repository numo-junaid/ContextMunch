/**
 * ContextMunch - Token Estimation & API Cost Utility
 * Precise BPE token counting and multi-model cost analysis against standard LLM context windows.
 */

import { encode } from 'gpt-tokenizer';

/**
 * Standard Context Window Input Token Pricing (USD per 1,000,000 tokens)
 * Benchmark rates for enterprise and developer API tiers.
 */
export const MODEL_PRICING = {
  'claude-3-5-sonnet': {
    name: 'Anthropic Claude 3.5 Sonnet',
    costPer1MTokens: 3.00,
    provider: 'Anthropic',
    category: 'Flagship'
  },
  'gpt-4o': {
    name: 'OpenAI GPT-4o',
    costPer1MTokens: 2.50,
    provider: 'OpenAI',
    category: 'Flagship'
  },
  'gemini-1-5-pro': {
    name: 'Google Gemini 1.5 Pro',
    costPer1MTokens: 1.25,
    provider: 'Google',
    category: 'High-Capability'
  },
  'claude-3-5-haiku': {
    name: 'Anthropic Claude 3.5 Haiku',
    costPer1MTokens: 0.80,
    provider: 'Anthropic',
    category: 'Fast / Lightweight'
  },
  'gpt-4o-mini': {
    name: 'OpenAI GPT-4o-mini',
    costPer1MTokens: 0.15,
    provider: 'OpenAI',
    category: 'Fast / Lightweight'
  },
  'deepseek-v3': {
    name: 'DeepSeek V3',
    costPer1MTokens: 0.14,
    provider: 'DeepSeek',
    category: 'Fast / Lightweight'
  },
  'gemini-2-0-flash': {
    name: 'Google Gemini 2.0 Flash',
    costPer1MTokens: 0.10,
    provider: 'Google',
    category: 'Ultra-Fast'
  },
  'gemini-1-5-flash': {
    name: 'Google Gemini 1.5 Flash',
    costPer1MTokens: 0.075,
    provider: 'Google',
    category: 'Ultra-Fast'
  }
};

/**
 * Counts exact tokens using Byte-Pair Encoding (BPE).
 * @param {string} text - Code or text content
 * @returns {number} Token count
 */
export function countTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  try {
    const encoded = encode(text);
    return encoded.length;
  } catch {
    // Robust heuristic fallback (~3.7 chars per token for code)
    return Math.ceil(text.length / 3.7);
  }
}

/**
 * Calculates comprehensive token reduction and dollar savings across all supported LLM models.
 * @param {string} originalCode - Original raw codebase snippet
 * @param {string} compressedCode - AST-compressed codebase snippet
 * @returns {object} Token metrics and financial analysis
 */
export function calculateSavings(originalCode, compressedCode) {
  const originalTokens = countTokens(originalCode);
  const compressedTokens = countTokens(compressedCode);
  const tokensSaved = Math.max(0, originalTokens - compressedTokens);
  
  const tokenReductionPct = originalTokens > 0
    ? Number(((tokensSaved / originalTokens) * 100).toFixed(2))
    : 0;

  const originalBytes = Buffer.byteLength(originalCode || '', 'utf8');
  const compressedBytes = Buffer.byteLength(compressedCode || '', 'utf8');
  const bytesSaved = Math.max(0, originalBytes - compressedBytes);
  const byteReductionPct = originalBytes > 0
    ? Number(((bytesSaved / originalBytes) * 100).toFixed(2))
    : 0;

  const originalLines = originalCode ? originalCode.split('\n').length : 0;
  const compressedLines = compressedCode ? compressedCode.split('\n').length : 0;
  const linesSaved = Math.max(0, originalLines - compressedLines);

  // Calculate monetary savings per model
  const modelBreakdown = {};
  for (const [modelKey, meta] of Object.entries(MODEL_PRICING)) {
    const ratePerToken = meta.costPer1MTokens / 1_000_000;
    const costOriginal = originalTokens * ratePerToken;
    const costCompressed = compressedTokens * ratePerToken;
    const savingsPerRequest = tokensSaved * ratePerToken;

    modelBreakdown[modelKey] = {
      modelName: meta.name,
      provider: meta.provider,
      category: meta.category,
      costPer1MTokens: meta.costPer1MTokens,
      costOriginal: Number(costOriginal.toFixed(6)),
      costCompressed: Number(costCompressed.toFixed(6)),
      savingsPerRequest: Number(savingsPerRequest.toFixed(6)),
      savings1k: Number((savingsPerRequest * 1_000).toFixed(4)),
      savings10k: Number((savingsPerRequest * 10_000).toFixed(2)),
      savings100k: Number((savingsPerRequest * 100_000).toFixed(2)),
      savings1M: Number((savingsPerRequest * 1_000_000).toFixed(2))
    };
  }

  return {
    tokens: {
      original: originalTokens,
      compressed: compressedTokens,
      saved: tokensSaved,
      reductionPct: tokenReductionPct
    },
    bytes: {
      original: originalBytes,
      compressed: compressedBytes,
      saved: bytesSaved,
      reductionPct: byteReductionPct
    },
    lines: {
      original: originalLines,
      compressed: compressedLines,
      saved: linesSaved
    },
    financials: {
      models: modelBreakdown,
      flagshipBenchmark: modelBreakdown['gpt-4o'],
      sonnetBenchmark: modelBreakdown['claude-3-5-sonnet'],
      summary: {
        gpt4oSavingsPer100k: modelBreakdown['gpt-4o'].savings100k,
        claudeSonnetSavingsPer100k: modelBreakdown['claude-3-5-sonnet'].savings100k,
        geminiProSavingsPer100k: modelBreakdown['gemini-1-5-pro'].savings100k
      }
    }
  };
}

/**
 * Returns formatted terminal text report for quick CLI inspection.
 * @param {object} savingsResult - Output of calculateSavings
 * @param {string} filename - Optional file label
 * @returns {string} Formatted CLI output string
 */
export function formatSavingsReport(savingsResult, filename = 'codebase') {
  const { tokens, bytes, lines, financials } = savingsResult;
  const divider = '─'.repeat(68);

  const linesOut = [
    divider,
    ` ⚡ ContextMunch AST Minifier: Token & Financial Audit [${filename}]`,
    divider,
    ` 📊 Token Metrics:`,
    `   • Original Context  : ${tokens.original.toLocaleString()} tokens (${bytes.original.toLocaleString()} bytes, ${lines.original} lines)`,
    `   • Compressed Context: ${tokens.compressed.toLocaleString()} tokens (${bytes.compressed.toLocaleString()} bytes, ${lines.compressed} lines)`,
    `   • Tokens Slashed    : ${tokens.saved.toLocaleString()} tokens`,
    `   • Reduction Rate    : ${tokens.reductionPct >= 70 ? '🔥 ' : ''}${tokens.reductionPct}% reduction`,
    divider,
    ` 💰 API Cost Savings Projections (Input Tokens):`,
    `   ${'Model'.padEnd(28)} ${'Cost/1M'.padEnd(10)} ${'Per 10k Req'.padEnd(14)} ${'Per 1M Req/Mo'}`,
    `   ${'-'.repeat(26)} ${'-'.repeat(8)} ${'-'.repeat(12)} ${'-'.repeat(14)}`
  ];

  for (const [key, data] of Object.entries(financials.models)) {
    const name = data.modelName.padEnd(28);
    const cost = `$${data.costPer1MTokens.toFixed(2)}`.padEnd(10);
    const s10k = `$${data.savings10k.toFixed(2)}`.padEnd(14);
    const s1m = `$${data.savings1M.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    linesOut.push(`   ${name} ${cost} ${s10k} ${s1m}`);
  }

  linesOut.push(divider);
  return linesOut.join('\n');
}
