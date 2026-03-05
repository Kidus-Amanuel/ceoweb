interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private cache: Map<string, CacheEntry> = new Map();
  
  // Default TTL: 5 minutes
  private defaultTTL = 5 * 60 * 1000;

  /**
   * Set a cache entry
   * @param key Cache key
   * @param data Data to store
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };
    this.cache.set(key, entry);
    console.log(`[Cache] Set entry: ${key}, TTL: ${Math.round(ttl / 1000)}s`);
    
    // Cleanup expired entries periodically
    this.cleanup();
  }

  /**
   * Get a cache entry
   * @param key Cache key
   * @returns Cached data or null if not found or expired
   */
  get(key: string): any {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`[Cache] Cache miss: ${key}`);
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      console.log(`[Cache] Cache expired: ${key}`);
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache] Cache hit: ${key}`);
    return entry.data;
  }

  /**
   * Delete a cache entry
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
    console.log(`[Cache] Deleted entry: ${key}`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log(`[Cache] Cleared all entries`);
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    let deleted = 0;
    
    // Get all keys first to avoid collection modification during iteration
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`[Cache] Cleanup: Deleted ${deleted} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
const cache = new Cache();
export default cache;
