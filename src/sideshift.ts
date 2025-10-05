import axios, { isAxiosError } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const sideShiftApi = axios.create({
    baseURL: 'https://sideshift.ai/api/v2',
    headers: {
        'Content-Type': 'application/json',
        'x-sideshift-secret': process.env.SIDESHIFT_SECRET,
        // IMPORTANT: In production, you must replace this with the user's actual IP address.
        'x-user-ip': '1.2.3.4' 
    }
});

export async function getQuote(params: { depositCoin: string, depositNetwork?: string, settleCoin: string, settleNetwork?: string, depositAmount: string }) {
    try {
        const response = await sideShiftApi.post('/quotes', {
           ...params,
            affiliateId: process.env.SIDESHIFT_AFFILIATE_ID
        });
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            console.error('Error getting quote:', error.response?.data || error.message);
        } else {
            console.error('An unexpected error occurred in getQuote:', error);
        }
        throw error;
    }
}

export async function createShift(params: { quoteId: string, settleAddress: string }) {
    try {
        const response = await sideShiftApi.post('/shifts/fixed', {
           ...params,
            affiliateId: process.env.SIDESHIFT_AFFILIATE_ID
        });
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            console.error('Error creating shift:', error.response?.data || error.message);
        } else {
            console.error('An unexpected error occurred in createShift:', error);
        }
        throw error;
    }
}

export async function pollShiftStatus(shiftId: string) {
    try {
        const response = await sideShiftApi.get(`/shifts/${shiftId}`);
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            console.error('Error polling shift status:', error.response?.data || error.message);
        } else {
            console.error('An unexpected error occurred in pollShiftStatus:', error);
        }
        throw error;
    }
}
export async function cancelShift(shiftId: string) {
    try {
        // This endpoint returns a 204 No Content on success
        await sideShiftApi.post('/cancel-order', {
            orderId: shiftId
        });
        return { success: true };
    } catch (error) {
        if (isAxiosError(error)) {
            console.error('Error cancelling shift:', error.response?.data || error.message);
        } else {
            console.error('An unexpected error occurred in cancelShift:', error);
        }
        throw error;
    }
}