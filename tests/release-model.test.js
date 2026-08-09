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

function baseRelease() {
    return {
        id: 7,
        name: { main: 'Основное имя', english: 'English release Season 2' },
        alias: 'english-release-season-2',
        description: undefined,
        year: 2026,
        type: { value: 'ONA', description: 'ONA' },
        is_ongoing: false,
        genres: [{ name: 'Action' }],
        episodes_total: null,
        age_rating: { label: '16+' },
        poster: {
            optimized: {
                preview: '/poster-preview.webp',
                src: '/poster.webp'
            }
        },
        episodes: [],
        torrents: []
    };
}

function franchiseData() {
    return [{
        name: 'Серия',
        name_english: 'English release',
        first_year: 2025,
        last_year: 2026,
        total_releases: 2,
        total_episodes: 20,
        franchise_releases: [{
            sort_order: 1,
            release: {
                id: 6,
                year: 2025,
                name: { main: 'Первый релиз', english: 'English release' },
                type: { description: 'ONA' },
                episodes_total: 12,
                is_ongoing: false,
                poster: { src: '/first.jpg' }
            }
        }, {
            sort_order: 2,
            release: {
                id: 7,
                year: 2026,
                name: { main: 'Основное имя', english: 'English release Season 2' },
                type: { description: 'ONA' },
                episodes_total: 8,
                is_ongoing: false,
                poster: { src: '/second.jpg' }
            }
        }]
    }];
}

test('builds safe empty collections and page counts', function () {
    var release = baseRelease();
    release.poster = null;

    var model = releaseModel.build(release, null, 'logo.png', 7);

    assert.strictEqual(model.metadata.title, 'Основное имя');
    assert.strictEqual(model.metadata.description, '');
    assert.strictEqual(model.metadata.logo, 'logo.png');
    assert.strictEqual(model.metadata.poster, 'logo.png');
    assert.strictEqual(model.metadata.episodeCount, 0);
    assert.strictEqual(model.metadata.franchiseCount, 0);
    assert.strictEqual(model.metadata.torrentCount, 0);
    assert.strictEqual(model.metadata.hasSecondaryTabs, false);
    assert.strictEqual(model.metadata.initialTab, 'episodes');
    assert.strictEqual(model.metadata.activeTab, 'episodes');
    assert.strictEqual(model.metadata.showOverview, false);
    assert.deepStrictEqual(model.metadata.resumeCandidate, {
        available: false,
        url: '',
        title: '',
        progress: 0
    });
    assert.deepStrictEqual(model.metadata.torrentGroups, []);
    assert.deepStrictEqual(model.metadata.franchise.releases, []);
    assert.deepStrictEqual(model.episodes, []);
});

test('separates episode display fields from confident TV metadata identity', function () {
    var release = baseRelease();
    release.episodes = [{
        ordinal: 1,
        name: 'Падший',
        duration: 2369,
        hls_1080: 'https://cdn/1080.m3u8',
        hls_720: 'https://cdn/720.m3u8',
        preview: {
            optimized: {
                preview: '/episode-preview.webp',
                src: '/episode.webp'
            }
        }
    }];

    var model = releaseModel.build(release, franchiseData(), 'logo.png', 7);
    var episode = model.episodes[0];
    var params = JSON.parse(episode.url.substring('videoparams:'.length));
    var preview = JSON.parse(episode.display.preview.substring('imageset:'.length));

    assert.strictEqual(model.metadata.episodeCount, 1);
    assert.strictEqual(model.metadata.franchiseCount, 2);
    assert.strictEqual(model.metadata.hasSecondaryTabs, true);
    assert.strictEqual(model.metadata.franchise.releases[1].active, true);
    assert.strictEqual(
        model.metadata.franchise.releases[1].metadata.title,
        'Основное имя (English release Season 2)'
    );
    assert.strictEqual(episode.metadata.title, 'Падший');
    assert.strictEqual(episode.display.title, 'Падший');
    assert.strictEqual(episode.display.subtitle, 'Эпизод 1');
    assert.strictEqual(episode.display.durationText, '39 мин 29 сек');
    assert.strictEqual(preview[0].width, 640);
    assert.strictEqual(preview[0].height, 360);
    assert.deepStrictEqual(episode.metadataBinding, {
        title: 'English release',
        season: 2,
        episode: 1,
        duration: 2369,
        year: 2026
    });
    assert.deepStrictEqual(params, {
        canonicalUrl: 'anilibria:release:7:1',
        no_fs_scan: true,
        title: 'English release Season 2 — Падший',
        sources: [
            { url: 'hls:https://cdn/1080.m3u8', title: '1080p' },
            { url: 'hls:https://cdn/720.m3u8', title: '720p' }
        ]
    });
});

