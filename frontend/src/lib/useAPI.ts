import { useEffect, useState } from 'react';

interface UseAPIState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Use environment variable or detect based on current URL
const getAPIUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // On localhost/127.0.0.1, use local backend
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8000';
  }
  // On deployed URL, try to use relative path (same origin)
  return '';
};

const API_URL = getAPIUrl();

/**
 * Hook for fetching metrics with caching
 */
export function useMetrics(): UseAPIState<any[]> {
  const [state, setState] = useState<UseAPIState<any[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const loadMetrics = async () => {
      try {
        // Check cache first
        const cached = cache.get('metrics');
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('Using cached metrics');
          if (mounted) {
            setState({
              data: cached.data,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // Skip if API URL is not available (deployed without backend)
        if (!API_URL) {
          if (mounted) {
            setState({
              data: [],
              loading: false,
              error: new Error('Backend API not configured for this environment'),
            });
          }
          return;
        }

        console.log('Fetching metrics from API...');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${API_URL}/metrics`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Metrics loaded:', data?.length);

        // Cache the data
        cache.set('metrics', { data, timestamp: Date.now() });

        if (mounted) {
          setState({
            data: Array.isArray(data) ? data : [],
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        if (mounted) {
          setState({
            data: [],
            loading: false,
            error: error instanceof Error ? error : new Error('Failed to fetch metrics'),
          });
        }
      }
    };

    loadMetrics();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

/**
 * Hook for fetching tools with caching
 */
export function useTools(): UseAPIState<any[]> {
  const [state, setState] = useState<UseAPIState<any[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const loadTools = async () => {
      try {
        // Check cache first
        const cached = cache.get('tools');
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('Using cached tools');
          if (mounted) {
            setState({
              data: cached.data,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // Skip if API URL is not available (deployed without backend)
        if (!API_URL) {
          if (mounted) {
            setState({
              data: [],
              loading: false,
              error: new Error('Backend API not configured for this environment'),
            });
          }
          return;
        }

        console.log('Fetching tools from API...');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${API_URL}/tools`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Tools loaded:', data?.length);

        // Cache the data
        cache.set('tools', { data, timestamp: Date.now() });

        if (mounted) {
          setState({
            data: Array.isArray(data) ? data : [],
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Failed to fetch tools:', error);
        if (mounted) {
          setState({
            data: [],
            loading: false,
            error: error instanceof Error ? error : new Error('Failed to fetch tools'),
          });
        }
      }
    };

    loadTools();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
