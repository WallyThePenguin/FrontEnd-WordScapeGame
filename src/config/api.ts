export const apiConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  wsURL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
}; 