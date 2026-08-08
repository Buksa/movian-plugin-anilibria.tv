// ============================================================================
// lib/formatters.js — Domain transforms for Anilibria → Movian
// ============================================================================
//
// Owns: catalogItem, catalog, schedule
// ============================================================================

var assets = require('./assets');
var utils = require('./utils');

var PREFIX = 'anilibria';

module.exports = {
    PREFIX: PREFIX,

    catalogItem: function (item) {
        var genres = item.genres ?
            item.genres.slice(0, 3).map(function (g) { return g.name || g; }).join(', ') :
            undefined;

        return {
            url: PREFIX + ':release:' + item.id,
            type: 'video',
            metadata: {
                title: (item.name && item.name.main) || 'Без названия',
                description: utils.truncate(item.description || '', 200),
                icon: assets.imageSet(item.poster),
                year: item.year,
                genre: genres,
                rating: utils.rating(item.added_in_users_favorites),
                duration: item.average_duration_of_episode && item.episodes_total ?
                    item.average_duration_of_episode * item.episodes_total * 60 : undefined
            }
        };
    },

    catalog: function (data) {
        if (!data || !data.data) return [];
        var self = this;
        return data.data.map(function (item) { return self.catalogItem(item); });
    },
    schedule: function (data) {
        if (!data || !data.length) return [];

        var self = this;
        var items = data.map(function (item) {
            var release = item.release || item;
            return self.catalogItem(release);
        });

        return [{ day: 'Расписание', items: items }];
    }

};
