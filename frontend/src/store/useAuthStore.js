import { create } from 'zustand';
import api from '../api/axios';

const useAuthStore = create((set, get) => ({
    user: null,
    isProfileSynced: false,
    loading: false,

    // Sync Auth0 user with backend (creates/updates user record)
    syncUser: async (auth0User) => {
        if (get().isProfileSynced) return get().user;
        set({ loading: true });
        try {
            const res = await api.post('/api/users/sync', {
                username: auth0User.nickname || auth0User.email?.split('@')[0],
                email: auth0User.email,
                display_name: auth0User.name,
                avatar_url: auth0User.picture,
            });
            set({ user: res.data.user, isProfileSynced: true, loading: false });
            return res.data.user;
        } catch (err) {
            console.error('syncUser error:', err);
            set({ loading: false });
            return null;
        }
    },

    // Fetch current user profile
    fetchMe: async () => {
        try {
            const res = await api.get('/api/users/me');
            set({ user: res.data.user, isProfileSynced: true });
            return res.data.user;
        } catch (err) {
            console.error('fetchMe error:', err);
            return null;
        }
    },

    // Update user profile
    updateProfile: async (updates) => {
        try {
            const res = await api.put('/api/users/me', updates);
            set({ user: res.data.user });
            return res.data.user;
        } catch (err) {
            console.error('updateProfile error:', err);
            throw err;
        }
    },

    // Mark setup as complete
    completeSetup: async () => {
        try {
            const res = await api.put('/api/users/setup/complete');
            set({ user: res.data.user });
            return res.data.user;
        } catch (err) {
            console.error('completeSetup error:', err);
        }
    },

    logout: () => set({ user: null, isProfileSynced: false }),
}));

export default useAuthStore;
