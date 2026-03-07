import { create } from 'zustand';
import api from '../api/axios';

const useWalletStore = create((set, get) => ({
    balance: null,
    assets: [],
    loading: false,
    peraWallet: null,
    connectedAddress: null,

    setPeraWallet: (pw) => set({ peraWallet: pw }),
    setConnectedAddress: (addr) => set({ connectedAddress: addr }),

    // Fetch ALGO balance from backend
    fetchBalance: async (address) => {
        if (!address) return;
        set({ loading: true });
        try {
            const res = await api.get(`/api/wallet/balance/${address}`);
            set({ balance: res.data.balance, loading: false });
        } catch (err) {
            console.error('fetchBalance error:', err);
            set({ loading: false });
        }
    },

    // Fetch ASA assets
    fetchAssets: async (address) => {
        if (!address) return;
        try {
            const res = await api.get(`/api/wallet/assets/${address}`);
            set({ assets: res.data.assets || [] });
        } catch (err) {
            console.error('fetchAssets error:', err);
        }
    },

    disconnect: () => {
        const pw = get().peraWallet;
        if (pw) {
            try { pw.disconnect(); } catch (e) { /* ignore */ }
        }
        set({ connectedAddress: null, balance: null, assets: [] });
    },
}));

export default useWalletStore;
