// ============================================================================
// lib/cache.js — Universal TTL cache factory
// ============================================================================

/**
 * Creates a TTL-based in-memory cache instance.
 *
 * @param {Object} options
 * @param {string} options.prefix - Log prefix (default: 'CACHE')
 * @param {number} options.ttl - Time to live in ms (default: 5 min)
 * @param {number} options.maxSize - Max items before eviction (default: 100)
 * @returns {Object} Cache with get/set/remove/clear/has
 */
function createCache(options) {
    options = options || {};
    var prefix = options.prefix || 'CACHE';
    var TTL = options.ttl || 5 * 60 * 1000;
    var maxSize = options.maxSize || 100;
    var storage = {};

    function logMsg(msg) {
        console.log('[' + prefix + '] ' + msg);
    }

    return {
        get: function (key) {
            if (!key) return null;
            var entry = storage[key];
            if (!entry) return null;
            if (Date.now() - entry.time > TTL) {
                delete storage[key];
                return null;
            }
            return entry.data;
        },

        set: function (key, data) {
            if (!key) return;
            var keys = Object.keys(storage);
            if (keys.length >= maxSize) {
                // Evict oldest half
                var sorted = keys.sort(function (a, b) {
                    return storage[a].time - storage[b].time;
                });
                for (var i = 0; i < Math.floor(sorted.length / 2); i++) {
                    delete storage[sorted[i]];
                }
            }
            storage[key] = { data: data, time: Date.now() };
        },

        remove: function (key) {
            if (key) delete storage[key];
        },

        has: function (key) {
            return this.get(key) !== null;
        },

        clear: function () {
            storage = {};
        }
    };
}

module.exports = { create: createCache };
