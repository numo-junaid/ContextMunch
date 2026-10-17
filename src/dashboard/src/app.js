/**
 * ContextMunch - Dashboard Client Application
 * Handles AST minification execution, token differential calculation,
 * real-time financial ROI projection, and SQLite telemetry polling.
 */

import { CODE_PRESETS } from './presets.js';

// Application State
const state = {
  currentPreset: 'reactComponent',
  sourceCode: '',
  compressedCode: '',
  metrics: null,
  queryVolume: 100000,
  pricingModels: {},
  telemetry: null
};

// DOM Elements
const elements = {
  inputSourceCode: document.getElementById('input-source-code'),
  outputCompressedCode: document.getElementById('output-compressed-code'),
  btnRunCompression: document.getElementById('btn-run-compression'),
  btnCopyCode: document.getElementById('btn-copy-code'),
  btnRefreshStats: document.getElementById('btn-refresh-stats'),
  btnClearCache: document.getElementById('btn-clear-cache'),
  selectJsxMode: document.getElementById('select-jsx-mode'),
  checkStripComments: document.getElementById('check-strip-comments'),
  checkStripTypes: document.getElementById('check-strip-types'),
  checkStripLogs: document.getElementById('check-strip-logs'),
  checkCompactWs: document.getElementById('check-compact-ws'),
  presetBtns: document.querySelectorAll('.preset-btn'),
  inputQueryVolume: document.getElementById('input-query-volume'),
  labelQueryVolume: document.getElementById('label-query-volume'),
  tbodyPricingRows: document.getElementById('tbody-pricing-rows'),
  tabBtns: document.querySelectorAll('.tab-btn'),
  snippetCodeView: document.getElementById('snippet-code-view'),
  
  // Metric badges
  labelOriginalFilename: document.getElementById('label-original-filename'),
  labelCompressedFilename: document.getElementById('label-compressed-filename'),
  badgeOriginalTokens: document.getElementById('badge-original-tokens'),
  badgeOriginalLines: document.getElementById('badge-original-lines'),
  badgeCompressedTokens: document.getElementById('badge-compressed-tokens'),
  badgeReductionPct: document.getElementById('badge-reduction-pct'),
  
  // Hero metrics
  metricReductionRate: document.getElementById('metric-reduction-rate'),
  metricTokensSlashed: document.getElementById('metric-tokens-slashed'),
  metricOriginalTokens: document.getElementById('metric-original-tokens'),
  metricDollarsSaved: document.getElementById('metric-dollars-saved'),
  
  // Telemetry items
  teleSignatures: document.getElementById('tele-signatures'),
  teleHits: document.getElementById('tele-hits'),
  teleCumulativeTokens: document.getElementById('tele-cumulative-tokens'),
  teleAvgPct: document.getElementById('tele-avg-pct'),
  auditLogList: document.getElementById('audit-log-list')
};

// Code Snippets for Drop-In Integration Box
const INTEGRATION_SNIPPETS = {
  openai: `import OpenAI from 'openai';

// Point baseURL to ContextMunch Local Proxy
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'http://localhost:4040/v1' // Intercepts, munches AST, slashes 70% tokens!
});

// Any completion query with code context gets automatically compressed:
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: \`Review this component:\\n\` + rawCodeSnippet }
  ]
});`,

  cli: `# Compress a single React TSX file and print token audit report
npx context-munch ./src/components/UserProfileCard.tsx

# Scan and minify an entire codebase directory
npx context-munch --dir ./src --out ./dist-munched

# Run ContextMunch Proxy Middleware & Dashboard daemon on port 4040
npx context-munch --serve --port 4040

# View cumulative tokens & dollars slashed from SQLite cache
npx context-munch --stats`,

  mcp: `// Add to your Claude Desktop or Cursor MCP settings configuration:
{
  "mcpServers": {
    "contextmunch": {
      "command": "node",
      "args": ["E:/Websites for SQOC/ContextMunch/bin/context-munch.js", "--serve"],
      "env": {
        "PORT": "4040"
      }
    }
  }
}`
};

/**
 * Initializes the client application.
 */
