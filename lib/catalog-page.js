// ============================================================================
// lib/catalog-page.js — Catalog, search, and schedule page policy
// ============================================================================

var defaultPagination = require('./pagination');
var defaultFormatters = require('./formatters');

function errorMessage(error, fallback) {
    return error && error.message ? error.message : fallback;
}

function create(dependencies) {
    dependencies = dependencies || {};

    var sources = dependencies.sources || {};
    var effects = dependencies.effects || {};
    var pagination = dependencies.pagination || defaultPagination;
    var formatters = dependencies.formatters || defaultFormatters;
    var logo = dependencies.logo || '';
    var catalogView = dependencies.catalogView || '';
    var pageSize = dependencies.pageSize || 25;
    var pluginTitle = dependencies.pluginTitle || '';

    function initializeCatalogPage(page, title) {
        page.type = 'raw';
        page.metadata.title = title;
        page.metadata.icon = logo;
        page.metadata.glwview = catalogView;
        page.metadata.error = '';
        page.model.contents = 'grid';
        page.entries = 0;
        page.loading = true;
    }

    function catalog(page, title) {
        initializeCatalogPage(page, title);

        var pager = pagination.create({
            maxPrefetchPage: 1,
            loadPage: function (pageNumber, callback) {
                sources.catalog(pageNumber, function (err, result) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    var data = result && result.data ? result.data : {};
                    callback(null, {
                        items: formatters.catalog(data),
                        hasMore: !!(data.data && data.data.length >= pageSize),
                        cacheHit: !!(result && result.cacheHit)
                    });
                });
            },
            lifecycle: {
                start: function () {
                    if (page.entries === 0) page.loading = true;
                },
                end: function () {
                    page.loading = false;
                },
                items: function (items) {
                    page.metadata.error = '';
                    effects.catalog(page, items);
                    page.entries += (items || []).length;
                },
                error: function (error) {
                    page.metadata.error = 'Ошибка загрузки каталога: ' +
                        errorMessage(error, 'повторите попытку');
                },
                more: function (hasMore) {
                    page.haveMore(hasMore);
                }
            }
        });

        page.asyncPaginator = pager.load;
        pager.load();
    }

    function search(page, query) {
        page.metadata.title = pluginTitle + ' — Поиск: ' + query;
        page.type = 'directory';
        page.loading = true;
        page.entries = 0;

        if (!query || query.trim().length < 2) {
            effects.error(page, 'Минимум 2 символа для поиска');
            page.loading = false;
            return;
        }

        sources.search(query, 1, function (err, result) {
            page.loading = false;
            if (err) {
                effects.error(page, 'Ошибка поиска: ' +
                    errorMessage(err, 'повторите попытку'));
                return;
            }

            var data = result && result.data ? result.data : {};
            effects.search(page, formatters.catalog(data));
        });
    }

    function schedule(page) {
        page.type = 'directory';
        page.metadata.title = 'Расписание';
        page.loading = true;

        sources.schedule(function (err, result) {
            page.loading = false;
            if (err) {
                effects.error(page, 'Ошибка загрузки расписания');
                return;
            }

            var data = result && result.data ? result.data : {};
            effects.schedule(page, data.data || []);
        });
    }

    return {
        catalog: catalog,
        search: search,
        schedule: schedule
    };
}

module.exports = { create: create };
