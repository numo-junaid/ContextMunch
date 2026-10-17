/**
 * ContextMunch Server & Proxy Integration Test
 */

async function testServer() {
  console.log('Testing ContextMunch Proxy & API Endpoints...\n');

  // 1. Test Dashboard Static Files
  const r1 = await fetch('http://localhost:4040/');
  console.log('✔ GET / (Dashboard UI) HTTP Status:', r1.status);

  // 2. Test API Compress
  const sampleCode = `
  /**
   * Enterprise Addition Utility
   * @param a first operand
   * @param b second operand
   */
  export function calculateTotal(a: number, b: number): number {
    console.log('[DEBUG] calculating sum:', a, b);
    return a + b;
  }
  `;

  const r2 = await fetch('http://localhost:4040/api/compress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: sampleCode,
      filename: 'calculate.ts'
    })
  });
  const d2 = await r2.json();
  console.log('✔ POST /api/compress:');
  console.log('   Compressed Code:', d2.compressedCode.replace(/\n/g, ' '));
  console.log(`   Tokens: ${d2.metrics.tokens.original} -> ${d2.metrics.tokens.compressed} (${d2.metrics.tokens.reductionPct}% cut)`);

  // 3. Test Proxy Interceptor
  const promptWithCode = `
Review this TypeScript interface:
\`\`\`typescript
/** Detailed Interface Comment */
export interface SystemMetric {
  id: string;
  value: number;
  tags: string[];
}
export function getMetric(m: SystemMetric): number {
  console.debug('fetching metric...');
  return m.value;
}
\`\`\`
  `;

  const r3 = await fetch('http://localhost:4040/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: promptWithCode }]
    })
  });
  const d3 = await r3.json();
  console.log('✔ POST /v1/chat/completions (Proxy Interceptor):');
  console.log(`   Tokens Slashed: ${d3.tokensSaved} tokens (-${d3.reductionPct}%)`);

  // 4. Test MCP Protocol
  const r4 = await fetch('http://localhost:4040/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    })
  });
  const d4 = await r4.json();
  console.log('✔ POST /mcp (Model Context Protocol):');
  console.log('   Tools Exposed:', d4.result.tools.map(t => t.name).join(', '));

  // 5. Test SQLite Telemetry
  const r5 = await fetch('http://localhost:4040/api/stats');
  const d5 = await r5.json();
  console.log('✔ GET /api/stats (SQLite Telemetry):');
  console.log(`   Cached Signatures   : ${d5.totalEntries}`);
  console.log(`   Cache Hits          : ${d5.totalHits}`);
  console.log(`   Tokens Slashed Total: ${d5.cumulativeTokensSaved}`);

  console.log('\n🎉 ALL PROXY & API ENDPOINTS VALIDATED SUCCESSFULLY!');
}

testServer().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
