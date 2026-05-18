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
    const res = await fetch('http://localhost:8000/metrics');
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  });
}

/**
 * Fetch tools with caching
 */
export async function fetchToolsWithCache() {
  return apiCache.get('tools', async () => {
    const res = await fetch('http://localhost:8000/tools');
    if (!res.ok) throw new Error('Failed to fetch tools');
    return res.json();
  });
}

/**
 * Get API URL based on environment
 */
function getAPIUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }
  // On localhost/127.0.0.1, use local backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  // On deployed URL, try to use relative path (same origin)
  return '';
}

/**
 * Execute query (not cached, always fresh)
 */
export async function executeQuery(question: string) {
  const apiUrl = getAPIUrl();
  if (!apiUrl) {
    throw new Error('Backend API not configured for this environment');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout for queries

  try {
    const res = await fetch(`${apiUrl}/query`, {
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
