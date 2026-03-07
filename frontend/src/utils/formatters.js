/**
 * Format ALGO amount with proper decimals
 */
export const formatAlgo = (amount, decimals = 4) => {
    if (amount === null || amount === undefined) return '0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    });
};

/**
 * Truncate Algorand address for display
 */
export const truncateAddress = (address, startLen = 6, endLen = 4) => {
    if (!address) return '';
    if (address.length <= startLen + endLen) return address;
    return `${address.slice(0, startLen)}...${address.slice(-endLen)}`;
};

/**
 * Format relative time
 */
export const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Format currency amount
 */
export const formatCurrency = (amount, assetType = 'ALGO') => {
    return `${formatAlgo(amount)} ${assetType}`;
};
