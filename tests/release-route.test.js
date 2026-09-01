var assert = require('assert');
var releaseRoute = require('../lib/release-route');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

function page() {
    return {
        metadata: {},
        model: {},
        loading: null,
        getItems: function () {
            return ['episode-node'];
        }
    };
}

function options() {
    return {
        id: 7,
        logo: 'logo.png',
        viewPath: 'views/release.view',
        releaseUrl: 'anilibria:release:7'
    };
}

test('owns release page initialization, render, and continuation scan order', function () {
    var target = page();
    var events = [];
    var continuationArgs;
    var route = releaseRoute.create({
        load: function (id, logo, callback) {
            events.push('load:' + id + ':' + logo);
            assert.strictEqual(target.loading, true);
            callback(null, { metadata: { title: 'Loaded release' } });
        },
        release: function (page, model, viewPath, releaseUrl) {
            events.push('render');
            assert.strictEqual(page.type, 'raw');
            assert.strictEqual(page.metadata.title, 'Loaded release');
            assert.strictEqual(page.metadata.glwview, viewPath);
            assert.strictEqual(page.metadata.retryUrl, releaseUrl);
            assert.strictEqual(page.model.error, '');
            assert.strictEqual(page.loading, false);
            page.rendered = model;
        },
        continuation: {
            scan: function (page) {
                events.push('continuation');
                continuationArgs = { page: page };
            }
        }
    });

    route.present(target, options());

    assert.deepStrictEqual(events, ['load:7:logo.png', 'render', 'continuation']);
    assert.strictEqual(target.loading, false);
    assert.strictEqual(continuationArgs.page, target);
});

test('publishes a route error and stops the ordering chain', function () {
    var target = page();
    var rendered = false;
    var continuationCalled = false;
    var route = releaseRoute.create({
        load: function (id, logo, callback) {
            callback(new Error('network down'));
        },
        release: function () {
            rendered = true;
        },
        continuation: {
            scan: function () {
                continuationCalled = true;
            }
        }
    });

    route.present(target, options());

    assert.strictEqual(target.loading, false);
    assert.strictEqual(target.metadata.title, 'Не удалось загрузить релиз');
    assert.strictEqual(target.metadata.retryUrl, 'anilibria:release:7');
    assert.strictEqual(target.model.error, 'Ошибка загрузки релиза: network down');
    assert.strictEqual(rendered, false);
    assert.strictEqual(continuationCalled, false);
});
