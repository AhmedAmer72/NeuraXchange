import axios, { isAxiosError } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = {
    SIDESHIFT_SECRET: process.env.SIDESHIFT_SECRET,
    SIDESHIFT_AFFILIATE_ID: process.env.SIDESHIFT_AFFILIATE_ID
};

// Log environment variable status (remove in production)
console.log('SideShift Environment Check:', {
    hasSecret: !!requiredEnvVars.SIDESHIFT_SECRET,
    hasAffiliateId: !!requiredEnvVars.SIDESHIFT_AFFILIATE_ID,
    secretLength: requiredEnvVars.SIDESHIFT_SECRET?.length || 0
});

// Warn if environment variables are missing
if (!requiredEnvVars.SIDESHIFT_SECRET) {
    console.warn('⚠️ WARNING: SIDESHIFT_SECRET is not set');
}
if (!requiredEnvVars.SIDESHIFT_AFFILIATE_ID) {
    console.warn('⚠️ WARNING: SIDESHIFT_AFFILIATE_ID is not set');
}

const sideShiftApi = axios.create({
    baseURL: 'https://sideshift.ai/api/v2',
    headers: {
        'Content-Type': 'application/json',
        // Only add the secret header if it exists
        ...(requiredEnvVars.SIDESHIFT_SECRET && { 
            'x-sideshift-secret': requiredEnvVars.SIDESHIFT_SECRET 
        }),
    },
    timeout: 30000 // 30 second timeout
});

// Add request interceptor for debugging
sideShiftApi.interceptors.request.use(
    (config) => {
        console.log(`📤 SideShift API Request: ${config.method?.toUpperCase()} ${config.url}`);
        console.log('Request headers:', {
            ...config.headers,
            'x-sideshift-secret': config.headers['x-sideshift-secret'] ? '[REDACTED]' : undefined
        });
        console.log('Request data:', config.data);
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for debugging
sideShiftApi.interceptors.response.use(
    (response) => {
        console.log(`📥 SideShift API Response: ${response.status} ${response.statusText}`);
        return response;
    },
    (error) => {
        if (isAxiosError(error)) {
            console.error('🔴 SideShift API Error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
                code: error.code
            });
        }
        return Promise.reject(error);
    }
);

export async function getQuote(params: { 
    depositCoin: string, 
    depositNetwork?: string, 
    settleCoin: string, 
    settleNetwork?: string, 
    depositAmount: string 
}) {
    try {
        const payload = {
            ...params,
            // Only add affiliateId if it exists
            ...(requiredEnvVars.SIDESHIFT_AFFILIATE_ID && { 
                affiliateId: requiredEnvVars.SIDESHIFT_AFFILIATE_ID 
            })
        };

        console.log('Getting quote with params:', payload);
        
        const response = await sideShiftApi.post('/quotes', payload);
        
        console.log('Quote received:', {
            id: response.data.id,
            rate: response.data.rate,
            depositAmount: response.data.depositAmount,
            settleAmount: response.data.settleAmount
        });
        
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            const errorDetails = {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                code: error.code
            };
            console.error('❌ Error getting quote:', errorDetails);
            
            // Throw a more user-friendly error
            if (error.response?.status === 401) {
                throw new Error('Authentication failed. Please check API credentials.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response?.data?.error?.message || 'Invalid request parameters');
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                throw new Error('Unable to connect to SideShift API. Please try again.');
            }
        } else {
            console.error('❌ Unexpected error in getQuote:', error);
        }
        throw error;
    }
}

export async function createShift(params: { 
    quoteId: string, 
    settleAddress: string,
    refundAddress?: string 
}) {
    try {
        const payload = {
            ...params,
            // Only add affiliateId if it exists
            ...(requiredEnvVars.SIDESHIFT_AFFILIATE_ID && { 
                affiliateId: requiredEnvVars.SIDESHIFT_AFFILIATE_ID 
            })
        };

        console.log('Creating shift with params:', {
            ...payload,
            settleAddress: payload.settleAddress.substring(0, 10) + '...' // Partially hide address for security
        });
        
        const response = await sideShiftApi.post('/shifts/fixed', payload);
        
        console.log('Shift created:', {
            id: response.data.id,
            depositAddress: response.data.depositAddress?.substring(0, 10) + '...',
            status: response.data.status
        });
        
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            const errorDetails = {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                code: error.code
            };
            console.error('❌ Error creating shift:', errorDetails);
            
            // Throw more user-friendly errors
            if (error.response?.status === 401) {
                throw new Error('Authentication failed. Please check API credentials.');
            } else if (error.response?.status === 400) {
                const errorMessage = error.response?.data?.error?.message || 
                                   error.response?.data?.message || 
                                   'Invalid shift parameters';
                throw new Error(errorMessage);
            } else if (error.response?.status === 404) {
                throw new Error('Quote not found or expired. Please try again.');
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                throw new Error('Unable to connect to SideShift API. Please try again.');
            }
        } else {
            console.error('❌ Unexpected error in createShift:', error);
        }
        throw error;
    }
}

export async function pollShiftStatus(shiftId: string) {
    try {
        console.log(`Polling status for shift: ${shiftId}`);
        
        const response = await sideShiftApi.get(`/shifts/${shiftId}`);
        
        console.log('Shift status:', {
            id: response.data.id,
            status: response.data.status,
            depositStatus: response.data.depositStatus,
            settleStatus: response.data.settleStatus
        });
        
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            console.error('❌ Error polling shift status:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            
            if (error.response?.status === 404) {
                throw new Error('Shift not found');
            }
        } else {
            console.error('❌ Unexpected error in pollShiftStatus:', error);
        }
        throw error;
    }
}

export async function cancelShift(shiftId: string) {
    try {
        console.log(`Cancelling shift: ${shiftId}`);
        
        // Note: Check SideShift API docs - the endpoint might be different
        await sideShiftApi.delete(`/shifts/${shiftId}`);
        
        console.log('Shift cancelled successfully');
        return { success: true };
    } catch (error) {
        if (isAxiosError(error)) {
            console.error('❌ Error cancelling shift:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            
            if (error.response?.status === 404) {
                throw new Error('Shift not found or already completed');
            } else if (error.response?.status === 400) {
                throw new Error('Cannot cancel shift in current state');
            }
        } else {
            console.error('❌ Unexpected error in cancelShift:', error);
        }
        throw error;
    }
}

// Test function to verify API connectivity
export async function testConnection() {
    try {
        console.log('🔍 Testing SideShift API connection...');
        const response = await sideShiftApi.get('/coins');
        console.log('✅ SideShift API connection successful');
        return true;
    } catch (error) {
        console.error('❌ SideShift API connection failed:', error);
        return false;
    }
}