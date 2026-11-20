export interface LruCacheOptions {
  maxEntries: number;
  ttlMs?: number;
}

interface CacheEntry<V> {
  value: V;
  timestamp: number;
}

/**
 * Bounded O(1) Least-Recently-Used (LRU) cache backed by JavaScript Map insertion order.
 * Prevents unbounded memory growth from arbitrary client-supplied keys.
 */
export class LruCache<K, V> {
  private readonly maxEntries: number;
  private readonly ttlMs: number | undefined;
  private readonly store = new Map<K, CacheEntry<V>>();

  constructor(options: LruCacheOptions) {
    if (!Number.isInteger(options.maxEntries) || options.maxEntries < 1) {
      throw new RangeError("LruCache maxEntries must be a positive integer");
    }
    if (options.ttlMs !== undefined && (!Number.isFinite(options.ttlMs) || options.ttlMs <= 0)) {
      throw new RangeError("LruCache ttlMs must be a positive finite number");
    }
    this.maxEntries = options.maxEntries;
    this.ttlMs = options.ttlMs;
  }

  get size(): number {
    return this.store.size;
  }

  get capacity(): number {
    return this.maxEntries;
  }

  get(key: K, now: number = Date.now()): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (this.ttlMs !== undefined && now - entry.timestamp >= this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh recency: move entry to the newest position
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, now: number = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, { value, timestamp: now });

    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
  }

  has(key: K, now: number = Date.now()): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (this.ttlMs !== undefined && now - entry.timestamp >= this.ttlMs) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.store.clear();
  }
}
