var assert = require('assert');
var presenter = require('../lib/release-page-presenter');

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

function options(overrides) {
    var value = {
        id: 7,
        logo: 'logo.png',
        viewPath: 'views/release.view',
        releaseUrl: 'anilibria:release:7',
        resumeConfig: { enabled: true, autoResume: false, findNext: true, delay: 1500 },
        load: function (id, logo, callback) {
            callback(null, { title: 'model' });
        },
        render: function (target, model) {
            target.loading = false;
            target.rendered = model;
        },
        resumeFind: function () {}
    };
    Object.keys(overrides || {}).forEach(function (key) {
        value[key] = overrides[key];
    });
    return value;
}

test('owns release page initialization, render, and resume order', function () {
    var target = page();
    var events = [];
    var resumeArgs;

    presenter.present(target, options({
        load: function (id, logo, callback) {
            events.push('load:' + id + ':' + logo);
            assert.strictEqual(target.loading, true);
            callback(null, { title: 'model' });
        },
        render: function (page, model, viewPath, releaseUrl) {
            events.push('render');
            assert.strictEqual(page.metadata.glwview, viewPath);
            assert.strictEqual(page.metadata.retryUrl, releaseUrl);
            page.loading = false;
            page.rendered = model;
        },
        resumeFind: function (page, items, config) {
            events.push('resume');
            resumeArgs = { page: page, items: items, config: config };
        }
    }));

    assert.deepStrictEqual(events, ['load:7:logo.png', 'render', 'resume']);
    assert.strictEqual(target.loading, false);
    assert.deepStrictEqual(resumeArgs.items, ['episode-node']);
    assert.deepStrictEqual(resumeArgs.config, {
        autoResume: false,
        findNext: true,
        delay: 1500
    });
});

test('publishes a route error and stops the ordering chain', function () {
    var target = page();
    var rendered = false;
    var resumed = false;

    presenter.present(target, options({
        load: function (id, logo, callback) {
            callback(new Error('network down'));
        },
        render: function () {
            rendered = true;
        },
        resumeFind: function () {
            resumed = true;
        }
    }));

    assert.strictEqual(target.loading, false);
    assert.strictEqual(target.metadata.title, 'Не удалось загрузить релиз');
    assert.strictEqual(target.model.error, 'Ошибка загрузки релиза: network down');
    assert.strictEqual(rendered, false);
    assert.strictEqual(resumed, false);
});

test('does not schedule resume when disabled', function () {
    var target = page();
    var resumed = false;

    presenter.present(target, options({
        resumeConfig: { enabled: false },
        resumeFind: function () {
            resumed = true;
        }
    }));

    assert.strictEqual(resumed, false);
});
