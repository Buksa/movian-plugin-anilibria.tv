// ============================================================================
// lib/pagination.js — Catalog pagination state machine
// ============================================================================

var noop = function () {};

function option(options, name, fallback) {
    return options[name] === undefined ? fallback : options[name];
}

/**
 * Create a pagination state machine.
 *
 * The page loader must call back with either an error or:
 * { items: [], hasMore: Boolean, cacheHit: Boolean }
 *
 * The lifecycle adapter receives start, items, error, end, and more
 * transitions. Movian page effects stay in that route-owned adapter.
 */
function create(options) {
    options = options || {};

    if (typeof options.loadPage !== 'function') {
        throw new Error('pagination.loadPage is required');
    }

    var scheduler = options.scheduler || {
        setTimeout: setTimeout,
        clearTimeout: clearTimeout
    };
    var loadPage = options.loadPage;
    var lifecycle = options.lifecycle || {};
    var onLoadStart = lifecycle.start || noop;
    var onLoadEnd = lifecycle.end || noop;
    var onItems = lifecycle.items || noop;
    var onError = lifecycle.error || noop;
    var onHaveMore = lifecycle.more || noop;

    var firstPageDelay = option(options, 'firstPageDelay', 1200);
    var cacheDelay = option(options, 'cacheDelay', 50);
    var loadTimeout = option(options, 'loadTimeout', 15000);
    var prefetchDelay = option(options, 'prefetchDelay', 10);
    var maxPrefetchPage = option(options, 'maxPrefetchPage', 3);

    var nextPage = 1;
    var loading = false;
    var loadToken = 0;

    function paginationDelay(loadedPage, cacheHit, hasMore) {
        if (!hasMore) return 0;
        if (loadedPage === 1) return firstPageDelay;
        return cacheHit ? cacheDelay : 0;
    }

    function finishLoad(token, hasMore, cacheHit, loadedPage) {
        var delay = paginationDelay(loadedPage, cacheHit, hasMore);

        loading = false;
        onLoadEnd('success', loadedPage);

        if (!delay) {
            onHaveMore(hasMore);
            return;
        }

        scheduler.setTimeout(function () {
            if (token !== loadToken) return;
            onHaveMore(hasMore);
        }, delay);
    }

    function load() {
        if (loading) return;

        loading = true;
        var requestedPage = nextPage;
        var token = loadToken;

        onLoadStart(requestedPage);

        var timeoutId = scheduler.setTimeout(function () {
            if (token !== loadToken) return;
            loadToken++;
            loading = false;
            onLoadEnd('timeout', requestedPage);
        }, loadTimeout);

        loadPage(requestedPage, function (err, result) {
            scheduler.clearTimeout(timeoutId);
            if (token !== loadToken) return;

            if (err) {
                onError(err);
                onHaveMore(false);
                loading = false;
                onLoadEnd('error', requestedPage);
                return;
            }

            onItems(result.items);
            nextPage++;
            finishLoad(token, result.hasMore, result.cacheHit, requestedPage);

            if (result.cacheHit && result.hasMore && nextPage <= maxPrefetchPage) {
                scheduler.setTimeout(load, prefetchDelay);
            }
        });
    }

    return {
        load: load
    };
}

module.exports = {
    create: create
};
