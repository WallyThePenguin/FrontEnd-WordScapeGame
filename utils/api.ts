const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    status?: number;
}

const logger = {
    debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[API Fetch] ${message}`, data ? data : '')
        }
    },
    error: (message: string, error?: any) => {
        console.error(`[API Fetch Error] ${message}`, error ? error : '')
    }
}

export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
    try {
        logger.debug(`Making request to ${path}`, { options })

        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(options?.headers || {}),
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        logger.debug(`Received response from ${path}`, { 
            status: res.status,
            statusText: res.statusText,
            headers: Object.fromEntries(res.headers.entries())
        })

        if (!res.ok) {
            const errorText = await res.text();
            logger.error(`HTTP error from ${path}`, { 
                status: res.status,
                statusText: res.statusText,
                errorText 
            })
            throw new Error(errorText || `HTTP error! status: ${res.status}`);
        }

        const response = await res.json();
        logger.debug(`Parsed response from ${path}`, response)
        
        // Handle both response formats:
        // 1. Direct response: { user: { id: string, ... }, accessToken: string, ... }
        // 2. Wrapped response: { data: { user: { id: string, ... }, ... }, error?: string }
        if (response.error) {
            logger.error(`API error from ${path}`, response.error)
            throw new Error(response.error);
        }

        // If the response has a data property, return that, otherwise return the response itself
        const result = (response.data !== undefined ? response.data : response) as T;
        logger.debug(`Returning processed response from ${path}`, result)
        return result;
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                logger.error(`Request timeout for ${path}`)
                throw new Error('Request timed out. Please check your connection and try again.');
            }
            if (error.message.includes('Failed to fetch')) {
                logger.error(`Connection error for ${path}`)
                throw new Error('Unable to connect to the server. Please check if the server is running.');
            }
        }
        logger.error(`Unexpected error for ${path}`, error)
        throw error;
    }
} 