async function init() {
  loadPreset('reactComponent');
  setupEventListeners();
  await fetchPricing();
  await runCompression();
  await fetchTelemetry();
}

/**
 * Load predefined codebase snippet into editor.
 */
function loadPreset(presetKey) {
  const preset = CODE_PRESETS[presetKey];
  if (!preset) return;

  state.currentPreset = presetKey;
  state.sourceCode = preset.code;

  elements.inputSourceCode.value = preset.code;
  elements.labelOriginalFilename.textContent = preset.filename;
  elements.labelCompressedFilename.textContent = preset.filename.replace(/\.(tsx?|jsx?)$/, '.min.js');

  elements.presetBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === presetKey);
  });
}

/**
 * Attach UI event listeners.
 */
function setupEventListeners() {
  // Preset buttons
  elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      loadPreset(btn.dataset.preset);
      runCompression();
    });
  });

  // Run Compression
  elements.btnRunCompression.addEventListener('click', () => {
    runCompression();
  });

  // Auto-compress on input edit with debounce
  let debounceTimeout;
  elements.inputSourceCode.addEventListener('input', () => {
    state.sourceCode = elements.inputSourceCode.value;
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(runCompression, 400);
  });

  // Toggles & dropdowns
  elements.selectJsxMode.addEventListener('change', runCompression);
  elements.checkStripComments.addEventListener('change', runCompression);
  elements.checkStripTypes.addEventListener('change', runCompression);
  elements.checkStripLogs.addEventListener('change', runCompression);
  elements.checkCompactWs.addEventListener('change', runCompression);

  // Copy compressed code
  elements.btnCopyCode.addEventListener('click', () => {
    if (!elements.outputCompressedCode.value) return;
    navigator.clipboard.writeText(elements.outputCompressedCode.value);
    const originalText = elements.btnCopyCode.innerHTML;
    elements.btnCopyCode.innerHTML = '✔';
    setTimeout(() => {
      elements.btnCopyCode.innerHTML = originalText;
    }, 1500);
  });

  // Slider change
  elements.inputQueryVolume.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    state.queryVolume = val;
    elements.labelQueryVolume.textContent = `${val.toLocaleString()} requests`;
    updatePricingTable();
  });

  // Refresh Telemetry
  elements.btnRefreshStats.addEventListener('click', fetchTelemetry);

  // Clear Cache
  elements.btnClearCache.addEventListener('click', async () => {
    if (confirm('Are you sure you want to flush the SQLite token cache?')) {
      await fetch('/api/cache/clear', { method: 'POST' });
      await fetchTelemetry();
    }
  });

  // Integration tabs
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabKey = btn.dataset.tab;
      elements.snippetCodeView.querySelector('code').textContent = INTEGRATION_SNIPPETS[tabKey] || '';
    });
  });
}

/**
 * Executes AST compression against backend API.
 */
async function runCompression() {
  const code = elements.inputSourceCode.value;
  if (!code.trim()) return;

  const options = {
    stripComments: elements.checkStripComments.checked,
    stripTypes: elements.checkStripTypes.checked,
    stripBoilerplate: true,
    stripLogging: elements.checkStripLogs.checked,
    abstractJSX: elements.selectJsxMode.value,
    compactOutput: elements.checkCompactWs.checked,
    filename: elements.labelOriginalFilename.textContent
  };

  try {
    elements.btnRunCompression.disabled = true;
    elements.btnRunCompression.innerHTML = '<span>⚡ Munching...</span>';

    const res = await fetch('/api/compress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, filename: options.filename, options })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Compression error');
    }

    const data = await res.json();
    state.compressedCode = data.compressedCode;
    state.metrics = data.metrics;

    // Update Output Editor
    elements.outputCompressedCode.value = data.compressedCode;

    // Update Badges & Hero Metrics
    renderMetrics(data.metrics);
    updatePricingTable();
    fetchTelemetry();
  } catch (err) {
    elements.outputCompressedCode.value = `// Syntax / Parser Error:\n// ${err.message}`;
  } finally {
    elements.btnRunCompression.disabled = false;
    elements.btnRunCompression.innerHTML = '<span class="btn-icon">⚡</span><span>Munch Codebase</span>';
  }
}

