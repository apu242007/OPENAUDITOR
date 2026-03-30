'use strict';

const NodeCache = require('node-cache');
const constants = require('../config/constants');
const logger = require('./logger').getLogger();

// Create cache instances with different TTLs
const caches = {
  templates: new NodeCache({
    stdTTL: constants.CACHE.TEMPLATE_TTL,
    checkperiod: constants.CACHE.CHECK_PERIOD,
    useClones: false
  }),

  config: new NodeCache({
    stdTTL: constants.CACHE.CONFIG_TTL,
    checkperiod: constants.CACHE.CHECK_PERIOD,
    useClones: false
  }),

  i18n: new NodeCache({
    stdTTL: constants.CACHE.I18N_TTL,
    checkperiod: constants.CACHE.CHECK_PERIOD,
    useClones: false
  }),

  static: new NodeCache({
    stdTTL: constants.CACHE.STATIC_TTL,
    checkperiod: constants.CACHE.CHECK_PERIOD,
    useClones: false
  })
};

/**
 * Get cached value or compute it
 * @param {string} cacheName - Name of cache (templates, config, i18n, static)
 * @param {string} key - Cache key
 * @param {function} computeFn - Function to compute value if not cached
 * @returns {Promise<any>}
 */
async function getOrCompute(cacheName, key, computeFn) {
  const cache = caches[cacheName];

  if (!cache) {
    logger.warn(`Unknown cache name: ${cacheName}`);
    return computeFn();
  }

  // Try to get from cache
  const cached = cache.get(key);
  if (cached !== undefined) {
    logger.debug(`Cache hit: ${cacheName}:${key}`);
    return cached;
  }

  // Compute and store
  logger.debug(`Cache miss: ${cacheName}:${key}`);
  const value = await computeFn();

  if (value !== null && value !== undefined) {
    cache.set(key, value);
  }

  return value;
}

/**
 * Get value from cache
 * @param {string} cacheName
 * @param {string} key
 * @returns {any|undefined}
 */
function get(cacheName, key) {
  const cache = caches[cacheName];
  if (!cache) return undefined;
  return cache.get(key);
}

/**
 * Set value in cache
 * @param {string} cacheName
 * @param {string} key
 * @param {any} value
 * @param {number} ttl - Optional TTL in seconds
 */
function set(cacheName, key, value, ttl) {
  const cache = caches[cacheName];
  if (!cache) return;

  if (ttl !== undefined) {
    cache.set(key, value, ttl);
  } else {
    cache.set(key, value);
  }
}

/**
 * Delete key from cache
 * @param {string} cacheName
 * @param {string} key
 */
function del(cacheName, key) {
  const cache = caches[cacheName];
  if (!cache) return;
  cache.del(key);
}

/**
 * Delete multiple keys from cache
 * @param {string} cacheName
 * @param {string[]} keys
 */
function delMultiple(cacheName, keys) {
  const cache = caches[cacheName];
  if (!cache) return;
  cache.del(keys);
}

/**
 * Clear entire cache
 * @param {string} cacheName - Optional, clears all if not specified
 */
function clear(cacheName) {
  if (cacheName) {
    const cache = caches[cacheName];
    if (cache) cache.flushAll();
  } else {
    Object.values(caches).forEach(cache => cache.flushAll());
  }
}

/**
 * Get cache statistics
 * @param {string} cacheName - Optional, returns all if not specified
 * @returns {object}
 */
function getStats(cacheName) {
  if (cacheName) {
    const cache = caches[cacheName];
    if (!cache) return null;
    return cache.getStats();
  }

  const stats = {};
  for (const [name, cache] of Object.entries(caches)) {
    stats[name] = cache.getStats();
  }
  return stats;
}

/**
 * Warm cache with frequently accessed data
 * @param {object} dbModule - Database module with helper functions
 */
async function warmCache(dbModule) {
  try {
    logger.info('Warming cache...');

    // Pre-load published templates
    const dbInstance = dbModule.getDb();
    const publishedTemplates = dbInstance.prepare(
      'SELECT id, data FROM templates WHERE status = ? ORDER BY updated_at DESC LIMIT 10'
    ).all('published');

    for (const { id, data } of publishedTemplates) {
      set('templates', `template:${id}`, JSON.parse(data));
    }

    // Pre-load config
    const config = dbModule.getConfig();
    if (config) {
      set('config', 'app_config', config);
    }

    logger.info(`Cache warmed: ${publishedTemplates.length} templates preloaded`);
  } catch (err) {
    logger.error('Error warming cache:', err);
  }
}

/**
 * Middleware to add cache headers for static resources
 * @param {number} maxAge - Max age in seconds
 * @returns {function}
 */
function cacheControl(maxAge) {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
}

/**
 * Generate ETag for file
 * @param {string} filePath - Path to file
 * @returns {string}
 */
function generateETag(filePath) {
  const fs = require('fs');
  try {
    const stats = fs.statSync(filePath);
    return `"${stats.mtime.getTime()}-${stats.size}"`;
  } catch (err) {
    return '';
  }
}

// Event listeners for cache events
Object.entries(caches).forEach(([name, cache]) => {
  cache.on('expired', (key, value) => {
    logger.debug(`Cache expired: ${name}:${key}`);
  });

  cache.on('flush', () => {
    logger.debug(`Cache flushed: ${name}`);
  });
});

module.exports = {
  getOrCompute,
  get,
  set,
  del,
  delMultiple,
  clear,
  getStats,
  warmCache,
  cacheControl,
  generateETag
};
