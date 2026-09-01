var assert = require('assert');
var pageEffects = require('../lib/page-effects');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

function fakePage() {
    return {
        type: '',
        loading: true,
        metadata: {},
        model: {},
        items: [],
        appendLoadingStates: [],
        appendItem: function (url, type, metadata) {
            this.appendLoadingStates.push(this.loading);
            var item = {
                root: {
                    url: url,
                    type: type,
                    metadata: metadata
                },
                bindings: [],
                bindVideoMetadata: function (binding) {
                    this.bindings.push(binding);
                }
            };
            this.items.push(item);
            return item;
        }
    };
}

test('projects collections to a raw page while keeping nodes episode-only', function () {
    var page = fakePage();
    var binding = {
        title: 'Devil May Cry',
        season: 2,
        episode: 1,
        duration: 2369,
        year: 2026
    };
    var model = {
        metadata: {
            title: 'Дьявол может плакать 2',
            franchise: { releases: [{ active: true }] },
            torrentGroups: [{ quality: '1080p', items: [{ codec: 'AVC' }] }]
        },
        episodes: [{
            url: 'videoparams:{}',
            canonicalUrl: 'anilibria:release:10224:1',
            type: 'video',
            episode: 1,
            duration: 2369,
            display: {
                title: 'Падший',
                episode: 1,
                durationText: '39 мин 29 сек'
            },
            metadata: { title: 'Падший' },
            metadataBinding: binding
        }]
    };

    var items = pageEffects.release(
        page,
        model,
        '/plugin/views/release.view',
        'anilibria:release:10224'
    );

    assert.strictEqual(page.type, '');
    assert.deepStrictEqual(page.metadata, {});
    assert.strictEqual(page.items.length, 1);
    assert.deepStrictEqual(page.appendLoadingStates, [true]);
    assert.strictEqual(items.length, 1);
    assert.strictEqual(page.items[0].root.display.title, 'Падший');
    assert.strictEqual(page.items[0].root.episode, 1);
    assert.strictEqual(page.items[0].root.canonicalUrl, 'anilibria:release:10224:1');
    assert.deepStrictEqual(page.items[0].bindings, [binding]);
});

test('keeps AniLibria episode data when external metadata binding throws', function () {
    var page = fakePage();
    page.appendItem = function (url, type, metadata) {
        var item = {
            root: { url: url, type: type, metadata: metadata },
            bindVideoMetadata: function () {
                throw new Error('TVDB unavailable');
            }
        };
        this.items.push(item);
        return item;
    };

    pageEffects.release(page, {
        metadata: { title: 'Release' },
        episodes: [{
            url: 'videoparams:{}',
            canonicalUrl: 'anilibria:release:1:1',
            type: 'video',
            episode: 1,
            duration: 1200,
            display: { title: 'Эпизод 1' },
            metadata: { title: 'Эпизод 1' },
            metadataBinding: { title: 'Series', season: 1, episode: 1 }
        }]
    }, '/plugin/views/release.view', 'anilibria:release:1');

    assert.strictEqual(page.items.length, 1);
    assert.strictEqual(page.items[0].root.display.title, 'Эпизод 1');
});
test('keeps typed operations independent from episode node implementation', function () {
    var page = fakePage();
    page.entries = 0;
    var renderedEpisodes;
    var episodeNode = {
        render: function (target, episodes) {
            renderedEpisodes = episodes;
            target.appendItem('episode-url', 'video', { title: 'Episode' });
            return ['projected-episode'];
        }
    };
    var effects = pageEffects.create({ episodeNode: episodeNode });

    var result = effects.release(page, {
        metadata: { title: 'Release' },
        episodes: [{ id: 1 }]
    }, '/release.view', 'anilibria:release:1');

    assert.deepStrictEqual(renderedEpisodes, [{ id: 1 }]);
    assert.deepStrictEqual(result, ['projected-episode']);
    assert.strictEqual(page.items[0].root.url, 'episode-url');
    assert.strictEqual(page.metadata.glwview, undefined);
    assert.strictEqual(page.loading, true);
    assert.strictEqual(page.entries, 0);
});

test('projects catalog, search, schedule, and error page operations', function () {
    var catalogPage = fakePage();
    var searchPage = fakePage();
    searchPage.entries = 0;
    var schedulePage = fakePage();
    var errorPage = fakePage();
    var effects = pageEffects.create();

    var catalogCount = effects.catalog(catalogPage, [{
        url: 'anilibria:release:1',
        type: 'video',
        metadata: { title: 'Catalog release' }
    }]);
    var searchCount = effects.search(searchPage, [{
        url: 'anilibria:release:2',
        type: 'video',
        metadata: { title: 'Search release' }
    }]);
    var scheduleCount = effects.schedule(schedulePage, [{
        day: 'Расписание',
        items: [{
            url: 'anilibria:release:3',
            type: 'video',
            metadata: { title: 'Schedule release' }
        }]
    }]);
    effects.error(errorPage, 'network down');

    assert.strictEqual(catalogCount, 1);
    assert.strictEqual(searchCount, 1);
    assert.strictEqual(scheduleCount, 1);
    assert.strictEqual(catalogPage.items.length, 1);
    assert.strictEqual(catalogPage.items[0].root.metadata.title, 'Catalog release');
    assert.strictEqual(searchPage.items.length, 1);
    assert.strictEqual(searchPage.entries, 0);
    assert.strictEqual(schedulePage.items.length, 2);
    assert.strictEqual(schedulePage.items[0].root.type, 'separator');
    assert.strictEqual(schedulePage.items[1].root.type, 'video');
    assert.strictEqual(errorPage.items.length, 2);
    assert.strictEqual(
        errorPage.items[1].root.metadata.title.toRichString(),
        'network down'
    );
});

test('returns zero for empty collections without mutating entries', function () {
    var page = fakePage();
    page.entries = 7;

    var count = pageEffects.create().search(page, []);

    assert.strictEqual(count, 0);
    assert.strictEqual(page.entries, 7);
    assert.strictEqual(page.items.length, 2);
});

test('propagates episode renderer failures', function () {
    var effects = pageEffects.create({
        episodeNode: {
            render: function () {
                throw new Error('renderer unavailable');
            }
        }
    });

    assert.throws(function () {
        effects.release(fakePage(), { episodes: [{ id: 1 }] });
    }, /renderer unavailable/);
});