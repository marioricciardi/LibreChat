const crypto = require('crypto');
const { Time } = require('librechat-data-provider');
const { getLogStores } = require('./getLogStores');

/**
 * Creates a cache key based on the full user query text.
 * This ensures that different queries (like different fiscal years) get separate cache entries.
 *
 * @param {string} queryText - The complete user query text
 * @param {string} [userId] - Optional user ID for user-specific caching
 * @returns {string} A hashed cache key
 */
function createQueryCacheKey(queryText, userId = '') {
  const fullText = `${userId}:${queryText}`;
  // Create a hash of the query to ensure consistent key length and avoid special characters
  return crypto.createHash('sha256').update(fullText).digest('hex').substring(0, 32);
}

/**
 * Get cached query result based on the full query text
 *
 * @param {string} queryText - The complete user query text
 * @param {string} [userId] - Optional user ID for user-specific caching
 * @returns {Promise<any>} The cached result or null if not found
 */
async function getCachedQuery(queryText, userId = '') {
  if (!queryText || typeof queryText !== 'string') {
    return null;
  }

  try {
    const queryCache = getLogStores('QUERY_RESULTS');
    const cacheKey = createQueryCacheKey(queryText.trim(), userId);

    const result = await queryCache.get(cacheKey);
    if (result) {
      console.log(`Cache HIT for query: "${queryText.substring(0, 50)}..."`);
      return result;
    }

    console.log(`Cache MISS for query: "${queryText.substring(0, 50)}..."`);
    return null;
  } catch (error) {
    console.error('Error getting cached query:', error);
    return null;
  }
}

/**
 * Cache a query result based on the full query text
 *
 * @param {string} queryText - The complete user query text
 * @param {any} result - The result to cache
 * @param {string} [userId] - Optional user ID for user-specific caching
 * @param {number} [ttl] - Time to live in milliseconds (defaults to 10 minutes)
 * @returns {Promise<boolean>} Success status
 */
async function setCachedQuery(queryText, result, userId = '', ttl = Time.TEN_MINUTES) {
  if (!queryText || typeof queryText !== 'string' || result === undefined) {
    return false;
  }

  try {
    const queryCache = getLogStores('QUERY_RESULTS');
    const cacheKey = createQueryCacheKey(queryText.trim(), userId);

    await queryCache.set(
      cacheKey,
      {
        result,
        query: queryText,
        timestamp: new Date().toISOString(),
        userId,
      },
      ttl,
    );

    console.log(`Cached query result for: "${queryText.substring(0, 50)}..."`);
    return true;
  } catch (error) {
    console.error('Error caching query:', error);
    return false;
  }
}

/**
 * Clear all cached queries (useful for testing or when data changes)
 *
 * @returns {Promise<boolean>} Success status
 */
async function clearQueryCache() {
  try {
    const queryCache = getLogStores('QUERY_RESULTS');
    await queryCache.clear();
    console.log('Query cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing query cache:', error);
    return false;
  }
}

module.exports = {
  createQueryCacheKey,
  getCachedQuery,
  setCachedQuery,
  clearQueryCache,
};
