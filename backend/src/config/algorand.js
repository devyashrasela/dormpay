const algosdk = require('algosdk');

const algodClient = new algosdk.Algodv2(
    process.env.ALGOD_TOKEN || '',
    process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
    parseInt(process.env.ALGOD_PORT, 10) || 443
);

const indexerClient = new algosdk.Indexer(
    process.env.INDEXER_TOKEN || '',
    process.env.INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
    parseInt(process.env.INDEXER_PORT, 10) || 443
);

module.exports = { algodClient, indexerClient };
