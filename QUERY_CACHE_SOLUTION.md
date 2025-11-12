# Query-Based Caching Solution

This solution addresses the issue where different SQL queries with different parameters (like fiscal years) were returning the same cached results. The problem was that the cache key was based only on the endpoint URL, not the complete user query.

## Problem
- "Show me all the account balances grouped by branch and description" 
- "Show me all the account balances grouped by branch and description and fiscal year on 2015"

Both queries were using the same cache key, so the second query returned cached results from the first query.

## Solution
The new caching system uses **the complete user query text as the cache key**, ensuring that each unique question gets its own cache entry while identical questions can benefit from caching.

## Files Modified

### 1. `api/cache/queryCache.js` (NEW)
- **Purpose**: Provides query-based caching utilities
- **Key Features**:
  - Uses full query text as cache key
  - Creates SHA-256 hash for consistent key format
  - Supports user-specific caching
  - Configurable TTL (default: 10 minutes)

### 2. `api/server/middleware/queryCache.js` (NEW)
- **Purpose**: Express middleware for automatic query caching
- **Key Features**:
  - Checks for cached results before processing
  - Automatically caches successful responses
  - Transparent to existing code

### 3. `api/cache/getLogStores.js` (MODIFIED)
- **Change**: Added `QUERY_RESULTS` cache store with 10-minute TTL
- **Purpose**: Provides dedicated cache storage for query results

### 4. `api/server/services/ModelService.js` (MODIFIED)
- **Change**: Enhanced cache key generation to include `userQuery` parameter
- **Purpose**: Fixes model caching to be query-aware

## How to Use

### Option 1: Use the Middleware (Recommended)
Add the middleware to your routes that handle SQL queries:

```javascript
const { queryCacheMiddleware, cacheResponseMiddleware } = require('../middleware/queryCache');

// Apply to your SQL query routes
router.get('/api/account-balances', 
  queryCacheMiddleware,      // Check cache first
  cacheResponseMiddleware,   // Cache the response
  yourSqlQueryHandler       // Your existing handler
);
```

### Option 2: Manual Cache Usage
For more control, use the cache functions directly:

```javascript
const { getCachedQuery, setCachedQuery } = require('../../cache/queryCache');

async function handleAccountBalanceQuery(req, res) {
  const userQuery = req.body.message || req.body.query;
  const userId = req.user.id;

  // Check cache first
  const cachedResult = await getCachedQuery(userQuery, userId);
  if (cachedResult) {
    return res.json({ data: cachedResult.result, cached: true });
  }

  // Execute your SQL query
  const result = await executeYourSQLQuery(userQuery);

  // Cache the result
  await setCachedQuery(userQuery, result, userId);

  res.json({ data: result, cached: false });
}
```

## Cache Key Examples

The system creates cache keys based on the full query text:

- Query: "Show me all the account balances grouped by branch and description"
  - Cache Key: `abc123def456...` (SHA-256 hash)

- Query: "Show me all the account balances grouped by branch and description and fiscal year on 2015"  
  - Cache Key: `xyz789uvw123...` (Different SHA-256 hash)

- Query: "Show me all the account balances grouped by branch and description and fiscal year on 2017"
  - Cache Key: `mnp456qrs789...` (Different SHA-256 hash)

## Benefits

1. **Accurate Caching**: Each unique query gets its own cache entry
2. **Performance**: Identical queries return instantly from cache
3. **Flexibility**: Works with any query format or parameters
4. **User Isolation**: Optional user-specific caching
5. **Debugging**: Console logs show cache hits/misses
6. **Configurable**: TTL and other settings can be adjusted

## Configuration

The default TTL is 10 minutes, but you can customize it:

```javascript
// Cache for 30 minutes instead of 10
await setCachedQuery(queryText, result, userId, Time.THIRTY_MINUTES);
```

## Testing

To clear all cached queries (useful during development):

```javascript
const { clearQueryCache } = require('./cache/queryCache');
await clearQueryCache();
```

## Integration with Existing Code

This solution is designed to be **non-intrusive**:
- Existing code continues to work unchanged
- Caching is optional and fails gracefully
- Performance impact is minimal
- Can be gradually rolled out to specific endpoints

The key insight is that **the user's complete query text is the most reliable identifier** for caching purposes, ensuring that "fiscal year 2015" and "fiscal year 2017" queries are treated as completely different cache entries.