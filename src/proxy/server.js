/**
 * ContextMunch - Proxy & Middleware Server
 * Local MCP server and Express proxy intercepting API loops, minifying code context,
 * and serving the real-time analytics dashboard.
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compressCode, compressDirectory } from '../ast/compressor.js';
import { defaultCache } from './cache-manager.js';
import { MODEL_PRICING, countTokens } from '../ast/token-estimator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServer(options = {}) {
  const app = express();
  const cache = options.cache || defaultCache;
  const upstreamUrl = options.upstreamUrl || process.env.UPSTREAM_API_URL || 'https://api.openai.com';

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static files for dashboard
  const publicDir = path.resolve(__dirname, '../dashboard/public');
  const srcDir = path.resolve(__dirname, '../dashboard/src');
  app.use(express.static(publicDir));
  app.use('/src', express.static(srcDir));

  // ─── API: Compress Single Code Snippet ─────────────────────────────────
  app.post('/api/compress', (req, res) => {
    try {
      const { code, filename = 'source.tsx', options = {}, useCache = true } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "code" parameter.' });
      }

      // Check SQLite cache
      if (useCache) {
        const cached = cache.get(code, options);
        if (cached) {
          return res.json({
            ...cached,
            cached: true
          });
        }
      }

      const result = compressCode(code, { ...options, filename });

      if (useCache) {
        cache.set(code, options, result, filename);
      }

      res.json({
        compressedCode: result.compressedCode,
        metrics: result.metrics,
        report: result.report,
        filename,
        cached: false
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── API: Scan & Compress Entire Directory ─────────────────────────────
  app.post('/api/scan', (req, res) => {
    try {
      const { dirPath, options = {} } = req.body;
      if (!dirPath) {
        return res.status(400).json({ error: 'Missing "dirPath" parameter.' });
      }

      const scanResult = compressDirectory(dirPath, options);

      // Record batch audit
      cache.recordAudit(
        'batch_scan',
        scanResult.aggregateMetrics.tokens.original,
        scanResult.aggregateMetrics.tokens.compressed,
        scanResult.aggregateMetrics.tokens.saved,
        scanResult.aggregateMetrics.tokens.reductionPct
      );

      res.json(scanResult);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── API: Cache & Analytics Telemetry ──────────────────────────────────
  app.get('/api/stats', (req, res) => {
    try {
      const stats = cache.getStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/cache/clear', (req, res) => {
    try {
      cache.clear();
      res.json({ success: true, message: 'Cache successfully flushed.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── API: Pricing Model Metadata ───────────────────────────────────────
  app.get('/api/pricing', (req, res) => {
    res.json(MODEL_PRICING);
  });

  // ─── PROXY MIDDLEWARE: Intercept OpenAI / Anthropic / LLM Calls ─────────
  app.post('/v1/chat/completions', async (req, res) => {
    try {
      const originalPayload = req.body;
      let totalTokensSaved = 0;
      let totalOrigTokens = 0;
      let totalCompTokens = 0;

      // Extract and compress code inside prompt messages
      if (Array.isArray(originalPayload.messages)) {
        for (const msg of originalPayload.messages) {
          if (typeof msg.content === 'string') {
            // Regex to find fenced code blocks: ```(ts|tsx|js|jsx)? ... ```
            const codeBlockRegex = /```(javascript|typescript|js|jsx|ts|tsx)?\s*([\s\S]*?)```/g;
            let modifiedContent = msg.content;
            let match;

            while ((match = codeBlockRegex.exec(msg.content)) !== null) {
              const lang = match[1] || 'tsx';
              const rawCode = match[2];

              if (rawCode.length > 50) {
                try {
                  const compResult = compressCode(rawCode, {
                    filename: `snippet.${lang}`,
                    abstractJSX: 'compact'
                  });

                  totalOrigTokens += compResult.metrics.tokens.original;
                  totalCompTokens += compResult.metrics.tokens.compressed;
                  totalTokensSaved += compResult.metrics.tokens.saved;

                  const replacement = '```' + lang + '\n' + compResult.compressedCode + '\n```';
                  modifiedContent = modifiedContent.replace(match[0], replacement);
                } catch {
                  // Fallback: keep uncompressed if syntax is non-standard
                }
              }
            }

            msg.content = modifiedContent;
          }
        }
      }

      // Record audit in SQLite
      if (totalTokensSaved > 0) {
        const pct = ((totalTokensSaved / totalOrigTokens) * 100).toFixed(2);
        cache.recordAudit('proxy_interception', totalOrigTokens, totalCompTokens, totalTokensSaved, Number(pct));
      }

      // Set telemetry headers
      res.setHeader('x-contextmunch-tokens-original', totalOrigTokens);
      res.setHeader('x-contextmunch-tokens-compressed', totalCompTokens);
      res.setHeader('x-contextmunch-tokens-saved', totalTokensSaved);
      res.setHeader('x-contextmunch-reduction-pct', totalOrigTokens > 0 ? ((totalTokensSaved / totalOrigTokens) * 100).toFixed(2) : '0');

      // If upstream key or url configured, proxy request
      const apiKey = req.headers['authorization'];
      if (apiKey && process.env.ENABLE_UPSTREAM_PROXY === 'true') {
        const fetchRes = await fetch(`${upstreamUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey
          },
          body: JSON.stringify(originalPayload)
        });

        const data = await fetchRes.json();
        return res.status(fetchRes.status).json(data);
      }

      // If in inspection mode or local middleware mode, return optimized payload + savings
      res.json({
        intercepted: true,
        tokensSaved: totalTokensSaved,
        originalTokens: totalOrigTokens,
        compressedTokens: totalCompTokens,
        reductionPct: totalOrigTokens > 0 ? ((totalTokensSaved / totalOrigTokens) * 100).toFixed(2) : '0',
        optimizedPayload: originalPayload
      });
    } catch (err) {
      res.status(500).json({ error: `ContextMunch Proxy Error: ${err.message}` });
    }
  });

  // ─── MCP Protocol (Model Context Protocol JSON-RPC Endpoint) ───────────
  app.post('/mcp', (req, res) => {
    const { method, params, id = 1 } = req.body;

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'compress_code',
              description: 'Compress JS/TS/JSX code to slash LLM tokens by ~70%',
              inputSchema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'Raw source code' },
                  filename: { type: 'string', description: 'Source filename for dialect detection' },
                  abstractJSX: { type: 'string', enum: ['none', 'compact', 'signature'] }
                },
                required: ['code']
              }
            },
            {
              name: 'scan_codebase',
              description: 'Scan and compress entire codebase directory with aggregate savings report',
              inputSchema: {
                type: 'object',
                properties: {
                  dirPath: { type: 'string', description: 'Directory path to scan' }
                },
                required: ['dirPath']
              }
            },
            {
              name: 'get_token_savings',
              description: 'Get historical SQLite token and dollar savings metrics',
              inputSchema: { type: 'object' }
            }
          ]
        }
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      if (name === 'compress_code') {
        const result = compressCode(args.code, args);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              { type: 'text', text: result.compressedCode },
              { type: 'text', text: result.report }
            ]
          }
        });
      }
      if (name === 'scan_codebase') {
        const result = compressDirectory(args.dirPath, args);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: result.summaryReport }]
          }
        });
      }
      if (name === 'get_token_savings') {
        const stats = cache.getStats();
        return res.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] }
        });
      }
    }

    res.status(404).json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  });

  return app;
}

export function startServer(port = 4040) {
  const app = createServer();
  return app.listen(port, () => {
    console.log(`\n⚡ ContextMunch Middleware & Proxy running on http://localhost:${port}`);
    console.log(`📊 Analytics Dashboard : http://localhost:${port}/`);
    console.log(`🔄 Proxy Endpoint      : http://localhost:${port}/v1/chat/completions`);
    console.log(`🛠️ MCP Endpoint        : http://localhost:${port}/mcp`);
    console.log(`🗄️ SQLite Cache        : active (.contextmunch/cache.db)\n`);
  });
}

// Auto-run when executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const port = process.env.PORT || 4040;
  startServer(port);
}

export default { createServer, startServer };
