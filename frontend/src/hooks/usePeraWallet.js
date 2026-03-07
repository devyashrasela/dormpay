import { useEffect, useCallback, useRef } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import useWalletStore from '../store/useWalletStore';
import useAuthStore from '../store/useAuthStore';

const peraWallet = new PeraWalletConnect();

export default function usePeraWallet() {
    const { connectedAddress, setConnectedAddress, setPeraWallet, fetchBalance, fetchAssets } = useWalletStore();
    const { updateProfile } = useAuthStore();
    const reconnectAttempted = useRef(false);

    useEffect(() => {
        setPeraWallet(peraWallet);

        if (!reconnectAttempted.current) {
            reconnectAttempted.current = true;
            peraWallet.reconnectSession()
                .then((accounts) => {
                    if (accounts.length) {
                        setConnectedAddress(accounts[0]);
                        peraWallet.connector?.on('disconnect', handleDisconnect);
                    }
                })
                .catch(() => { /* not connected */ });
        }
    }, []);

    // Refresh balance when address changes
    useEffect(() => {
        if (connectedAddress) {
            fetchBalance(connectedAddress);
            fetchAssets(connectedAddress);
        }
    }, [connectedAddress]);

    const handleDisconnect = useCallback(() => {
        setConnectedAddress(null);
    }, []);

    const connect = useCallback(async () => {
        try {
            const accounts = await peraWallet.connect();
            setConnectedAddress(accounts[0]);
            peraWallet.connector?.on('disconnect', handleDisconnect);

            // Save wallet address to backend profile
            try {
                await updateProfile({ wallet_address: accounts[0] });
            } catch (e) { /* non-critical */ }

            return accounts[0];
        } catch (err) {
            console.error('Pera connect error:', err);
            throw err;
        }
    }, []);

    const disconnect = useCallback(() => {
        peraWallet.disconnect();
        setConnectedAddress(null);
    }, []);

    const signTransactions = useCallback(async (txnGroups) => {
        return await peraWallet.signTransaction(txnGroups);
    }, []);

    return { connect, disconnect, connectedAddress, signTransactions, peraWallet };
}
