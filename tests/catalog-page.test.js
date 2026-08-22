var assert = require('assert');
var catalogPage = require('../lib/catalog-page');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

function page() {
    return {
        metadata: {},
        model: {},
        entries: 0,
        loading: null,
        haveMore: function (value) {
            this.more = value;
        }
    };
}

function dependencies(overrides) {
    var pagerOptions;
    var deps = {
        sources: {
            catalog: function (pageNumber, callback) {
                callback(null, { data: { data: [] } });
            },
            search: function (query, pageNumber, callback) {
                callback(null, { data: { data: [] } });
            },
            schedule: function (callback) {
                callback(null, { data: { data: [] } });
            }
        },
        effects: {
            catalog: function () {},
            search: function () {},
            schedule: function () {},
            error: function () {}
        },
        formatters: {
            catalog: function (data) { return data.data || []; },
            schedule: function (data) { return data; }
        },
        pagination: {
            create: function (options) {
                pagerOptions = options;
                return {
                    load: function () {
                        options.onLoadStart();
                        options.loadPage(1, function (err, result) {
                            if (err) options.onError(err);
                            else {
                                options.onItems(result.items);
                                options.onHaveMore(result.hasMore);
                            }
                            options.onLoadEnd();
                        });
                    }
                };
            }
        },
        logo: 'logo.png',
        catalogView: 'views/catalog.view',
        pageSize: 2,
        pluginTitle: 'AniLibria'
    };

    Object.keys(overrides || {}).forEach(function (key) {
        deps[key] = overrides[key];
    });
    deps.pagerOptions = function () { return pagerOptions; };
    return deps;
}

test('owns catalog page lifecycle and pagination state', function () {
    var target = page();
    var rendered;
    var deps = dependencies({
        sources: {
            catalog: function (pageNumber, callback) {
                assert.strictEqual(pageNumber, 1);
                callback(null, {
                    data: { data: ['release-1', 'release-2'] },
                    cacheHit: true
                });
            }
        },
        formatters: {
            catalog: function (data) {
                return data.data.map(function (item) {
                    return { url: item, type: 'video', metadata: { title: item } };
                });
            }
        },
        effects: {
            catalog: function (page, items) {
                rendered = items;
            }
        }
    });
    var route = catalogPage.create(deps);

    route.catalog(target, 'Каталог');

    assert.strictEqual(target.type, 'raw');
    assert.strictEqual(target.metadata.title, 'Каталог');
    assert.strictEqual(target.metadata.icon, 'logo.png');
    assert.strictEqual(target.metadata.glwview, 'views/catalog.view');
    assert.strictEqual(target.model.contents, 'grid');
    assert.strictEqual(target.entries, 2);
    assert.strictEqual(target.loading, false);
    assert.strictEqual(target.more, true);
    assert.strictEqual(rendered.length, 2);
    assert.strictEqual(deps.pagerOptions().maxPrefetchPage, 1);
});

test('publishes catalog transport errors through metadata state', function () {
    var target = page();
    var deps = dependencies({
        sources: {
            catalog: function (pageNumber, callback) {
                callback(new Error('catalog unavailable'));
            }
        }
    });

    catalogPage.create(deps).catalog(target, 'Каталог');

    assert.strictEqual(target.loading, false);
    assert.strictEqual(
        target.metadata.error,
        'Ошибка загрузки каталога: catalog unavailable'
    );
});

test('owns search validation and successful projection', function () {
    var target = page();
    var rendered;
    var sourceCalled = false;
    var deps = dependencies({
        sources: {
            search: function (query, pageNumber, callback) {
                sourceCalled = true;
                assert.strictEqual(query, 'naruto');
                assert.strictEqual(pageNumber, 1);
                callback(null, { data: { data: ['result'] } });
            }
        },
        formatters: {
            catalog: function (data) { return data.data; }
        },
        effects: {
            search: function (page, items) {
                rendered = items;
                page.entries += items.length;
            }
        }
    });

    catalogPage.create(deps).search(target, 'naruto');

    assert.strictEqual(target.metadata.title, 'AniLibria — Поиск: naruto');
    assert.strictEqual(target.type, 'directory');
    assert.strictEqual(target.loading, false);
    assert.strictEqual(target.entries, 1);
    assert.deepStrictEqual(rendered, ['result']);
    assert.strictEqual(sourceCalled, true);
});

test('keeps search empty validation and schedule lifecycle policy', function () {
    var emptyPage = page();
    var schedulePage = page();
    var errors = [];
    var scheduled;
    var deps = dependencies({
        sources: {
            search: function () {
                throw new Error('search source should not run');
            },
            schedule: function (callback) {
                callback(null, { data: { data: ['day'] } });
            }
        },
        formatters: {
            schedule: function (data) { return data; }
        },
        effects: {
            error: function (page, message) {
                errors.push(message);
            },
            schedule: function (page, days) {
                scheduled = days;
            }
        }
    });
    var route = catalogPage.create(deps);

    route.search(emptyPage, 'a');
    route.schedule(schedulePage);

    assert.strictEqual(emptyPage.loading, false);
    assert.deepStrictEqual(errors, ['Минимум 2 символа для поиска']);
    assert.strictEqual(schedulePage.type, 'directory');
    assert.strictEqual(schedulePage.metadata.title, 'Расписание');
    assert.strictEqual(schedulePage.loading, false);
    assert.deepStrictEqual(scheduled, ['day']);
});
