import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    headers: { 'Content-Type': 'application/json' },
});

// Token will be set by Auth0 interceptor in App.jsx
let getAccessTokenSilently = null;

export const setTokenGetter = (fn) => {
    getAccessTokenSilently = fn;
};

api.interceptors.request.use(async (config) => {
    if (getAccessTokenSilently) {
        try {
            const token = await getAccessTokenSilently({
                authorizationParams: {
                    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                },
            });
            config.headers.Authorization = `Bearer ${token}`;
        } catch (err) {
            console.error('Failed to get access token:', err);
        }
    }
    return config;
});

export default api;
