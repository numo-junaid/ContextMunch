#!/usr/bin/env node

/**
 * ContextMunch CLI
 * Command-line interface for AST-driven codebase minification and token analysis.
 */

import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { compressCode, compressFile, compressDirectory } from '../src/ast/compressor.js';
import { defaultCache } from '../src/proxy/cache-manager.js';
import { startServer } from '../src/proxy/server.js';

const program = new Command();

program
  .name('context-munch')
  .description('⚡ AST-driven codebase minifier & middleware proxy that slashes AI tokens by ~70%')
  .version('1.0.0');

program
  .argument('[target]', 'File path, directory path, or glob to compress')
  .option('-d, --dir <path>', 'Compress entire codebase directory')
  .option('-c, --code <code>', 'Compress raw code string directly')
  .option('-o, --out <path>', 'Output compressed code to specified destination')
  .option('-j, --jsx <mode>', 'JSX compression mode: compact, signature, or none', 'compact')
  .option('--keep-types', 'Preserve TypeScript type annotations')
  .option('--keep-comments', 'Preserve comments and documentation')
  .option('--keep-logs', 'Preserve console.log debug statements')
  .option('--compact', 'Emit ultra-compact single-line whitespace')
  .option('-s, --serve', 'Launch proxy middleware and analytics web dashboard')
  .option('-p, --port <number>', 'Server port (default: 4040)', 4040)
  .option('--stats', 'Display cumulative SQLite token & dollar savings metrics')
  .action(async (target, options) => {
    // 1. Server mode
    if (options.serve) {
      startServer(Number(options.port));
      return;
    }

    // 2. Cache stats display
    if (options.stats) {
      const stats = defaultCache.getStats();
      console.log(chalk.cyan.bold('\n🗄️  ContextMunch Cache & Savings Telemetry:'));
      console.log(chalk.gray('─'.repeat(55)));
      console.log(` • Cached Code Signatures   : ${chalk.yellow(stats.totalEntries.toLocaleString())}`);
      console.log(` • Cache Deduplication Hits : ${chalk.yellow(stats.totalHits.toLocaleString())}`);
      console.log(` • Cumulative Tokens Slashed: ${chalk.green.bold(stats.cumulativeTokensSaved.toLocaleString())}`);
      console.log(` • Average Reduction Rate   : ${chalk.green.bold(stats.avgReductionPct + '%')}`);
      console.log(chalk.gray('─'.repeat(55)));
      console.log(chalk.white.bold(' 💰 Historical Dollar Savings Across Models:'));
      for (const [key, val] of Object.entries(stats.cumulativeDollarSavings)) {
        console.log(`   ${val.modelName.padEnd(28)}: ${chalk.green('$' + val.savedDollars.toFixed(4))}`);
      }
      console.log(chalk.gray('─'.repeat(55)) + '\n');
      return;
    }

    const compOptions = {
      stripComments: !options.keepComments,
      stripTypes: !options.keepTypes,
      stripBoilerplate: true,
      stripLogging: !options.keepLogs,
      abstractJSX: options.jsx,
      compactOutput: options.compact || false
    };

    // 3. Raw inline code string
    if (options.code) {
      const res = compressCode(options.code, compOptions);
      if (options.out) {
        fs.writeFileSync(path.resolve(options.out), res.compressedCode, 'utf8');
        console.log(chalk.green(`✔ Wrote compressed output to ${options.out}`));
      } else {
        console.log(res.compressedCode);
      }
      console.log('\n' + res.report);
      return;
    }

    const targetPath = options.dir || target;

    if (!targetPath) {
      console.log(chalk.yellow('Please provide a file or directory path, or use --serve to launch dashboard.'));
      program.help();
      return;
    }

    const resolved = path.resolve(targetPath);
    if (!fs.existsSync(resolved)) {
      console.error(chalk.red(`Error: Target path not found: ${resolved}`));
      process.exit(1);
    }

    const stat = fs.statSync(resolved);

    // 4. Directory compression
    if (stat.isDirectory()) {
      console.log(chalk.cyan(`\nScanning and minifying directory: ${chalk.bold(targetPath)}...`));
      const dirResult = compressDirectory(resolved, compOptions);
      console.log(dirResult.summaryReport);

      if (options.out) {
        const outDir = path.resolve(options.out);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        for (const file of dirResult.files) {
          const dest = path.join(outDir, file.relativePath);
          const destDir = path.dirname(dest);
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          fs.writeFileSync(dest, file.compressedCode, 'utf8');
        }
        console.log(chalk.green(`✔ Exported ${dirResult.files.length} minified files to ${outDir}\n`));
      }
      return;
    }

    // 5. Single file compression
    if (stat.isFile()) {
      const res = compressFile(resolved, compOptions);
      if (options.out) {
        fs.writeFileSync(path.resolve(options.out), res.compressedCode, 'utf8');
        console.log(chalk.green(`✔ Compressed file written to ${options.out}`));
      } else {
        console.log(res.compressedCode);
      }
      console.log('\n' + res.report);
    }
  });

program.parse(process.argv);
