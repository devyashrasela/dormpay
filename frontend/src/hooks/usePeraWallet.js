import { useCallback, useEffect, useRef } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import useWalletStore from '../store/useWalletStore';

const peraWallet = new PeraWalletConnect();

const usePeraWallet = () => {
    const { address, isConnected, setAddress, disconnect: storeDisconnect } = useWalletStore();
    const isReconnecting = useRef(false);

    const connect = useCallback(async () => {
        try {
            const accounts = await peraWallet.connect();
            if (accounts && accounts.length > 0) {
                setAddress(accounts[0]);

                peraWallet.connector?.on('disconnect', () => {
                    storeDisconnect();
                });
            }
            return accounts[0];
        } catch (error) {
            if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
                console.error('Pera Wallet connect error:', error);
            }
            return null;
        }
    }, [setAddress, storeDisconnect]);

    const disconnect = useCallback(async () => {
        try {
            await peraWallet.disconnect();
        } catch (error) {
            console.error('Pera Wallet disconnect error:', error);
        }
        storeDisconnect();
    }, [storeDisconnect]);

    const signTransactions = useCallback(async (txGroups) => {
        try {
            const signedTxns = await peraWallet.signTransaction([txGroups]);
            return signedTxns;
        } catch (error) {
            console.error('Transaction signing error:', error);
            throw error;
        }
    }, []);

    // Auto-reconnect on page load
    useEffect(() => {
        if (isReconnecting.current) return;
        isReconnecting.current = true;

        peraWallet
            .reconnectSession()
            .then((accounts) => {
                if (accounts && accounts.length > 0) {
                    setAddress(accounts[0]);

                    peraWallet.connector?.on('disconnect', () => {
                        storeDisconnect();
                    });
                }
            })
            .catch(() => {
                // No previous session
            })
            .finally(() => {
                isReconnecting.current = false;
            });
    }, [setAddress, storeDisconnect]);

    return {
        address,
        isConnected,
        connect,
        disconnect,
        signTransactions,
        peraWallet,
    };
};

export default usePeraWallet;
