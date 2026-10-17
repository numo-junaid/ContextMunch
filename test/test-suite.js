/**
 * ContextMunch Verification Suite
 * Verifies AST compression, comment stripping, type removal, UI abstraction, and token estimation.
 */

import { compressCode } from '../src/ast/compressor.js';

console.log('🧪 Running ContextMunch Verification Suite...\n');

// 1. Complex TypeScript + JSX + JSDoc sample component
const sampleTypeScriptJSX = `
/**
 * @file UserProfileCard.tsx
 * @description Enterprise user profile card component displaying status, badges, and quick actions.
 * @author Platform UI Team <ui@enterprise.com>
 * @license MIT - All rights reserved
 * =========================================================================
 * REVISION HISTORY:
 * - 2024-01-15: Initial implementation
 * - 2024-06-20: Added dark mode and accessibility tags
 * =========================================================================
 */

import React, { useState, useEffect } from 'react';

// Core User Role Enumeration
export type UserRole = 'admin' | 'editor' | 'viewer' | 'guest';

// User metadata interface definitions
export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  notificationsEnabled: boolean;
  locale: string;
}

export interface UserProfileProps {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  preferences?: UserPreferences;
  onUpdateRole: (newRole: UserRole) => Promise<void>;
  onDeleteAccount: (userId: string) => void;
}

/**
 * UserProfileCard Component
 * Renders avatar, name badge, and dynamic action controls.
 */
export const UserProfileCard: React.FC<UserProfileProps> = ({
  id,
  name,
  role,
  avatarUrl = '/default-avatar.png',
  preferences,
  onUpdateRole,
  onDeleteAccount
}: UserProfileProps) => {
  // State for tracking active edit mode
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<UserRole>(role);

  // Debug logging - internal telemetry
  console.log('[DEBUG] Rendering UserProfileCard for:', id, name);
  console.info('[TELEMETRY] Component mounted with role:', role);

  useEffect(() => {
    // TODO: Verify permissions against enterprise IAM token
    console.debug('[AUTH] Checking user permission matrix...');
  }, [id]);

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const selected = e.target.value as UserRole;
    setCurrentRole(selected);
    try {
      await onUpdateRole(selected);
      setIsEditing(false);
    } catch (err: unknown) {
      // Must preserve critical error handling logs!
      console.error('[ERROR] Failed to update role:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between p-6 bg-slate-900/80 border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center space-x-4 w-full">
        {/* User Avatar Image */}
        <img
          src={avatarUrl}
          alt={name}
          className="w-14 h-14 rounded-full border-2 border-cyan-400 object-cover shadow-sm"
        />
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-white tracking-tight">{name}</h3>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
            {currentRole.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Heavy SVG Icon representation */}
      <div className="my-4 p-2 bg-slate-800 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-cyan-400">
          <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
        </svg>
      </div>

      <div className="flex space-x-3 mt-4 w-full">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex-1 py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition-colors"
        >
          {isEditing ? 'Cancel' : 'Edit Role'}
        </button>
        <button
          onClick={() => onDeleteAccount(id)}
          className="py-2 px-4 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
`;

console.log('Testing Mode: STANDARD COMPACTION (Comments, Types, Logging & Tailwind Minimization)...');
const standardResult = compressCode(sampleTypeScriptJSX, {
  filename: 'UserProfileCard.tsx',
  abstractJSX: 'compact',
  stripLogging: true
});

console.log('\n--- COMPRESSED OUTPUT ---');
console.log(standardResult.compressedCode);
console.log('\n' + standardResult.report);

console.log('\nTesting Mode: CONTEXT COMPRESSION LOOP (Dense UI Signatures)...');
const signatureResult = compressCode(sampleTypeScriptJSX, {
  filename: 'UserProfileCard.tsx',
  abstractJSX: 'signature'
});

console.log('\n--- SIGNATURE COMPRESSED OUTPUT ---');
console.log(signatureResult.compressedCode);
console.log('\n' + signatureResult.report);

