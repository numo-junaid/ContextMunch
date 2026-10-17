# ⚡ ContextMunch Middleware

> **AST-driven codebase minifier and middleware proxy that slashes AI token usage by 70% to 80% without losing syntactic or semantic context.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-v20%2B%20%7C%20v24-cyan.svg)
![AST Engine](https://img.shields.io/badge/engine-%40babel%2Fparser-violet.svg)
![Database](https://img.shields.io/badge/cache-SQLite%20DatabaseSync-emerald.svg)

---

## 📸 Interactive Analytics Dashboard & Compiler UI

ContextMunch includes a built-in modern, glassmorphic analytics suite with real-time AST code diff previews, live token reduction gauges, and dynamic multi-model context window financial ROI calculators.

![ContextMunch Dashboard Overview](assets/dashboard-overview.png)

<div align="center">
  <sub><strong>ContextMunch Dashboard</strong> — Real-time token slashing telemetry, live AST transformation workspace, and persistent SQLite cache statistics.</sub>
</div>

<br/>

### 🔬 AST Compiler Playground (Side-by-Side Code Diff)
![ContextMunch AST Playground Diff](assets/ast-playground-diff.png)

<div align="center">
  <sub><strong>AST Minifier Diff</strong> — Stripping JSDoc headers, TypeScript interfaces, and Tailwind styling bloat from 1,218 tokens down to 322 tokens (<strong>-73.6% reduction</strong>).</sub>
</div>

<br/>

### 💰 Multi-Model Financial ROI & Context Window Calculator
![ContextMunch Cost Calculator](assets/roi-cost-calculator.png)

<div align="center">
  <sub><strong>Context Window Financial Projections</strong> — Dynamic scale projections from 1K to 10M requests across Anthropic Claude 3.5 Sonnet, OpenAI GPT-4o, and Google Gemini.</sub>
</div>

---

## 🚀 Why ContextMunch?

Passing raw codebases, files, or component directories to LLMs (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5/2.0 Pro) wastes up to **70-80% of prompt tokens** on:
- Verbose JSDoc blocks, file license banners, and inline developer comments (`// TODO`, `/* ... */`)
- Heavy TypeScript interface definitions, generic annotations, and type assertions that carry no runtime code logic
- Repetitive debugging statements (`console.log`, `console.debug`, `console.trace`)
- Deeply nested Tailwind utility class strings, repetitive layout wrappers, and multi-line SVG vector paths

**ContextMunch solves this at the compiler level.** Instead of passing raw text, files are parsed into an Abstract Syntax Tree (AST), stripped of all non-semantic bloat, and optionally condensed into dense UI structural signatures before hitting the AI API layer.

---

## 📂 Project Architecture

```text
context-munch/
├── bin/
│   └── context-munch.js       # Executable terminal CLI tool
├── src/
│   ├── ast/
│   │   ├── parser.js          # Babel multi-dialect AST parser & directory scanner
│   │   ├── compressor.js      # Compiler passes (strips comments, types, boilerplate)
│   │   └── token-estimator.js # BPE token counter and multi-model financial calculator
│   ├── proxy/
│   │   ├── server.js          # Local MCP server & Express proxy intercepting API loops
│   │   └── cache-manager.js   # Embedded SQLite cache layer tracking AST signatures
│   └── dashboard/
│       ├── public/            # Static assets & modern glassmorphic UI (HTML/CSS)
│       └── src/               # Real-time analytics, code diff & ROI calculator
├── test/
│   ├── test-suite.js          # Compiler AST & token reduction verification
│   └── test-server.js         # Proxy, MCP, and SQLite integration tests
├── package.json
└── README.md
```

---

## ⚡ Technical Execution Architecture

### 1. Abstract Syntax Tree (AST) Reduction (`src/ast/compressor.js`)
- **Multi-Dialect Parser (`parser.js`)**: Configured with Babel parser plugins (`jsx`, `typescript`, `decorators-legacy`, `classProperties`, `optionalChaining`, `topLevelAwait`, etc.).
- **Comment Elimination**: Purges `ast.comments`, node `leadingComments`, `trailingComments`, and `innerComments` (100% removal of JSDoc, license headers, and inline remarks).
- **TypeScript Type Pruning**: Strips `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`, `TSTypeAnnotation`, `TSTypeParameterDeclaration`, `TSAsExpression`, `TSTypeAssertion`, and constructor parameter properties while preserving 100% executable ECMAScript syntax and semantics.
- **Boilerplate & Noise Purge**: Removes redundant `EmptyStatement`, `console.log`/`debug`/`trace` statements (while strictly preserving `console.error` and `console.warn` for runtime error handling).

### 2. Context Compression Loop: UI Abstraction
For React/JSX applications, UI trees are the biggest token bloat. ContextMunch provides configurable modes:
- **`compact`**: Minimizes repetitive Tailwind strings to core layout clues and collapses multi-line `<svg><path .../></svg>` vectors into `<Icon/>`.
- **`signature`**: Abstracts heavy return JSX into dense structural markdown signatures (e.g. `/* UI-Tree: <Card>[<Avatar/>, <Header>, <ActionButtons/>]</Card> */`), slashing tokens by **up to 79.3%**.

### 3. Integrated Token Estimation & Dollar Calculator (`src/ast/token-estimator.js`)
- Uses Byte-Pair Encoding (BPE) for exact token counting.
- Benchmarks against standard LLM context window rates (per 1M input tokens):
  - **Anthropic Claude 3.5 Sonnet**: $3.00 / 1M
  - **OpenAI GPT-4o**: $2.50 / 1M
  - **Google Gemini 1.5 Pro**: $1.25 / 1M
  - **Anthropic Claude 3.5 Haiku**: $0.80 / 1M
  - **OpenAI GPT-4o-mini**: $0.15 / 1M
  - **DeepSeek V3**: $0.14 / 1M
  - **Google Gemini 2.0 Flash**: $0.10 / 1M

### 4. Embedded SQLite Cache Layer (`src/proxy/cache-manager.js`)
- Built using Node.js v24 native `node:sqlite` `DatabaseSync` (zero native build/compiler dependencies on Windows/Linux/macOS).
- Deterministic SHA-256 fingerprinting based on code content + compression settings.
- Sub-millisecond (`0.3ms`) cache retrieval on repeated codebase queries.

---

## 🛠️ Installation & Quickstart

```bash
# Clone the repository
cd context-munch

# Install dependencies
npm install

# Run the test suite
npm test
```

### 1. Run the Analytics Dashboard & Proxy Server
```bash
npm start
# or: node bin/context-munch.js --serve --port 4040
```
Open **[http://localhost:4040](http://localhost:4040)** to access the real-time Analytics Dashboard, code diff viewer, and financial ROI calculator.

### 2. Use the Command-Line Interface (CLI)
```bash
# Compress a single file
node bin/context-munch.js ./src/ast/parser.js

# Compress an entire directory and export to dist-munched
node bin/context-munch.js --dir ./src --out ./dist-munched

# View cumulative token and dollar savings tracked in SQLite
node bin/context-munch.js --stats
```

### 3. Intercept API Loops via Drop-In Proxy Middleware
Point your OpenAI or custom LLM client to `http://localhost:4040/v1`:

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'http://localhost:4040/v1' // Automatically intercepts, minifies AST, and slashes tokens!
});

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Audit this component:\n' + rawCodeString }
  ]
});
```

### 4. Model Context Protocol (MCP) Integration
ContextMunch exposes standard MCP tools at `POST /mcp` (`compress_code`, `scan_codebase`, `get_token_savings`) for seamless integration with Cursor, Windsurf, and Claude Desktop:

```json
{
  "mcpServers": {
    "contextmunch": {
      "command": "node",
      "args": ["<path-to-contextmunch>/bin/context-munch.js", "--serve", "--port", "4040"]
    }
  }
}
```

---

## 📊 Benchmark Results

| Code Sample | Raw Context | Munched Context | Tokens Slashed | Reduction % | Savings / 1M Requests (GPT-4o) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **React TSX Component (`compact`)** | 1,218 tokens | 322 tokens | **896 tokens** | **73.56%** | **$2,240.00** |
| **React TSX Component (`signature`)** | 1,218 tokens | 252 tokens | **966 tokens** | **79.31%** | **$2,415.00** |
| **TypeScript Backend Service** | 631 tokens | 264 tokens | **367 tokens** | **58.16%** | **$917.50** |
| **Express Auth Middleware** | 480 tokens | 172 tokens | **308 tokens** | **64.17%** | **$770.00** |

---

## 🧪 Verification & Tests

Run all unit and integration tests:
```bash
# Verify AST transformations & token calculation
node test/test-suite.js

# Verify Proxy server, MCP endpoints & SQLite cache
node test/test-server.js
```

---

## 📜 License
MIT © ContextMunch Engineering Team
