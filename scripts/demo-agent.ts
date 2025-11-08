#!/usr/bin/env node
/**
 * Demo script for the agent tools.
 * - Parses a short natural language request (default: "I need 0.3 SOL")
 * - Maps it to one of the DynamicTool names using a thin parser
 * - Shows the tool name and payload. Optionally executes the tool if
 *   DEMO_EXECUTE=true and SIDESHIFT_SECRET is configured.
 */

import 'dotenv/config';
import { tools } from '../src/agent';
import parseUserRequest from '../src/nl-parser';

async function main() {
  const raw = process.argv.slice(2).join(' ') || 'I need 0.3 SOL';
  console.log('User input:', raw);

  const parsed = parseUserRequest(raw, {
    defaultDepositCoin: 'btc',
    defaultSettleCoin: 'sol'
  });

  if (!parsed) {
    console.error('Could not parse user request. Try: "I need 0.3 SOL" or "I will pay 0.01 BTC"');
    process.exit(2);
  }

  console.log('Mapped to tool:', parsed.toolName);
  console.log('Payload:', JSON.stringify(parsed.input, null, 2));

  const tool = tools.find((t: any) => t.name === parsed.toolName);
  if (!tool) {
    console.error('Tool not found in tools array. Make sure src/agent.ts exports the tools array.');
    process.exit(3);
  }

  const shouldExecute = process.env.DEMO_EXECUTE === 'true' && !!process.env.SIDESHIFT_SECRET;
  if (!shouldExecute) {
    console.log('\nDry run mode (no SideShift call).');
    console.log('To actually call the SideShift API set the environment variables and run with DEMO_EXECUTE=true.');
    console.log('Required: SIDESHIFT_SECRET and SIDESHIFT_AFFILIATE_ID must be set in your environment.');
    console.log("Example (PowerShell): $env:SIDESHIFT_SECRET='your_secret'; $env:SIDESHIFT_AFFILIATE_ID='your_affiliate'; $env:DEMO_EXECUTE='true'; npm run build; node dist/scripts/demo-agent.js 'I need 0.3 SOL'");
    process.exit(0);
  }

  // Execute the tool (note: tools' func expects a string input)
  try {
    console.log('\nExecuting tool against SideShift...');
    const result = await tool.func(JSON.stringify(parsed.input));
    console.log('Result:', result);
  } catch (err: any) {
    console.error('Error executing tool:', err.message || err);
    process.exit(4);
  }
}

main().catch((err) => {
  console.error('Fatal error in demo:', err);
  process.exit(1);
});
