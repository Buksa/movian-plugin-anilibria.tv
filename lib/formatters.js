// ============================================================================
// lib/formatters.js — Domain transforms for Anilibria → Movian
// ============================================================================
//
// Owns: catalogItem, catalog, schedule
// ============================================================================

var imageSource = require('./image-source');
var utils = require('./utils');

var PREFIX = 'anilibria';

function catalogItem(item) {
    var genres = item.genres ?
        item.genres.slice(0, 3).map(function (g) { return g.name || g; }).join(', ') :
        undefined;

    return {
        url: PREFIX + ':release:' + item.id,
        type: 'video',
        metadata: {
            title: (item.name && item.name.main) || 'Без названия',
            description: utils.truncate(item.description || '', 200),
            icon: imageSource.poster(item.poster),
            year: item.year,
            genre: genres,
            rating: utils.rating(item.added_in_users_favorites),
            duration: item.average_duration_of_episode && item.episodes_total ?
                item.average_duration_of_episode * item.episodes_total * 60 : undefined
        }
    };
}

function prepareItems(items, unwrap) {
    return items.map(function (item) {
        return catalogItem(unwrap ? unwrap(item) : item);
    });
}

function catalog(data) {
    if (!data || !data.data) return [];
    return prepareItems(data.data);
}

function schedule(data) {
    if (!data || !data.length) return [];

    return [{
        day: 'Расписание',
        items: prepareItems(data, function (item) {
            return item.release || item;
        })
    }];
}

module.exports = {
    PREFIX: PREFIX,
    catalogItem: catalogItem,
    catalog: catalog,
    schedule: schedule
};
