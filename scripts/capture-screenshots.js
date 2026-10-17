/**
 * ContextMunch Screenshot Generator
 * Captures pixel-perfect screenshots of the analytics dashboard, playground diff, and ROI calculator.
 */

import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.resolve('assets');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture() {
  console.log('🚀 Launching headless Chrome via puppeteer-core...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2 // High-DPI / Retina quality
    }
  });

  const page = await browser.newPage();
  
  console.log('🌐 Navigating to http://localhost:4040/ ...');
  await page.goto('http://localhost:4040/', { waitUntil: 'networkidle0', timeout: 15000 });

  // Wait for metrics and playground to populate
  await page.waitForSelector('#input-source-code');
  await page.waitForSelector('#table-pricing-analysis tr');
  
  // Give 1 second for animations and font rendering to settle
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log('📸 Capturing Dashboard Overview (Full page & Hero)...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'dashboard-overview.png'),
    fullPage: false
  });

  // Capture playground section
  const playgroundElem = await page.$('#playground');
  if (playgroundElem) {
    console.log('📸 Capturing AST Compiler Playground Diff...');
    await playgroundElem.screenshot({
      path: path.join(OUTPUT_DIR, 'ast-playground-diff.png')
    });
  }

  // Capture pricing calculator section
  const calcElem = await page.$('#calculator');
  if (calcElem) {
    console.log('📸 Capturing Financial ROI Calculator...');
    await calcElem.screenshot({
      path: path.join(OUTPUT_DIR, 'roi-cost-calculator.png')
    });
  }

  // Capture full page
  console.log('📸 Capturing Complete Full-Page Dashboard...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'full-dashboard.png'),
    fullPage: true
  });

  await browser.close();
  console.log('✅ All screenshots captured successfully in /assets directory!');
}

capture().catch(err => {
  console.error('Screenshot Error:', err);
  process.exit(1);
});
