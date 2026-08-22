// ============================================================================
// lib/torrent-projection.js — Torrent classification, rows and sorting
// ============================================================================

var utils = require('./utils');

function qualityLabel(torrent) {
    var raw = torrent.quality && (torrent.quality.value || torrent.quality.description);
    raw = raw || torrent.label || '';
    if (/2160|4K/i.test(raw)) return '4K';
    if (/1080/i.test(raw)) return '1080p';
    if (/720/i.test(raw)) return '720p';
    return 'Другое';
}

function codecLabel(torrent) {
    var codec = torrent.codec && (torrent.codec.label || torrent.codec.value);
    if (codec) return codec;
    if (/HEVC|H\.?265|x265/i.test(torrent.label || '')) return 'HEVC';
    if (/AVC|H\.?264|x264/i.test(torrent.label || '')) return 'AVC';
    return 'Другой';
}

function codecRank(codec) {
    if (/AVC/i.test(codec)) return 0;
    if (/HEVC/i.test(codec)) return 1;
    return 2;
}

function shortLabel(torrent) {
    var label = torrent.label || '';
    var title = label.split(/\s+-\s+Ani(?:Liberty|Libria)[^[]*/i)[0] || label;
    var format = torrent.type && (torrent.type.description || torrent.type.value);
    var range = torrent.description;
    if (!range) {
        var match = /\[(\d+\s*[-–]\s*\d+)\]\s*$/.exec(label);
        range = match && match[1];
    }
    return [
        title,
        format,
        range ? 'Эпизоды ' + range : null
    ].filter(Boolean).join(' · ');
}

function row(torrent) {
    torrent = torrent || {};
    var codec = codecLabel(torrent);
    var seeders = Number(torrent.seeders) || 0;
    var leechers = Number(torrent.leechers) || 0;
    var bitrate = Number(torrent.bitrate) || 0;
    var bitDepth = torrent.color &&
        (torrent.color.description || torrent.color.value) || '';

    return {
        url: 'torrent:browse:' + torrent.magnet,
        type: 'list',
        label: torrent.label || '',
        shortLabel: shortLabel(torrent),
        quality: qualityLabel(torrent),
        codec: codec,
        codecRank: codecRank(codec),
        bitDepth: bitDepth,
        hardsub: !!torrent.is_hardsub,
        hardsubText: torrent.is_hardsub ? 'Hardsub' : '',
        bitrate: bitrate,
        bitrateText: bitrate ? bitrate + ' kb/s' : '',
        size: Number(torrent.size) || 0,
        sizeText: utils.fileSize(torrent.size),
        seeders: seeders,
        seedersText: 'S:' + seeders,
        leechers: leechers,
        leechersText: 'L:' + leechers,
        noSeeders: seeders === 0,
        episodeRange: torrent.description || ''
    };
}

function build(torrents) {
    var groups = {};
    var count = 0;
    var order = ['4K', '1080p', '720p', 'Другое'];
    torrents = torrents && typeof torrents.forEach === 'function' ? torrents : [];

    torrents.forEach(function (torrent) {
        var item = row(torrent);
        if (!groups[item.quality]) groups[item.quality] = [];
        groups[item.quality].push(item);
        count++;
    });

    var result = [];
    order.forEach(function (quality) {
        var items = groups[quality] || [];
        if (items.length === 0) return;
        items.sort(function (a, b) {
            return a.codecRank - b.codecRank || b.seeders - a.seeders;
        });
        result.push({
            quality: quality,
            items: items
        });
    });

    return {
        count: count,
        groups: result
    };
}

module.exports = {
    build: build
};
