var assert = require('assert');
var episodeNode = require('../lib/episode-node');

function value(value) {
    return {
        valueOf: function () {
            return value;
        }
    };
}

function page(bindingError) {
    return {
        items: [],
        appendItem: function (url, type, metadata) {
            var item = {
                root: {
                    url: url,
                    type: type,
                    metadata: metadata
                },
                bindings: [],
                bindVideoMetadata: function (binding) {
                    this.bindings.push(binding);
                    if (bindingError) throw new Error('TVDB unavailable');
                }
            };
            this.items.push(item);
            return item;
        }
    };
}

function episode() {
    return {
        url: 'videoparams:{}',
        type: 'video',
        canonicalUrl: 'anilibria:release:7:1',
        episode: 1,
        duration: 1200,
        display: {
            title: 'Падший',
            subtitle: 'Эпизод 1'
        },
        metadata: { title: 'Падший' },
        playback: {
            canonicalUrl: 'anilibria:release:7:1',
            episode: 1,
            title: 'Падший',
            duration: 1200
        },
        metadataBinding: {
            title: 'Series',
            season: 1,
            episode: 1
        }
    };
}

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

test('roundtrips playback, display, and history through a page node', function () {
    var target = page(false);
    var items = episodeNode.render(target, [episode()]);
    var item = items[0];

    item.root.playcount = value(2);
    item.root.restartpos = value(45);

    assert.strictEqual(items.length, 1);
    assert.strictEqual(item.root.playback.title, 'Падший');
    assert.strictEqual(item.root.display.title, 'Падший');
    assert.strictEqual(item.root.episode, 1);
    assert.strictEqual(item.root.duration, 1200);
    assert.strictEqual(item.root.canonicalUrl, 'anilibria:release:7:1');
    assert.deepStrictEqual(item.bindings, [{
        title: 'Series',
        season: 1,
        episode: 1
    }]);
    assert.deepStrictEqual(episodeNode.read(item, 0), {
        source: 'page',
        title: 'Падший',
        historyTitle: 'Падший',
        url: 'videoparams:{}',
        canonicalUrl: 'anilibria:release:7:1',
        episode: 1,
        duration: 1200,
        playcount: 2,
        restartpos: 45,
        index: 0
    });
});

test('keeps the Episode node usable when metadata binding fails', function () {
    var target = page(true);
    var items = episodeNode.render(target, [episode()]);

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].root.display.title, 'Падший');
    assert.strictEqual(items[0].root.playback.episode, 1);
});

test('ignores non-video nodes when reading Watched identity', function () {
    assert.strictEqual(episodeNode.read({ root: { type: 'separator' } }, 0), null);
});
