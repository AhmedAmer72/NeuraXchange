import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

// Ensure temp directory exists
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Generate QR code as a buffer for sending via Telegram
 */
export async function generateQRCodeBuffer(data: string): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(data, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code and save to temporary file
 * Returns the file path
 */
export async function generateQRCodeFile(data: string, filename?: string): Promise<string> {
  try {
    const fileName = filename || `qr_${Date.now()}.png`;
    const filePath = path.join(TEMP_DIR, fileName);
    
    await QRCode.toFile(filePath, data, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    
    return filePath;
  } catch (error) {
    console.error('Error generating QR code file:', error);
    throw new Error('Failed to generate QR code file');
  }
}

/**
 * Generate QR code as data URL (base64)
 */
export async function generateQRCodeDataURL(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error('Error generating QR code data URL:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Clean up temporary QR code files older than 1 hour
 */
export function cleanupOldQRFiles(): number {
  let cleaned = 0;
  try {
    const files = fs.readdirSync(TEMP_DIR);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const file of files) {
      if (file.startsWith('qr_') && file.endsWith('.png')) {
        const filePath = path.join(TEMP_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtimeMs < oneHourAgo) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up QR files:', error);
  }
  return cleaned;
}

/**
 * Delete a specific QR code file
 */
export function deleteQRFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting QR file:', error);
  }
}

/**
 * Format crypto address with amount for QR code
 * Uses BIP-21 style URI for Bitcoin, EIP-681 for Ethereum, etc.
 */
export function formatCryptoURI(coin: string, address: string, amount?: string): string {
  const coinLower = coin.toLowerCase();
  
  // Bitcoin-style URI
  if (['btc', 'bitcoin', 'ltc', 'litecoin', 'doge', 'dogecoin', 'bch'].includes(coinLower)) {
    const prefix = coinLower === 'btc' || coinLower === 'bitcoin' ? 'bitcoin' :
                   coinLower === 'ltc' || coinLower === 'litecoin' ? 'litecoin' :
                   coinLower === 'doge' || coinLower === 'dogecoin' ? 'dogecoin' :
                   coinLower === 'bch' ? 'bitcoincash' : coinLower;
    
    if (amount) {
      return `${prefix}:${address}?amount=${amount}`;
    }
    return `${prefix}:${address}`;
  }
  
  // Ethereum-style URI (EIP-681)
  if (['eth', 'ethereum', 'matic', 'polygon', 'bnb', 'bsc'].includes(coinLower)) {
    const prefix = coinLower === 'eth' || coinLower === 'ethereum' ? 'ethereum' :
                   coinLower === 'matic' || coinLower === 'polygon' ? 'ethereum' :
                   coinLower === 'bnb' || coinLower === 'bsc' ? 'ethereum' : 'ethereum';
    
    if (amount) {
      return `${prefix}:${address}?value=${amount}`;
    }
    return `${prefix}:${address}`;
  }
  
  // Solana
  if (['sol', 'solana'].includes(coinLower)) {
    if (amount) {
      return `solana:${address}?amount=${amount}`;
    }
    return `solana:${address}`;
  }
  
  // Default: just return the address
  return address;
}
