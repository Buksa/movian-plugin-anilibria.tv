// ============================================================================
// lib/image-source.js — Image candidates, fallbacks, and ImageSet policy
// ============================================================================

var DEFAULT_BASE_URL = 'https://cdn.anilibria.top';

function absoluteUrl(baseUrl, suffix) {
    return /^https?:\/\//.test(suffix) ? suffix : baseUrl + suffix;
}

function create(options) {
    options = options || {};
    var baseUrl = options.baseUrl || DEFAULT_BASE_URL;

    function appendImages(images, sizes) {
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

    function serialize(image, dimensions) {
        if (!image) return undefined;

        var optimized = image.optimized || {};
        var medium = optimized.preview || optimized.src || image.preview || image.src || '';
        var large = optimized.src || image.src || image.preview || '';
        var images = [];

        appendImages(images, [
            { suffix: medium, width: dimensions[0], height: dimensions[1] },
            { suffix: large, width: dimensions[2], height: dimensions[3] }
        ]);

        return images.length > 0 ? 'imageset:' + JSON.stringify(images) : undefined;
    }

    return {
        poster: function (image) {
            return serialize(image, [400, 600, 600, 900]);
        },
        episode: function (preview, fallbackPoster) {
            return serialize(preview, [640, 360, 1280, 720]) ||
                serialize(fallbackPoster, [400, 600, 600, 900]);
        }
    };
}

var defaultSource = create();

module.exports = {
    create: create,
    poster: defaultSource.poster,
    episode: defaultSource.episode
};
