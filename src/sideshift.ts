import axios, { AxiosError } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const SIDESHIFT_API_URL = 'https://sideshift.ai/api/v2';
const SIDESHIFT_SECRET = process.env.SIDESHIFT_SECRET;
const SIDESHIFT_AFFILIATE_ID = process.env.SIDESHIFT_AFFILIATE_ID;

// Check if affiliate ID is properly configured
const shouldIncludeAffiliateId = () => {
  return SIDESHIFT_AFFILIATE_ID && 
         SIDESHIFT_AFFILIATE_ID.trim() !== '' && 
         SIDESHIFT_AFFILIATE_ID !== 'YOUR_AFFILIATE_ID';
  // REMOVED the check for 'HWIeN12q0' - this is your real ID!
};

console.log('SideShift Environment Check:', {
  hasSecret: !!SIDESHIFT_SECRET,
  hasAffiliateId: !!SIDESHIFT_AFFILIATE_ID,
  affiliateIdValue: SIDESHIFT_AFFILIATE_ID, // Add this for debugging
  affiliateIdWillBeUsed: shouldIncludeAffiliateId(),
  secretLength: SIDESHIFT_SECRET ? SIDESHIFT_SECRET.length : 0
});

const sideshiftApi = axios.create({
  baseURL: SIDESHIFT_API_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(SIDESHIFT_SECRET && { 'x-sideshift-secret': SIDESHIFT_SECRET })
  }
});

// Add request interceptor for debugging
sideshiftApi.interceptors.request.use(
  (config) => {
    console.log(`📤 SideShift API Request: ${config.method?.toUpperCase()} ${config.url}`);
    console.log('Request headers:', {
      ...config.headers,
      'x-sideshift-secret': config.headers['x-sideshift-secret'] ? '[REDACTED]' : undefined
    });
    if (config.data) {
      console.log('Request data:', config.data);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
sideshiftApi.interceptors.response.use(
  (response) => {
    console.log(`📥 SideShift API Response: ${response.status} ${response.statusText}`);
    return response;
  },
  (error: AxiosError) => {
    console.error('🔴 SideShift API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code
    });
    return Promise.reject(error);
  }
);

interface QuoteParams {
  depositCoin: string;
  settleCoin: string;
  depositAmount: string;
  depositNetwork?: string;
  settleNetwork?: string;
}

interface ShiftParams {
  quoteId: string;
  settleAddress: string;
  refundAddress?: string;
}

export async function getQuote(params: QuoteParams) {
  console.log('Getting quote with params:', params);
  
  try {
    // Build request data - ALWAYS include affiliate ID if available
    const requestData: any = {
      depositCoin: params.depositCoin,
      settleCoin: params.settleCoin,
      depositAmount: params.depositAmount
    };

    // Add optional parameters
    if (params.depositNetwork) {
      requestData.depositNetwork = params.depositNetwork;
    }
    if (params.settleNetwork) {
      requestData.settleNetwork = params.settleNetwork;
    }
    
    // ALWAYS include affiliate ID if it exists
    if (shouldIncludeAffiliateId()) {
      requestData.affiliateId = SIDESHIFT_AFFILIATE_ID;
      console.log('Including affiliate ID in quote request:', SIDESHIFT_AFFILIATE_ID);
    } else {
      console.log('WARNING: No affiliate ID configured - shifts will fail!');
    }

    const response = await sideshiftApi.post('/quotes', requestData);
    
    console.log('✅ Quote received:', {
      id: response.data.id,
      rate: response.data.rate,
      depositAmount: response.data.depositAmount,
      settleAmount: response.data.settleAmount
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Error getting quote:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });
    
    // Provide more specific error messages
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.error?.message || 'Invalid request parameters';
      throw new Error(`SideShift API Error: ${errorMessage}`);
    } else if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please check your SIDESHIFT_SECRET.');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else {
      throw error;
    }
  }
}

interface QuoteBySettleAmountParams {
  depositCoin: string;
  settleCoin: string;
  settleAmount: string;
  depositNetwork?: string;
  settleNetwork?: string;
}

