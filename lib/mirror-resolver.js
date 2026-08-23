// ============================================================================
// lib/mirror-resolver.js — DNS TXT adapter for AniLibria API mirrors
// ============================================================================

var DNS_URL = 'https://dns.google/resolve?type=TXT&name=sw.anilibria.app';
var MIRROR_PREFIX = 'anilibria.top=';

function mirrorUrl(answer) {
    if (!answer || typeof answer.data === 'undefined') return null;

    var value = String(answer.data).replace(/^"|"$/g, '');
    if (value.indexOf(MIRROR_PREFIX) !== 0) return null;

    var host = value.slice(MIRROR_PREFIX.length)
        .replace(/^https?:\/\//i, '')
        .replace(/\/+$/, '');
    return host ? 'https://' + host + '/api/v1' : null;
}

function resolve(callback) {
    var http = require('movian/http');

    http.request(DNS_URL, { method: 'GET' }, function (err, response) {
        if (err) {
            callback(err);
            return;
        }
        if (!response) {
            callback(new Error('DNS resolver returned no response'));
            return;
        }
        if (response.statuscode !== 200) {
            callback(new Error('DNS resolver HTTP ' + response.statuscode));
            return;
        }

        var payload;
        try {
            payload = JSON.parse(response.toString());
        } catch (parseError) {
            callback(new Error('DNS resolver JSON parse error: ' + parseError.message));
            return;
        }

        var answers = payload && payload.Answer || [];
        for (var i = 0; i < answers.length; i++) {
            var url = mirrorUrl(answers[i]);
            if (url) {
                callback(null, url);
                return;
            }
        }

        callback(new Error('DNS resolver returned no AniLibria mirror'));
    });
}

module.exports = {
    resolve: resolve
};
