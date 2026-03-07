import algosdk from 'algosdk';

const ALGOD_SERVER = import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;
const ALGOD_TOKEN = '';

export const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

/**
 * Build a payment transaction
 */
export async function buildPaymentTxn({ from, to, amount, note }) {
    const suggestedParams = await algodClient.getTransactionParams().do();
    const amountInMicroAlgos = Math.floor(amount * 1_000_000);

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: from,
        receiver: to,
        amount: amountInMicroAlgos,
        note: note ? new TextEncoder().encode(note) : undefined,
        suggestedParams,
    });

    return txn;
}

/**
 * Submit a signed transaction
 */
export async function submitTransaction(signedTxn) {
    const { txid } = await algodClient.sendRawTransaction(signedTxn).do();
    return txid;
}

/**
 * Convert microAlgos to ALGO
 */
export function microAlgosToAlgo(microAlgos) {
    return microAlgos / 1_000_000;
}

/**
 * Validate an Algorand address
 */
export function isValidAddress(address) {
    try {
        return algosdk.isValidAddress(address);
    } catch {
        return false;
    }
}

/**
 * Shorten an address for display
 */
export function shortenAddress(address, chars = 6) {
    if (!address) return '';
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
