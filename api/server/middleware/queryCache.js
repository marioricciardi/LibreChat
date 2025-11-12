const { getCachedQuery, setCachedQuery } = require('../cache/queryCache');

/**
 * Example middleware to handle query caching for SQL-based endpoints
 * This demonstrates how to use the full query text as cache key
 */
async function queryCacheMiddleware(req, res, next) {
  // Extract the user's query from the request
  const userQuery = req.body?.message || req.body?.query || req.query?.q;
  const userId = req.user?.id || req.user?._id || '';

  if (!userQuery || typeof userQuery !== 'string') {
    return next();
  }

  try {
    // Try to get cached result based on the full query text
    const cachedResult = await getCachedQuery(userQuery, userId);

    if (cachedResult) {
      console.log(`Returning cached result for query: "${userQuery}"`);
      return res.status(200).json({
        success: true,
        data: cachedResult.result,
        cached: true,
        timestamp: cachedResult.timestamp,
      });
    }

    // If no cache hit, store the query for later caching and continue
    req.userQuery = userQuery;
    req.userId = userId;
    next();
  } catch (error) {
    console.error('Error in query cache middleware:', error);
    // Continue without caching on error
    next();
  }
}

/**
 * Example middleware to cache the response after processing
 */
async function cacheResponseMiddleware(req, res, next) {
  if (!req.userQuery) {
    return next();
  }

  // Store the original json method
  const originalJson = res.json;

  // Override the json method to cache the response
  res.json = function (body) {
    // Cache the successful response
    if (res.statusCode === 200 && body?.data) {
      setCachedQuery(req.userQuery, body.data, req.userId || '')
        .then(() => {
          console.log(`Cached response for query: "${req.userQuery}"`);
        })
        .catch((error) => {
          console.error('Error caching response:', error);
        });
    }

    // Call the original json method
    return originalJson.call(this, body);
  };

  next();
}

module.exports = {
  queryCacheMiddleware,
  cacheResponseMiddleware,
};
