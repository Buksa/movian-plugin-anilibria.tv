// ============================================================================
// lib/assets.js — Poster and ImageSet policy
// ============================================================================

var COVER_URL = 'https://static-libria.weekstorm.one';

function appendImages(images, baseUrl, sizes) {
    for (var i = 0; i < sizes.length; i++) {
        if (!sizes[i].suffix) continue;

        var url = baseUrl + sizes[i].suffix;
        var duplicate = false;
        for (var j = 0; j < images.length; j++) {
            if (images[j].url === url) {
                duplicate = true;
                break;
            }
        }
        if (duplicate) continue;

        images.push({
            url: url,
            width: sizes[i].width,
            height: sizes[i].height
        });
    }
}

/**
 * Return the Movian ImageSet representation for a poster.
 *
 * The caller does not need to know poster precedence, CDN selection,
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

    return images.length > 0 ? 'imageset:' + JSON.stringify(images) : undefined;
}

module.exports = {
    imageSet: imageSet
};
