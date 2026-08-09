var assert = require('assert');
var ui = require('../lib/ui');

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

    var items = ui.renderRelease(
        page,
        model,
        '/plugin/views/release.view',
        'anilibria:release:10224'
    );

    assert.strictEqual(page.type, 'raw');
    assert.strictEqual(page.metadata.title, 'Дьявол может плакать 2');
    assert.strictEqual(page.metadata.glwview, '/plugin/views/release.view');
    assert.strictEqual(page.metadata.retryUrl, 'anilibria:release:10224');
    assert.strictEqual(page.metadata.franchise.releases.length, 1);
    assert.strictEqual(page.metadata.torrentGroups.length, 1);
    assert.strictEqual(page.items.length, 1);
    assert.deepStrictEqual(page.appendLoadingStates, [false]);
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

    ui.renderRelease(page, {
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