export async function getQuoteBySettleAmount(params: QuoteBySettleAmountParams) {
  console.log('Getting quote by settle amount with params:', params);
  
  try {
    const requestData: any = {
      depositCoin: params.depositCoin,
      settleCoin: params.settleCoin,
      settleAmount: params.settleAmount
    };

    if (params.depositNetwork) {
      requestData.depositNetwork = params.depositNetwork;
    }
    if (params.settleNetwork) {
      requestData.settleNetwork = params.settleNetwork;
    }
    
    if (shouldIncludeAffiliateId()) {
      requestData.affiliateId = SIDESHIFT_AFFILIATE_ID;
      console.log('Including affiliate ID in quote request:', SIDESHIFT_AFFILIATE_ID);
    } else {
      console.log('WARNING: No affiliate ID configured - shifts will fail!');
    }

    const response = await sideshiftApi.post('/quotes', requestData);
    
    console.log('✅ Quote received:', {
      id: response.data.id,
      rate: response.data.rate,
      depositAmount: response.data.depositAmount,
      settleAmount: response.data.settleAmount
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Error getting quote by settle amount:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });
    
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.error?.message || 'Invalid request parameters';
      throw new Error(`SideShift API Error: ${errorMessage}`);
    } else if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please check your SIDESHIFT_SECRET.');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else {
      throw error;
    }
  }
}

export async function createShift(params: ShiftParams) {
  console.log('Creating shift with params:', {
    quoteId: params.quoteId,
    settleAddress: params.settleAddress.substring(0, 10) + '...',
    hasRefundAddress: !!params.refundAddress
  });
  
  try {
    // Build request data
    const requestData: any = {
      quoteId: params.quoteId,
      settleAddress: params.settleAddress
    };

    if (params.refundAddress) {
      requestData.refundAddress = params.refundAddress;
    }

    // MUST include the SAME affiliate ID that was used in the quote
    if (shouldIncludeAffiliateId()) {
      requestData.affiliateId = SIDESHIFT_AFFILIATE_ID;
      console.log('Including affiliate ID in shift creation:', SIDESHIFT_AFFILIATE_ID);
    } else {
      console.error('ERROR: Affiliate ID is required for shift creation!');
      throw new Error('Affiliate ID is not configured. Cannot create shift.');
    }

    const response = await sideshiftApi.post('/shifts/fixed', requestData);
    
    console.log('✅ Shift created:', {
      id: response.data.id,
      depositAddress: response.data.depositAddress.substring(0, 10) + '...',
      status: response.data.status
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating shift:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });
    
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.error?.message || 'Invalid shift parameters';
      
      // Check for specific affiliate ID error
      if (errorMessage.includes('affiliateId')) {
        throw new Error(`SideShift API Error: ${errorMessage}. Make sure your affiliate ID (${SIDESHIFT_AFFILIATE_ID}) is valid and matches the one used in the quote.`);
      }
      
      throw new Error(`SideShift API Error: ${errorMessage}`);
    }
    throw error;
  }
}

export async function pollShiftStatus(shiftId: string) {
  console.log(`Polling status for shift: ${shiftId}`);
  
  try {
    const response = await sideshiftApi.get(`/shifts/${shiftId}`);
    
    console.log(`📊 Shift ${shiftId} status:`, {
      status: response.data.status,
      depositStatus: response.data.depositStatus,
      settleStatus: response.data.settleStatus
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Error polling shift status:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

export async function cancelShift(shiftId: string) {
  console.log(`Attempting to cancel shift: ${shiftId}`);
  
  try {
    const response = await sideshiftApi.delete(`/shifts/${shiftId}`);
    
    console.log(`✅ Shift ${shiftId} cancelled successfully`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error cancelling shift:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.error?.message || 'Cannot cancel shift';
      throw new Error(`SideShift API Error: ${errorMessage}`);
    }
    throw error;
  }
}

export async function getAvailableCoins() {
  console.log('Fetching available coins from SideShift...');
  try {
    const response = await sideshiftApi.get('/coins');
    console.log(`✅ Found ${response.data.length} coins.`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching coins:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

// Test function to verify API connectivity
export async function testSideShiftConnection() {
  console.log('🧪 Testing SideShift API connection...');
  
  try {
    // Test getting available coins
    const response = await sideshiftApi.get('/coins');
    console.log(`✅ SideShift API is accessible. Found ${Object.keys(response.data).length} supported coins`);
    
    // Also test if affiliate ID is valid by trying to get a test quote
    if (shouldIncludeAffiliateId()) {
      try {
        const testQuote = await getQuote({
          depositCoin: 'btc',
          settleCoin: 'eth',
          depositAmount: '0.001'
        });
        console.log('✅ Affiliate ID is valid and working');
      } catch (error: any) {
        if (error.message?.includes('affiliateId')) {
          console.error('❌ Your affiliate ID appears to be invalid');
        }
      }
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Failed to connect to SideShift API:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return false;
  }
}

// Export for testing
export { SIDESHIFT_API_URL, sideshiftApi };