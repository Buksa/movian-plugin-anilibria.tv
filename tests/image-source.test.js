var assert = require('assert');
var imageSourceModule = require('../lib/image-source');

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

var imageSource = imageSourceModule.create({
    baseUrl: 'https://images.example'
});

test('builds distinct poster candidates with configured base URL', function () {
    var value = imageSource.poster({
        optimized: {
            preview: '/preview.webp',
            src: '/src.webp'
        }
    });

    assert.deepStrictEqual(imageList(value), [
        { url: 'https://images.example/preview.webp', width: 400, height: 600 },
        { url: 'https://images.example/src.webp', width: 600, height: 900 }
    ]);
});

test('keeps absolute URLs and removes duplicate candidates', function () {
    var value = imageSource.poster({
        preview: 'https://cdn.example/poster.webp',
        src: 'https://cdn.example/poster.webp'
    });

    assert.deepStrictEqual(imageList(value), [
        {
            url: 'https://cdn.example/poster.webp',
            width: 400,
            height: 600
        }
    ]);
});

test('falls back from optimized fields to poster fields', function () {
    assert.deepStrictEqual(imageList(imageSource.poster({
        preview: '/preview.jpg'
    })), [{
        url: 'https://images.example/preview.jpg',
        width: 400,
        height: 600
    }]);
});

test('returns no image for missing poster data', function () {
    assert.strictEqual(imageSource.poster(null), undefined);
    assert.strictEqual(imageSource.poster({}), undefined);
});

test('builds landscape Episode candidates and poster fallback', function () {
    var preview = imageSource.episode({
        optimized: {
            preview: '/episode-preview.webp',
            src: '/episode.webp'
        }
    }, { src: '/poster.jpg' });

    assert.deepStrictEqual(imageList(preview), [
        {
            url: 'https://images.example/episode-preview.webp',
            width: 640,
            height: 360
        },
        {
            url: 'https://images.example/episode.webp',
            width: 1280,
            height: 720
        }
    ]);
    assert.strictEqual(imageList(imageSource.episode(null, {
        src: '/poster.jpg'
    }))[0].height, 600);
});