// Assertions
const errors = [];
if (standardResult.compressedCode.includes('UserProfileProps')) {
  errors.push('FAIL: TypeScript interface was not stripped');
}
if (standardResult.compressedCode.includes('@license MIT')) {
  errors.push('FAIL: License header was not stripped');
}
if (standardResult.compressedCode.includes('[DEBUG]')) {
  errors.push('FAIL: Debug console.log was not stripped');
}
if (!standardResult.compressedCode.includes('console.error')) {
  errors.push('FAIL: console.error was accidentally stripped (must be preserved)');
}
if (standardResult.metrics.tokens.reductionPct < 40) {
  errors.push(`FAIL: Token reduction was ${standardResult.metrics.tokens.reductionPct}%, expected > 40%`);
}

// 2. Complex Backend Service with verbose JSDoc, types, and logging
const sampleBackendService = `
/**
 * @module OrderProcessingService
 * Enterprise Order Lifecycle State Machine and Payment Dispatcher.
 * 
 * COPYRIGHT (c) 2025 FINTECH SOLUTIONS CORP.
 * CONFIDENTIAL AND PROPRIETARY.
 * 
 * @author Senior Enterprise Architect
 * @version 4.12.0
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * Enumeration of allowable order states throughout processing
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  SETTLED = 'SETTLED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

/**
 * Detailed line item metadata
 */
export interface OrderItem {
  sku: string;
  quantity: number;
  unitPrice: number;
  discountApplied?: number;
  taxCode: string;
}

export interface ProcessOrderPayload {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  currency: string;
  paymentToken: string;
}

export interface ProcessingResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  status: OrderStatus;
  timestamp: number;
}

/**
 * Main Order Lifecycle Controller
 */
export class OrderProcessingService extends EventEmitter {
  private retryLimit: number = 3;
  private readonly gatewayTimeoutMs: number = 5000;

  /**
   * Initializes order processing service instance
   * @param config - Startup options
   */
  constructor(private config: Record<string, any> = {}) {
    super();
    // Trace constructor execution
    console.debug('[INIT] OrderProcessingService initialized with config:', config);
  }

  /**
   * Orchestrates multi-phase authorization and payment capture
   * @param payload - incoming customer order payload
   * @returns ProcessingResult promise
   */
  public async processOrder(payload: ProcessOrderPayload): Promise<ProcessingResult> {
    console.log('[AUDIT] Processing order:', payload.orderId, 'for customer:', payload.customerId);

    // Step 1: Calculate total order amount
    let total = 0;
    for (const item of payload.items) {
      total += item.quantity * item.unitPrice;
    }

    // Step 2: Validate inventory allocation
    console.info('[INVENTORY] Checking stock for SKUs...');

    try {
      const transactionId = crypto.randomUUID();
      console.log('[PAYMENT] Gateway dispatched tx:', transactionId);

      this.emit('order:processed', { orderId: payload.orderId, transactionId });

      return {
        success: true,
        transactionId,
        status: OrderStatus.CAPTURED,
        timestamp: Date.now()
      };
    } catch (err: any) {
      console.error('[CRITICAL] Transaction failure:', err);
      return {
        success: false,
        error: err.message,
        status: OrderStatus.FAILED,
        timestamp: Date.now()
      };
    }
  }
}
`;

console.log('\nTesting Mode: BACKEND SERVICE & TYPESCRIPT CLASSES...');
const backendResult = compressCode(sampleBackendService, {
  filename: 'OrderProcessingService.ts',
  stripLogging: true
});

console.log('\n--- COMPRESSED BACKEND SERVICE ---');
console.log(backendResult.compressedCode);
console.log('\n' + backendResult.report);

if (backendResult.metrics.tokens.reductionPct < 55) {
  errors.push(`FAIL: Backend service token reduction was ${backendResult.metrics.tokens.reductionPct}%, expected > 55%`);
}

if (errors.length > 0) {
  console.error('\n❌ Verification Failed:');
  for (const err of errors) console.error('  • ' + err);
  process.exit(1);
} else {
  console.log('\n✅ All Core Verification Checks Passed Successfully!');
  console.log(`🎉 React Component Tokens Slashed: ${standardResult.metrics.tokens.reductionPct}%`);
  console.log(`🔥 React Signature Tokens Slashed: ${signatureResult.metrics.tokens.reductionPct}%`);
  console.log(`⚡ Backend Service Tokens Slashed: ${backendResult.metrics.tokens.reductionPct}%`);
}
