/**
 * Data fetching utilities for the Nomos RAG Dashboard
 * Handles GitHub raw data fetching and webhook health checks.
 */

function fetchGitHubData(file) {
    const url = `${CONFIG.githubRaw}/${file}?t=${Date.now()}`;
    return fetch(url).then(response => {
        if (!response.ok) throw new Error(`Failed to fetch ${file}`);
        return response.json();
    });
}

function testWebhook(path) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    return fetch(`${CONFIG.n8nHost}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'health-check' }),
        signal: controller.signal
    }).then(response => {
        clearTimeout(timeoutId);
        return { status: response.status, ok: response.status >= 200 && response.status < 500, error: null };
    }).catch(error => {
        clearTimeout(timeoutId);
        return { status: 0, ok: false, error: error.name === 'AbortError' ? 'Timeout' : error.message };
    });
}
