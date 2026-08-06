// ============================================================================
// lib/assets.js — Poster and ImageSet policy
// ============================================================================

var COVER_URL = 'https://static-libria.weekstorm.one';
var MIRROR_COVER_URL = 'https://static.anilibria.tv';

function appendImages(images, baseUrl, sizes) {
    for (var i = 0; i < sizes.length; i++) {
        if (!sizes[i].suffix) continue;

        images.push({
            url: baseUrl + sizes[i].suffix,
            width: sizes[i].width,
            height: sizes[i].height
        });
    }
}

/**
 * Return the Movian ImageSet representation for a poster.
 *
 * The caller does not need to know poster precedence, CDN fallback,
 * dimensions, or ImageSet serialization.
 */
function imageSet(poster) {
    if (!poster) return undefined;

    var opt = poster.optimized || {};
    var medium = (opt.preview || opt.src || poster.src || poster.preview || '');
    var large = (opt.src || poster.src || poster.preview || '');
    var sizes = [
        { suffix: medium, width: 400, height: 600 },
        { suffix: large, width: 600, height: 900 }
    ];
    var images = [];

    appendImages(images, COVER_URL, sizes);
    if (MIRROR_COVER_URL) appendImages(images, MIRROR_COVER_URL, sizes);

    return images.length > 0 ? 'imageset:' + JSON.stringify(images) : undefined;
}

module.exports = {
    imageSet: imageSet
};
