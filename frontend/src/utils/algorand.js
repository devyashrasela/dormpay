import algosdk from 'algosdk';

export const algodClient = new algosdk.Algodv2(
    '',
    'https://testnet-api.algonode.cloud',
    443
);

export const indexerClient = new algosdk.Indexer(
    '',
    'https://testnet-idx.algonode.cloud',
    443
);

/**
 * Convert ALGO to microAlgos
 */
export const algoToMicroAlgos = (algo) => Math.floor(algo * 1_000_000);

/**
 * Convert microAlgos to ALGO
 */
export const microAlgosToAlgo = (microAlgos) => microAlgos / 1_000_000;

/**
 * Build a payment transaction
 */
export const buildPaymentTxn = async ({ from, to, amount, note = '' }) => {
    const suggestedParams = await algodClient.getTransactionParams().do();

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from,
        to,
        amount: algoToMicroAlgos(amount),
        note: note ? new Uint8Array(Buffer.from(note)) : undefined,
        suggestedParams,
    });

    return txn;
};
