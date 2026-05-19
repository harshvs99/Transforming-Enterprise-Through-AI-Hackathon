import { apiUrl } from "./apiBase";

// Simple in-memory cache for API calls
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  // Set cache TTL (default 5 minutes)
  private defaultTTL = 5 * 60 * 1000;

  /**
   * Get cached data or fetch fresh data
   */
  async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    // If request is in progress, return that promise (avoid duplicate requests)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Check if cached data is still valid
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    // Fetch fresh data
    const fetchPromise = fetcher().then((data) => {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
      });
      this.pendingRequests.delete(key);
      return data;
    });

    this.pendingRequests.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache stats (for debugging)
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instance
export const apiCache = new APICache();

/**
 * Fetch metrics with caching
 */
export async function fetchMetricsWithCache() {
  return apiCache.get('metrics', async () => {
    const res = await fetch(apiUrl('/api/metrics'));
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  });
}

/**
 * Fetch tools with caching
 */
export async function fetchToolsWithCache() {
  return apiCache.get('tools', async () => {
    const res = await fetch(apiUrl('/api/tools'));
    if (!res.ok) throw new Error('Failed to fetch tools');
    return res.json();
  });
}

/**
 * Execute query (not cached, always fresh)
 */
export async function executeQuery(question: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout for queries

  try {
    const res = await fetch(apiUrl('/api/query'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('Failed to execute query');
    return res.json();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/** List all connectors with status */
export async function fetchConnectors() {
  const res = await fetch(apiUrl('/api/connectors'));
  if (!res.ok) throw new Error('Failed to fetch connectors');
  return res.json();
}

/** Save connector configuration */
export async function configureConnector(connectorId: string, config: Record<string, string>) {
  const res = await fetch(apiUrl(`/api/connectors/${connectorId}/configure`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) throw new Error('Failed to save connector config');
  return res.json();
}

/** Test a connector connection */
export async function testConnector(connectorId: string) {
  const res = await fetch(apiUrl(`/api/connectors/${connectorId}/test`), { method: 'POST' });
  if (!res.ok) throw new Error('Connection test failed');
  return res.json();
}

/** Sync data from a connector */
export async function syncConnector(connectorId: string) {
  const res = await fetch(apiUrl(`/api/connectors/${connectorId}/sync`), { method: 'POST' });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}

/** Get simulated data from a connector */
export async function fetchConnectorData(connectorId: string) {
  const res = await fetch(apiUrl(`/api/connectors/${connectorId}/data`));
  if (!res.ok) throw new Error('Failed to fetch connector data');
  return res.json();
}

/** Fetch audit log events */
export async function fetchAuditLog(limit = 50) {
  const res = await fetch(apiUrl(`/api/audit?limit=${limit}`));
  if (!res.ok) throw new Error('Failed to fetch audit log');
  return res.json();
}

/** Run the initialize checklist */
export async function runInitialize() {
  const res = await fetch(apiUrl('/api/initialize/run'), { method: 'POST' });
  if (!res.ok) throw new Error('Initialize failed');
  return res.json();
}

/** Fetch pipeline/tool status */
export async function fetchPipelineStatus() {
  return apiCache.get('pipeline_status', async () => {
    const res = await fetch(apiUrl('/api/pipeline/status'));
    if (!res.ok) throw new Error('Failed to fetch pipeline status');
    return res.json();
  }, 60_000);
}

/** Fetch funnel data */
export async function fetchFunnel(timeRange = '30d') {
  return apiCache.get(`funnel_${timeRange}`, async () => {
    const res = await fetch(apiUrl(`/api/funnel?time_range=${timeRange}`));
    if (!res.ok) throw new Error('Failed to fetch funnel data');
    return res.json();
  }, 120_000);
}

/**
 * Drill into a specific investigation hypothesis using live DB data
 */
export async function investigateHypothesis(payload: {
  hypothesis_id: string;
  hypothesis_title: string;
  hypothesis_description: string;
  original_question: string;
}) {
  const res = await fetch(apiUrl('/api/investigate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Hypothesis investigation failed');
  return res.json();
}
