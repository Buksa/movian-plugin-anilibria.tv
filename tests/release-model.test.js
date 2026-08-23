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
    assert.deepStrictEqual(model.metadata.sections, {
        episodes: { count: 0, available: true },
        franchise: { count: 0, available: false },
        torrents: { count: 0, available: false }
    });
    assert.strictEqual(model.metadata.initialTab, 'episodes');
    assert.strictEqual(model.metadata.activeTab, 'episodes');
    assert.strictEqual(model.metadata.showOverview, false);
    assert.strictEqual(
        Object.prototype.hasOwnProperty.call(model.metadata, 'resumeCandidate'),
        false
    );
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

    assert.strictEqual(model.metadata.sections.episodes.count, 1);
    assert.strictEqual(model.metadata.sections.franchise.count, 2);
    assert.strictEqual(model.metadata.sections.franchise.available, true);
    assert.strictEqual(model.metadata.franchise.releases[1].active, true);
    assert.strictEqual(
        model.metadata.franchise.releases[1].metadata.title,
        'Основное имя (English release Season 2)'
    );
    assert.strictEqual(episode.metadata.title, 'Падший');
    assert.strictEqual(episode.metadata.duration, 2369);
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

test('keeps franchise tab when playable episodes are absent', function () {
    var release = baseRelease();
    release.episodes = [{ ordinal: 1, name: 'No source' }];
    release.torrents = [{ magnet: 'fallback', label: 'Fallback torrent' }];

    var model = releaseModel.build(release, franchiseData(), 'logo.png', 7);

    assert.deepStrictEqual(model.episodes, []);
    assert.strictEqual(model.metadata.sections.episodes.count, 0);
    assert.strictEqual(model.metadata.sections.franchise.count, 2);
    assert.strictEqual(model.metadata.sections.torrents.count, 1);
    assert.strictEqual(model.metadata.initialTab, 'franchise');
    assert.strictEqual(model.metadata.activeTab, 'franchise');
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

test('uses an empty franchise for malformed optional enrichment', function () {
    var release = baseRelease();
    var model = releaseModel.build(release, [{ franchise_releases: {} }], 'logo.png', 7);

    assert.strictEqual(model.metadata.franchise.title, 'Франшиза');
    assert.strictEqual(model.metadata.franchise.count, 0);
    assert.deepStrictEqual(model.metadata.franchise.releases, []);
});