/**
 * Render token metrics on cards and editor header pills.
 */
function renderMetrics(metrics) {
  if (!metrics) return;
  const { tokens, lines } = metrics;

  // Editor stats
  elements.badgeOriginalTokens.textContent = `${tokens.original.toLocaleString()} Tokens`;
  elements.badgeOriginalLines.textContent = `${lines.original} Lines`;
  elements.badgeCompressedTokens.textContent = `${tokens.compressed.toLocaleString()} Tokens`;
  elements.badgeReductionPct.textContent = `-${tokens.reductionPct}%`;

  // Hero metrics
  elements.metricReductionRate.textContent = `${tokens.reductionPct}%`;
  elements.metricTokensSlashed.textContent = `${tokens.saved.toLocaleString()} tokens`;
  elements.metricOriginalTokens.textContent = `From ${tokens.original.toLocaleString()} down to ${tokens.compressed.toLocaleString()}`;

  // GPT-4o 1M benchmark calculation
  const gpt4oSavingsPer1M = metrics.financials?.models?.['gpt-4o']?.savings1M || 0;
  elements.metricDollarsSaved.textContent = `$${gpt4oSavingsPer1M.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Fetch model pricing definitions from backend.
 */
async function fetchPricing() {
  try {
    const res = await fetch('/api/pricing');
    state.pricingModels = await res.json();
  } catch (err) {
    console.warn('Could not load pricing metadata:', err);
  }
}

/**
 * Dynamically re-renders the multi-model financial projection table.
 */
function updatePricingTable() {
  if (!state.metrics || !state.pricingModels) return;

  const { tokens } = state.metrics;
  const volume = state.queryVolume;
  const tbody = elements.tbodyPricingRows;
  tbody.innerHTML = '';

  for (const [key, model] of Object.entries(state.pricingModels)) {
    const ratePerToken = model.costPer1MTokens / 1_000_000;
    const rawCost = tokens.original * ratePerToken * volume;
    const munchedCost = tokens.compressed * ratePerToken * volume;
    const netSavings = tokens.saved * ratePerToken * volume;
    const annualSavings = netSavings * 12;

    const isFlagship = model.category === 'Flagship';
    const badgeClass = isFlagship ? 'badge-flagship' : 'badge-fast';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${model.name}</strong>
        <span class="model-badge ${badgeClass}">${model.category}</span>
      </td>
      <td>${model.provider}</td>
      <td>$${model.costPer1MTokens.toFixed(2)}</td>
      <td>$${rawCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>$${munchedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="savings-val">+$${netSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td><strong>+$${annualSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr</strong></td>
    `;
    tbody.appendChild(tr);
  }
}

/**
 * Fetch and display persistent SQLite cache stats.
 */
async function fetchTelemetry() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;

    const stats = await res.json();
    state.telemetry = stats;

    elements.teleSignatures.textContent = stats.totalEntries.toLocaleString();
    elements.teleHits.textContent = stats.totalHits.toLocaleString();
    elements.teleCumulativeTokens.textContent = stats.cumulativeTokensSaved.toLocaleString();
    elements.teleAvgPct.textContent = `${stats.avgReductionPct}%`;

    // Render Recent Audit Logs
    const logList = elements.auditLogList;
    if (stats.recentLogs && stats.recentLogs.length > 0) {
      logList.innerHTML = '';
      for (const log of stats.recentLogs) {
        const timeStr = new Date(log.created_at).toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'audit-entry';
        entry.innerHTML = `
          <div>
            <span class="tag ${log.request_type === 'proxy_interception' ? 'tag-proxy' : 'tag-comp'}">
              ${log.request_type.toUpperCase()}
            </span>
            <span style="margin-left: 0.6rem; color: #cbd5e1;">-${log.reduction_pct}% tokens (${log.tokens_saved.toLocaleString()} saved)</span>
          </div>
          <span style="color: #64748b; font-size: 0.74rem;">${timeStr}</span>
        `;
        logList.appendChild(entry);
      }
    }
  } catch (err) {
    console.warn('Could not fetch telemetry:', err);
  }
}

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', init);
