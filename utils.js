/**
 * Utility functions for the Nomos RAG Dashboard
 */

function getStatusClass(accuracy, target) {
    if (accuracy >= target) return 'status-healthy';
    if (accuracy >= target * 0.9) return 'status-warning';
    if (accuracy > 0) return 'status-error';
    return 'status-unknown';
}

function getAccuracyClass(accuracy) {
    if (accuracy >= 85) return 'accuracy-excellent';
    if (accuracy >= 70) return 'accuracy-good';
    if (accuracy >= 50) return 'accuracy-warning';
    return 'accuracy-poor';
}

function formatTime(isoString) {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(isoString) {
    if (!isoString) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
