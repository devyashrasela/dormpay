import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token getter — will be set by Auth0 integration
let getAccessToken = null;

export const setTokenGetter = (getter) => {
    getAccessToken = getter;
};

// Request interceptor — attach Bearer token
api.interceptors.request.use(
    async (config) => {
        if (getAccessToken) {
            try {
                const token = await getAccessToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (err) {
                console.error('Failed to get access token:', err);
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const { status, data } = error.response;

            if (status === 401) {
                console.warn('Unauthorized — token may be expired');
            }

            return Promise.reject({
                status,
                message: data?.error || data?.message || 'Something went wrong',
            });
        }

        return Promise.reject({
            status: 0,
            message: 'Network error — please check your connection',
        });
    }
);

export default api;
