const algosdk = require('algosdk');

/**
 * Convert ALGO to microAlgos
 */
const algoToMicroAlgos = (algo) => {
    return Math.floor(algo * 1_000_000);
};

/**
 * Convert microAlgos to ALGO
 */
const microAlgosToAlgo = (microAlgos) => {
    return microAlgos / 1_000_000;
};

/**
 * Validate an Algorand address
 */
const isValidAddress = (address) => {
    try {
        return algosdk.isValidAddress(address);
    } catch {
        return false;
    }
};

/**
 * Wait for transaction confirmation
 */
const waitForConfirmation = async (algodClient, txnId, maxRounds = 5) => {
    const status = await algodClient.status().do();
    let lastRound = status['last-round'];

    for (let i = 0; i < maxRounds; i++) {
        const pendingInfo = await algodClient.pendingTransactionInformation(txnId).do();

        if (pendingInfo['confirmed-round'] && pendingInfo['confirmed-round'] > 0) {
            return {
                confirmed: true,
                round: pendingInfo['confirmed-round'],
                txnInfo: pendingInfo,
            };
        }

        lastRound++;
        await algodClient.statusAfterBlock(lastRound).do();
    }

    return { confirmed: false, round: null, txnInfo: null };
};

module.exports = {
    algoToMicroAlgos,
    microAlgosToAlgo,
    isValidAddress,
    waitForConfirmation,
};
