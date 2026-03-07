import { create } from 'zustand';

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
    clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),
    setLoading: (loading) => set({ isLoading: loading }),
}));

export default useAuthStore;
