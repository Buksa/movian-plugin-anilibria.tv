var assert = require('assert');
var torrentProjection = require('../lib/torrent-projection');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

test('groups and sorts normalized torrents by quality and compatibility', function () {
    var torrents = [{
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

    var model = torrentProjection.build(torrents);
    var groups = model.groups;
    var avc = groups[0].items[0];
    var hevc = groups[0].items[1];

    assert.strictEqual(model.count, 3);
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

test('keeps malformed torrents renderable with graceful defaults', function () {
    var model = torrentProjection.build([null, { magnet: 'minimal' }]);
    var rows = model.groups[0].items;

    assert.strictEqual(model.count, 2);
    assert.strictEqual(model.groups.length, 1);
    assert.strictEqual(rows[0].quality, 'Другое');
    assert.strictEqual(rows[0].codec, 'Другой');
    assert.strictEqual(rows[0].url, 'torrent:browse:undefined');
    assert.strictEqual(rows[0].noSeeders, true);
    assert.strictEqual(rows[1].url, 'torrent:browse:minimal');
});

test('returns an empty projection for missing torrent arrays', function () {
    assert.deepStrictEqual(torrentProjection.build(), {
        count: 0,
        groups: []
    });
});