test('does not bind a TV episode when season identity is ambiguous', function () {
    var release = baseRelease();
    release.name.english = 'Unrelated title';
    release.alias = '';
    release.episodes = [{
        ordinal: 1,
        duration: 1200,
        hls_720: 'https://cdn/720.m3u8'
    }];

    var model = releaseModel.build(release, franchiseData(), 'logo.png', 7);

    assert.strictEqual(model.episodes[0].metadataBinding, null);
    assert.strictEqual(model.episodes[0].display.title, 'Эпизод 1');
    assert.strictEqual(
        model.episodes[0].display.preview.indexOf('imageset:'),
        0
    );
});

test('groups and sorts normalized torrents by quality and compatibility', function () {
    var release = baseRelease();
    release.torrents = [{
        label: 'English release Season 2 - AniLiberty.TOP [WEB-DL 1080p][HEVC][1-8]',
        magnet: 'hevc',
        size: 3569144161,
        seeders: 51,
        leechers: 1,
        description: '1-8',
        quality: { value: '1080p' },
        type: { description: 'WEB-DL' },
        codec: { label: 'HEVC' },
        color: { description: '10-bit' },
        bitrate: 1298,
        is_hardsub: true
    }, {
        label: 'English release Season 2 - AniLiberty.TOP [WEB-DL 1080p][AVC][1-8]',
        magnet: 'avc',
        size: 12994654574,
        seeders: 0,
        leechers: 1,
        description: '1-8',
        quality: { value: '1080p' },
        type: { description: 'WEB-DL' },
        codec: { label: 'AVC' },
        color: { description: '8-bit' },
        is_hardsub: true
    }, {
        label: 'Unknown encode',
        magnet: 'other',
        size: 1024,
        seeders: 5,
        leechers: 0
    }];

    var model = releaseModel.build(release, null, 'logo.png', 7);
    var groups = model.metadata.torrentGroups;
    var avc = groups[0].items[0];
    var hevc = groups[0].items[1];

    assert.strictEqual(model.metadata.torrentCount, 3);
    assert.strictEqual(model.metadata.initialTab, 'torrents');
    assert.strictEqual(groups[0].quality, '1080p');
    assert.strictEqual(groups[1].quality, 'Другое');
    assert.strictEqual(avc.codec, 'AVC');
    assert.strictEqual(avc.noSeeders, true);
    assert.strictEqual(avc.sizeText, '12.1 GB');
    assert.strictEqual(hevc.codec, 'HEVC');
    assert.strictEqual(hevc.bitDepth, '10-bit');
    assert.strictEqual(hevc.hardsubText, 'Hardsub');
    assert.strictEqual(hevc.bitrateText, '1298 kb/s');
    assert.strictEqual(
        hevc.shortLabel,
        'English release Season 2 · WEB-DL · Эпизоды 1-8'
    );
});

test('uses an empty franchise for malformed optional enrichment', function () {
    var release = baseRelease();
    var model = releaseModel.build(release, [{ franchise_releases: {} }], 'logo.png', 7);

    assert.strictEqual(model.metadata.franchise.title, 'Франшиза');
    assert.strictEqual(model.metadata.franchise.count, 0);
    assert.deepStrictEqual(model.metadata.franchise.releases, []);
});
