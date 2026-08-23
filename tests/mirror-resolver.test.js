var assert = require('assert');
var Module = require('module');

function response(statuscode, body) {
    return {
        statuscode: statuscode,
        toString: function () {
            return typeof body === 'string' ? body : JSON.stringify(body);
        }
    };
}

function loadResolver(http) {
    var originalLoad = Module._load;
    var resolverPath = require.resolve('../lib/mirror-resolver');
    delete require.cache[resolverPath];
    var resolver = require(resolverPath);

    return {
        resolve: function (callback) {
            Module._load = function (request) {
                if (request === 'movian/http') return http;
                return originalLoad.apply(this, arguments);
            };
            try {
                resolver.resolve(callback);
            } finally {
                Module._load = originalLoad;
            }
        }
    };
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

test('extracts an AniLibria mirror from DNS TXT answers', function () {
    var observed;
    var resolver = loadResolver({
        request: function (url, options, callback) {
            assert.strictEqual(url,
                'https://dns.google/resolve?type=TXT&name=sw.anilibria.app');
            assert.deepStrictEqual(options, { method: 'GET' });
            callback(null, response(200, {
                Answer: [
                    { data: '"unrelated=value"' },
                    { data: '"anilibria.top=mirror.example"' }
                ]
            }));
        }
    });

    resolver.resolve(function (err, url) {
        observed = { err: err, url: url };
    });

    assert.strictEqual(observed.err, null);
    assert.strictEqual(observed.url, 'https://mirror.example/api/v1');
});

test('reports DNS and response parsing failures', function () {
    var resolver = loadResolver({
        request: function (url, options, callback) {
            callback(null, response(200, { Answer: [{ data: '"other=value"' }] }));
        }
    });
    var noMirror;

    resolver.resolve(function (err) {
        noMirror = err;
    });

    assert.strictEqual(noMirror.message, 'DNS resolver returned no AniLibria mirror');

    resolver = loadResolver({
        request: function (url, options, callback) {
            callback(null, response(200, '{malformed'));
        }
    });
    var malformed;

    resolver.resolve(function (err) {
        malformed = err;
    });

    assert.strictEqual(malformed.message.indexOf('DNS resolver JSON parse error:'), 0);
});
