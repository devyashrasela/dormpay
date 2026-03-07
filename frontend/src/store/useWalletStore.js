import { create } from 'zustand';

const useWalletStore = create((set) => ({
    address: null,
    balance: null,
    assets: [],
    isConnected: false,
    isLoading: false,

    setAddress: (address) => set({ address, isConnected: !!address }),
    setBalance: (balance) => set({ balance }),
    setAssets: (assets) => set({ assets }),
    setLoading: (loading) => set({ isLoading: loading }),
    disconnect: () => set({
        address: null,
        balance: null,
        assets: [],
        isConnected: false,
    }),
}));

export default useWalletStore;
