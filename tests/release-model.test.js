var assert = require('assert');
var releaseModel = require('../lib/release-model');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

test('builds a stable model when optional release data is absent', function () {
    var model = releaseModel.build({
        id: 7,
        name: { main: 'Release' },
        poster: { src: '/poster.jpg' },
        episodes: [],
        torrents: []
    }, null, 'logo.png', 7);

    assert.strictEqual(model.metadata.title, 'Release');
    assert.strictEqual(model.metadata.subtitle, '');
    assert.strictEqual(model.metadata.description, '');
    assert.strictEqual(model.metadata.logo.indexOf('imageset:'), 0);
    assert.deepStrictEqual(model.metadata.torrentsByQuality, {
        '4K': [],
        '1080p': [],
        '720p': []
    });
    assert.deepStrictEqual(model.metadata.franchise, {
        title: 'Франшиза',
        info: null,
        releases: []
    });
    assert.deepStrictEqual(model.episodes, []);
    assert.strictEqual(model.resumeCandidate, null);
});

test('shapes episode sources and franchise releases through the policy seam', function () {
    var model = releaseModel.build({
        id: 7,
        name: { main: 'Release', english: 'English release' },
        poster: { src: '/poster.jpg' },
        episodes: [
            { ordinal: 1, hls_1080: 'one-1080', hls_720: 'one-720', duration: 1457 },
            { ordinal: 2, hls_480: 'two-480', duration: 0 }
        ],
        torrents: []
    }, [{
        name: 'Saga',
        name_english: 'Saga EN',
        first_year: 2020,
        last_year: 2024,
        total_releases: 2,
        total_episodes: 24,
        franchise_releases: [{
            release: {
                id: 7,
                name: { main: 'Release', english: '' },
                poster: { src: '/poster.jpg' },
                year: 2024,
                type: { description: 'TV' },
                season: { description: 'Spring' }
            }
        }]
    }], 'logo.png', 7);

    assert.strictEqual(model.episodes.length, 2);
    assert.strictEqual(model.episodes[0].metadata.title, 'English release S01E01');
    assert.strictEqual(model.episodes[1].metadata.title, 'English release S01E02');
    assert.deepStrictEqual(JSON.parse(model.episodes[0].url.substring('videoparams:'.length)), {
        canonicalUrl: 'anilibria:release:7:1',
        no_fs_scan: true,
        title: 'English release S01E01',
        sources: [
            { url: 'hls:one-1080', title: '1080p' },
            { url: 'hls:one-720', title: '720p' }
        ]
    });
    assert.strictEqual(model.metadata.franchise.info, '2020-2024 | 2 релизов | 24 эпизодов');
    assert.strictEqual(model.metadata.franchise.releases.length, 1);
    assert.strictEqual(model.metadata.franchise.releases[0].metadata.title.toRichString(),
        '<b><font color="#FFFF00">[*] Release [Активный]</font></b>');
});

test('keeps poster precedence and groups torrent qualities', function () {
    var model = releaseModel.build({
        id: 9,
        name: { main: 'Quality release' },
        poster: {
            preview: '/poster-preview.jpg',
            src: '/poster.jpg',
            optimized: { preview: '/optimized-preview.jpg', src: '/optimized.jpg' }
        },
        torrents: [
            { label: '2160p WEB-DL', size: 100, seeders: 1, leechers: 2, magnet: '4k' },
            { label: '1080p', size: 200, seeders: 3, leechers: 4, magnet: '1080' },
            { label: '720p', size: 300, seeders: 5, leechers: 6, magnet: '720' },
            { label: 'unknown', size: 400, seeders: 7, leechers: 8, magnet: 'unknown' }
        ]
    }, null, 'logo.png', 9);

    assert.strictEqual(model.metadata.poster_landscape, '/optimized-preview.jpg');
    assert.strictEqual(model.metadata.torrentsByQuality['4K'][0].url, 'torrent:browse:4k');
    assert.strictEqual(model.metadata.torrentsByQuality['1080p'][0].url, 'torrent:browse:1080');
    assert.strictEqual(model.metadata.torrentsByQuality['720p'].length, 2);
    assert.strictEqual(model.metadata.torrentsByQuality['720p'][1].url, 'torrent:browse:unknown');
});

test('uses an empty franchise for malformed optional enrichment', function () {
    var model = releaseModel.build({
        id: 12,
        name: { main: 'Malformed franchise release' }
    }, [{ franchise_releases: {} }], 'logo.png', 12);

    assert.deepStrictEqual(model.metadata.franchise, {
        title: 'Франшиза',
        info: null,
        releases: []
    });
});
