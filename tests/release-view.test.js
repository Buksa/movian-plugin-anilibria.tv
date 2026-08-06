var assert = require('assert');
var Module = require('module');

function loadReleaseView(api, fmt, assets) {
    var originalLoad = Module._load;
    var viewPath = require.resolve('../lib/release-view');

    delete require.cache[viewPath];

    Module._load = function (request) {
        if (request === './api') return api;
        if (request === './formatters') return fmt;
        if (request === './assets') return assets;
        return originalLoad.apply(this, arguments);
    };

    try {
        return require(viewPath);
    } finally {
        Module._load = originalLoad;
    }
}

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

function fakeFormatters() {
    return {
        franchise: function (data, id) {
            return data ? {
                id: id,
                title: 'Franchise title',
                releases: data
            } : null;
        },
        episodes: function (release) {
            return ['episode:' + release.id];
        },
        torrents: function (release) {
            return ['torrent:' + release.id];
        }
    };
}

test('composes a complete release render model', function () {
    var release = {
        id: 7,
        name: { main: 'Release', english: 'English release' },
        poster: { src: '/poster.jpg' },
        description: 'Description'
    };
    var api = {
        release: function (id, callback) {
            assert.strictEqual(id, 7);
            callback(null, { data: release });
        },
        franchise: function (id, callback) {
            assert.strictEqual(id, 7);
            callback(null, { data: ['related-release'] });
        }
    };
    var assets = {
        imageSet: function (poster) {
            assert.strictEqual(poster, release.poster);
            return 'imageset:release';
        }
    };
    var view = loadReleaseView(api, fakeFormatters(), assets);
    var model;

    view.load(7, 'logo.png', function (err, result) {
        assert.strictEqual(err, null);
        model = result;
    });

    assert.deepStrictEqual(model, {
        metadata: {
            title: 'Release',
            subtitle: 'English release',
            logo: 'imageset:release'
        },
        description: 'Description',
        franchise: {
            id: 7,
            title: 'Franchise title',
            releases: ['related-release']
        },
        episodes: ['episode:7'],
        torrents: ['torrent:7']
    });
});

test('uses fallback logo and omits failed optional franchise', function () {
    var api = {
        release: function (id, callback) {
            callback(null, {
                data: {
                    id: id,
                    name: { main: 'No poster' },
                    description: ''
                }
            });
        },
        franchise: function (id, callback) {
            callback(new Error('franchise unavailable'));
        }
    };
    var assets = {
        imageSet: function () {
            return undefined;
        }
    };
    var view = loadReleaseView(api, fakeFormatters(), assets);
    var model;

    view.load(8, 'logo.png', function (err, result) {
        assert.strictEqual(err, null);
        model = result;
    });

    assert.strictEqual(model.metadata.logo, 'logo.png');
    assert.strictEqual(model.franchise, null);
});

test('stops before franchise when release fails', function () {
    var franchiseCalled = false;
    var failure = new Error('release unavailable');
    var api = {
        release: function (id, callback) {
            callback(failure);
        },
        franchise: function () {
            franchiseCalled = true;
        }
    };
    var view = loadReleaseView(api, fakeFormatters(), {
        imageSet: function () { return undefined; }
    });
    var observed;

    view.load(9, 'logo.png', function (err, model) {
        observed = { err: err, model: model };
    });

    assert.strictEqual(observed.err, failure);
    assert.strictEqual(observed.model, undefined);
    assert.strictEqual(franchiseCalled, false);
});
