// ============================================================================
// lib/assets.js — Poster and ImageSet policy
// ============================================================================

var COVER_URL = 'https://cdn.anilibria.top';//https://static-libria.weekstorm.one';

function absoluteUrl(baseUrl, suffix) {
    return /^https?:\/\//.test(suffix) ? suffix : baseUrl + suffix;
}

function appendImages(images, baseUrl, sizes) {
    for (var i = 0; i < sizes.length; i++) {
        if (!sizes[i].suffix) continue;

        var url = absoluteUrl(baseUrl, sizes[i].suffix);
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

function serializeImageSet(image, dimensions) {
    if (!image) return undefined;

    var opt = image.optimized || {};
    var medium = opt.preview || opt.src || image.preview || image.src || '';
    var large = opt.src || image.src || image.preview || '';
    var images = [];

    appendImages(images, COVER_URL, [
        { suffix: medium, width: dimensions[0], height: dimensions[1] },
        { suffix: large, width: dimensions[2], height: dimensions[3] }
    ]);

    return images.length > 0 ? 'imageset:' + JSON.stringify(images) : undefined;
}

/**
 * Return the Movian ImageSet representation for a poster.
 *
 * The caller does not need to know poster precedence, CDN selection,
 * dimensions, or ImageSet serialization.
 */
function imageSet(poster) {
    return serializeImageSet(poster, [400, 600, 600, 900]);
}

/**
 * Episode artwork is landscape. Fall back to the release poster only when the
 * API has no episode preview so every video still has usable artwork.
 */
function episodeImageSet(preview, fallbackPoster) {
    return serializeImageSet(preview, [640, 360, 1280, 720]) ||
        imageSet(fallbackPoster);
}

module.exports = {
    imageSet: imageSet,
    episodeImageSet: episodeImageSet
};
