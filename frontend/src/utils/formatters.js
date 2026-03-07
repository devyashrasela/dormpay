/**
 * Format ALGO amount with fixed precision
 */
export function formatAlgo(amount) {
    if (amount == null) return '0.00';
    return parseFloat(amount).toFixed(2);
}

/**
 * ALGO to INR conversion (approximate)
 */
const INR_RATE = 148.9;

export function algoToINR(algo) {
    return (parseFloat(algo || 0) * INR_RATE).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
    });
}

/**
 * Relative time (e.g., "2h ago", "yesterday")
 */
export function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return 'yesterday';
    if (diffDay < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date for table display
 */
export function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
}

/**
 * Shorten a transaction ID
 */
export function shortenTxId(txId) {
    if (!txId) return '';
    return `TXID...${txId.slice(-4)}`;
}

/**
 * Get initials from a name or username
 */
export function getInitials(name) {
    if (!name) return '??';
    const parts = name.split(/[\s_.-]+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}
