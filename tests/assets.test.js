var assert = require('assert');
var assets = require('../lib/assets');

function imageList(value) {
    assert.ok(value.indexOf('imageset:') === 0);
    return JSON.parse(value.substring('imageset:'.length));
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

test('builds distinct primary images without duplicate URLs', function () {
    var value = assets.imageSet({
        optimized: {
            preview: '/preview.webp',
            src: '/src.webp'
        }
    });

    assert.deepStrictEqual(imageList(value), [
        {
            url: 'https://static-libria.weekstorm.one/preview.webp',
            width: 400,
            height: 600
        },
        {
            url: 'https://static-libria.weekstorm.one/src.webp',
            width: 600,
            height: 900
        }
    ]);
});

test('falls back from optimized fields to poster fields', function () {
    var value = assets.imageSet({
        preview: '/preview.jpg'
    });

    assert.deepStrictEqual(imageList(value), [
        {
            url: 'https://static-libria.weekstorm.one/preview.jpg',
            width: 400,
            height: 600
        }
    ]);
});

test('returns no image for a missing poster', function () {
    assert.strictEqual(assets.imageSet(null), undefined);
    assert.strictEqual(assets.imageSet({}), undefined);
});

test('builds landscape episode previews and falls back to the poster', function () {
    var preview = assets.episodeImageSet({
        optimized: {
            preview: '/episode-preview.webp',
            src: '/episode.webp'
        }
    }, {
        src: '/poster.jpg'
    });

    assert.deepStrictEqual(imageList(preview), [
        {
            url: 'https://static-libria.weekstorm.one/episode-preview.webp',
            width: 640,
            height: 360
        },
        {
            url: 'https://static-libria.weekstorm.one/episode.webp',
            width: 1280,
            height: 720
        }
    ]);
    assert.strictEqual(
        imageList(assets.episodeImageSet(null, { src: '/poster.jpg' }))[0].height,
        600
    );
});
