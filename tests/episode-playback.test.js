var assert = require('assert');
var playback = require('../lib/episode-playback');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}
function baseOptions() {
    return {
        release: {
            id: 7,
            year: 2026,
            name: { main: 'Основное имя', english: 'English title' },
            poster: 'poster.jpg'
        },
        episode: {
            ordinal: 2,
            name: 'Падший',
            duration: 2369,
            hls_720: 'https://cdn/720.m3u8',
            preview: 'preview.jpg'
        },
        seriesIdentity: { title: 'English title', season: 2 },
        assets: {
            episodeImageSet: function (preview) {
                return 'preview:' + preview;
            }
        },
        utils: {
            duration: function (seconds) {
                return seconds + ' sec';
            }
        }
    };
}

test('projects one playback contract across media and presentation', function () {
    var item = playback.create(baseOptions());
    var view = playback.viewProjection(item);
    var params = JSON.parse(item.url.substring('videoparams:'.length));

    assert.strictEqual(item.canonicalUrl, 'anilibria:release:7:2');
    assert.strictEqual(item.display.title, 'Падший');
    assert.strictEqual(item.display.durationText, '2369 sec');
    assert.strictEqual(view.title, item.display.title);
    assert.strictEqual(view.duration, item.duration);
    assert.deepStrictEqual(params.sources, [{
        url: 'hls:https://cdn/720.m3u8',
        title: '720p'
    }]);
    assert.deepStrictEqual(item.metadataBinding, {
        title: 'English title',
        season: 2,
        episode: 2,
        duration: 2369,
        year: 2026
    });
});

test('rejects episodes without playable sources', function () {
    var options = baseOptions();
    delete options.episode.hls_720;
    assert.strictEqual(playback.create(options), null);
});
