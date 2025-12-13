// Validation utilities for swap amounts, addresses, and rates
import { getPairInfo } from './sideshift';
import WAValidator from 'multicoin-address-validator';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  data?: any;
}

export interface AmountValidation extends ValidationResult {
  min?: string;
  max?: string;
  suggestedAmount?: string;
}

/**
 * Validate swap amount against min/max limits
 */
export async function validateSwapAmount(
  fromCoin: string,
  toCoin: string,
  amount: string,
  fromNetwork?: string,
  toNetwork?: string
): Promise<AmountValidation> {
  try {
    const pairInfo = await getPairInfo(fromCoin, toCoin, fromNetwork, toNetwork);
    const numAmount = parseFloat(amount);
    const minAmount = parseFloat(pairInfo.min);
    const maxAmount = parseFloat(pairInfo.max);

    if (numAmount < minAmount) {
      return {
        valid: false,
        error: `Amount too low! Minimum is ${pairInfo.min} ${fromCoin.toUpperCase()}`,
        min: pairInfo.min,
        max: pairInfo.max,
        suggestedAmount: pairInfo.min
      };
    }

    if (numAmount > maxAmount) {
      return {
        valid: false,
        error: `Amount too high! Maximum is ${pairInfo.max} ${fromCoin.toUpperCase()}`,
        min: pairInfo.min,
        max: pairInfo.max,
        suggestedAmount: pairInfo.max
      };
    }

    // Warning if close to limits
    let warning: string | undefined;
    if (numAmount <= minAmount * 1.1) {
      warning = `⚠️ You're close to the minimum amount (${pairInfo.min})`;
    } else if (numAmount >= maxAmount * 0.9) {
      warning = `⚠️ You're close to the maximum amount (${pairInfo.max})`;
    }

    return {
      valid: true,
      warning,
      min: pairInfo.min,
      max: pairInfo.max,
      data: pairInfo
    };
  } catch (error: any) {
    // If we can't fetch limits, allow the swap but warn
    return {
      valid: true,
      warning: '⚠️ Could not verify limits. Proceed with caution.',
    };
  }
}

/**
 * Check for slippage/rate change
 */
export function checkSlippage(
  originalRate: number,
  newRate: number,
  thresholdPercent: number = 1
): { hasSlippage: boolean; changePercent: number; direction: 'better' | 'worse' | 'same' } {
  const changePercent = ((newRate - originalRate) / originalRate) * 100;
  const absChange = Math.abs(changePercent);
  
  let direction: 'better' | 'worse' | 'same' = 'same';
  if (changePercent > 0.01) direction = 'better';
  else if (changePercent < -0.01) direction = 'worse';

  return {
    hasSlippage: absChange > thresholdPercent,
    changePercent: parseFloat(changePercent.toFixed(2)),
    direction
  };
}

/**
 * Validate cryptocurrency address with enhanced feedback
 */
export function validateAddress(
  address: string,
  coin: string,
  network?: string
): ValidationResult {
  if (!address || address.trim().length === 0) {
    return { valid: false, error: 'Address cannot be empty' };
  }

  const trimmedAddress = address.trim();

  // Basic length check
  if (trimmedAddress.length < 20) {
    return { valid: false, error: 'Address seems too short. Please check and try again.' };
  }

  if (trimmedAddress.length > 150) {
    return { valid: false, error: 'Address seems too long. Please check and try again.' };
  }

  // Use WAValidator for validation
  try {
    const isValid = WAValidator.validate(trimmedAddress, coin.toUpperCase());
    if (isValid) {
      return { valid: true };
    } else {
      return { 
        valid: false, 
        error: `This doesn't look like a valid ${coin.toUpperCase()} address. Please double-check.` 
      };
    }
  } catch (error) {
    // If validator doesn't recognize the coin, do basic checks
    console.log(`WAValidator doesn't support ${coin}, using basic validation`);
    
    // Basic alphanumeric check
    if (/^[a-zA-Z0-9]+$/.test(trimmedAddress) || /^[a-zA-Z0-9:]+$/.test(trimmedAddress)) {
      return { 
        valid: true, 
        warning: `Could not fully verify ${coin.toUpperCase()} address format. Please double-check.`
      };
    }
    
    return { valid: false, error: 'Invalid address format. Please check for typos.' };
  }
}

/**
 * Format amount with proper decimals
 */
export function formatAmount(amount: string | number, decimals: number = 8): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  // Remove trailing zeros
  return parseFloat(num.toFixed(decimals)).toString();
}

/**
 * Parse and validate numeric input
 */
export function parseAmount(input: string): { valid: boolean; amount?: number; error?: string } {
  const cleaned = input.trim().replace(/,/g, '');
  
  if (!/^\d*\.?\d+$/.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid number (e.g., 0.1 or 100)' };
  }
  
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) {
    return { valid: false, error: 'Invalid number format' };
  }
  
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  
  if (amount > 1000000000) {
    return { valid: false, error: 'Amount seems unrealistically large' };
  }
  
  return { valid: true, amount };
}

/**
 * Get user-friendly error message from API error
 */
export function getUserFriendlyError(error: any): string {
  const message = error?.message || error?.toString() || 'Unknown error';
  
  // Common SideShift errors
  if (message.includes('min')) {
    return '📉 Amount is below the minimum. Please enter a higher amount.';
  }
  if (message.includes('max')) {
    return '📈 Amount exceeds the maximum. Please enter a lower amount.';
  }
  if (message.includes('insufficient')) {
    return '💸 Insufficient liquidity for this pair. Try a smaller amount.';
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return '⏳ Too many requests. Please wait a moment and try again.';
  }
  if (message.includes('network') || message.includes('ECONNREFUSED')) {
    return '🌐 Network error. Please check your connection and try again.';
  }
  if (message.includes('timeout')) {
    return '⏱️ Request timed out. Please try again.';
  }
  if (message.includes('pair') || message.includes('not supported')) {
    return '❌ This trading pair is not available. Please try different coins.';
  }
  if (message.includes('address')) {
    return '📍 Invalid address format. Please check the address and try again.';
  }
  if (message.includes('expired')) {
    return '⏰ Quote has expired. Please request a new quote.';
  }
  if (message.includes('affiliate')) {
    return '⚙️ Configuration error. Please contact support.';
  }
  
  // Generic fallback
  return `⚠️ ${message}`;
}

/**
 * Format validation error for display
 */
export function formatValidationError(result: AmountValidation): string {
  let message = `⚠️ *Validation Error*\n\n${result.error || 'Unknown error'}`;
  
  if (result.min && result.max) {
    message += `\n\n📊 *Allowed Range:*\n`;
    message += `📉 Min: \`${result.min}\`\n`;
    message += `📈 Max: \`${result.max}\``;
  }
  
  if (result.suggestedAmount) {
    message += `\n\n💡 Suggested: \`${result.suggestedAmount}\``;
  }
  
  return message;
}

export default {
  validateSwapAmount,
  checkSlippage,
  validateAddress,
  formatAmount,
  parseAmount,
  getUserFriendlyError,
  formatValidationError
};
