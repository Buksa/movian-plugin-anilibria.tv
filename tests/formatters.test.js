var assert = require('assert');
var formatters = require('../lib/formatters');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

test('maps a catalog item into a prepared page model', function () {
    var item = formatters.catalogItem({
        id: 7,
        name: { main: 'Release title' },
        description: 'Short description',
        poster: { optimized: { preview: '/poster.webp' } },
        year: 2026,
        genres: [{ name: 'Action' }, 'Drama'],
        added_in_users_favorites: 9,
        average_duration_of_episode: 24,
        episodes_total: 12
    });

    assert.strictEqual(formatters.PREFIX, 'anilibria');
    assert.strictEqual(item.url, 'anilibria:release:7');
    assert.strictEqual(item.type, 'video');
    assert.strictEqual(item.metadata.title, 'Release title');
    assert.strictEqual(item.metadata.description, 'Short description');
    assert.ok(item.metadata.icon.indexOf('imageset:') === 0);
    assert.strictEqual(item.metadata.year, 2026);
    assert.strictEqual(item.metadata.genre, 'Action, Drama');
    assert.strictEqual(item.metadata.rating, 20);
    assert.strictEqual(item.metadata.duration, 17280);
});

test('maps catalog and schedule collections without relying on this binding', function () {
    var catalog = formatters.catalog;
    var schedule = formatters.schedule;
    var catalogItems = catalog({
        data: [{ id: 1, name: { main: 'Catalog one' } }]
    });
    var scheduleGroups = schedule([
        { release: { id: 2, name: { main: 'Scheduled one' } } },
        { id: 3, name: { main: 'Scheduled two' } }
    ]);
    assert.deepStrictEqual(catalogItems.map(function (item) {
        return [item.url, item.metadata.title];
    }), [['anilibria:release:1', 'Catalog one']]);
    assert.strictEqual(scheduleGroups.length, 1);
    assert.strictEqual(scheduleGroups[0].day, 'Расписание');
    assert.deepStrictEqual(scheduleGroups[0].items.map(function (item) {
        return [item.url, item.metadata.title];
    }), [
        ['anilibria:release:2', 'Scheduled one'],
        ['anilibria:release:3', 'Scheduled two']
    ]);
});

test('preserves formatter fallback behavior', function () {
    var item = formatters.catalogItem({ id: 8 });

    assert.deepStrictEqual(formatters.catalog(null), []);
    assert.deepStrictEqual(formatters.catalog({}), []);
    assert.deepStrictEqual(formatters.schedule(null), []);
    assert.deepStrictEqual(formatters.schedule([]), []);
    assert.strictEqual(item.metadata.title, 'Без названия');
    assert.strictEqual(item.metadata.description, '');
    assert.strictEqual(item.metadata.icon, undefined);
    assert.strictEqual(item.metadata.genre, undefined);
    assert.strictEqual(item.metadata.rating, undefined);
    assert.strictEqual(item.metadata.duration, undefined);
});
