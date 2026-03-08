import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

const useWalletStore = create(
    persist(
        (set, get) => ({
            balance: null,
            assets: [],
            loading: false,
            peraWallet: null,
            connectedAddress: null,
            manuallyDisconnected: false,

            setPeraWallet: (pw) => set({ peraWallet: pw }),
            setConnectedAddress: (addr) => set({ connectedAddress: addr, manuallyDisconnected: false }),
            setManuallyDisconnected: (val) => set({ manuallyDisconnected: val }),

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
                set({ connectedAddress: null, balance: null, assets: [], manuallyDisconnected: true });
            },
        }),
        {
            name: 'dormpay-wallet',
            // Only persist the wallet address — not the peraWallet instance,
            // balance, assets, or loading state
            partialize: (state) => ({
                connectedAddress: state.connectedAddress,
                manuallyDisconnected: state.manuallyDisconnected,
            }),
        }
    )
);

export default useWalletStore;
