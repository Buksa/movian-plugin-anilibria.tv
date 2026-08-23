var assert = require('assert');
var watchedEpisode = require('../lib/watched-episode');

function value(value) {
    return {
        valueOf: function () {
            return value;
        }
    };
}

function episode(type, title, url, playcount, restartpos, displayTitle) {
    var root = {
        type: value(type),
        playcount: value(playcount || 0),
        restartpos: value(restartpos || 0),
        metadata: { title: value(title) },
        url: value(url)
    };
    if (displayTitle) root.display = { title: value(displayTitle) };
    return { root: root };
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

test('normalizes page episode and recognizes partial playback', function () {
    var candidate = watchedEpisode.normalize({
        source: 'page',
        title: 'Episode 2',
        url: 'anilibria:episode:2',
        season: 1,
        episode: 2,
        restartpos: 120
    });

    assert.strictEqual(candidate.source, 'page');
    assert.strictEqual(candidate.title, 'Episode 2');
    assert.strictEqual(candidate.restartpos, 120);
    assert.strictEqual(watchedEpisode.hasWatchedSignal(candidate), true);
});

test('finds the last watched episode and the next video', function () {
    var items = [
        episode('video', 'Episode 1', 'anilibria:episode:1', 0, 0),
        episode('video', 'Episode 2', 'anilibria:episode:2', 0, 60),
        { root: { type: value('separator') } },
        episode('video', 'Episode 3', 'anilibria:episode:3', 1, 0)
    ];
    var last = watchedEpisode.findLastWatched(items);
    var next = watchedEpisode.findNext(items, last);

    assert.strictEqual(last.title, 'Episode 3');
    assert.strictEqual(last.index, 3);
    assert.strictEqual(next, null);

    next = watchedEpisode.findNext(items,
        watchedEpisode.findLastWatched(items.slice(0, 2)));
    assert.strictEqual(next.title, 'Episode 3');
    assert.strictEqual(next.index, 3);
});

test('prefers stable AniLibria display title over external metadata', function () {
    var item = episode(
        'video',
        'External TVDB title',
        'anilibria:episode:1',
        0,
        60,
        'Падший'
    );
    var candidate = watchedEpisode.findLastWatched([item]);

    assert.strictEqual(candidate.title, 'Падший');
    assert.strictEqual(candidate.historyTitle, 'Падший');
});

test('decides resume versus next without a history source', function () {
    var partial = watchedEpisode.normalize({
        title: 'Episode 2',
        url: 'anilibria:episode:2',
        restartpos: 120
    });
    var completed = watchedEpisode.normalize({
        title: 'Episode 2',
        url: 'anilibria:episode:2',
        playcount: 1
    });
    var next = watchedEpisode.normalize({
        title: 'Episode 3',
        url: 'anilibria:episode:3'
    });

    assert.deepStrictEqual(watchedEpisode.decide(partial, next, true), {
        kind: 'resume',
        last: partial,
        target: partial
    });
    assert.deepStrictEqual(watchedEpisode.decide(completed, next, true), {
        kind: 'next',
        last: completed,
        target: next
    });
    assert.deepStrictEqual(watchedEpisode.decide(completed, null, true), {
        kind: 'resume',
        last: completed,
        target: completed
    });
});

test('uses injected effects for popup and navigation', function () {
    var effects = {
        messages: [],
        opened: [],
        confirm: function (message) {
            this.messages.push(message);
            return true;
        },
        open: function (url) {
            this.opened.push(url);
        }
    };
    var last = watchedEpisode.normalize({
        title: 'Episode 2',
        url: 'anilibria:episode:2',
        restartpos: 120
    });

    watchedEpisode.present({ kind: 'resume', last: last, target: last }, {
        effects: effects,
        autoResume: false
    });

    assert.strictEqual(effects.messages.length, 1);
    assert.deepStrictEqual(effects.opened, ['anilibria:episode:2']);

    effects.messages = [];
    effects.opened = [];
    watchedEpisode.present({ kind: 'resume', last: last, target: last }, {
        effects: effects,
        autoResume: true
    });

    assert.deepStrictEqual(effects.messages, []);
    assert.deepStrictEqual(effects.opened, ['anilibria:episode:2']);
});

test('orchestrates page scan after the configured delay', function () {
    var effects = {
        messages: [],
        opened: [],
        confirm: function (message) {
            this.messages.push(message);
            return true;
        },
        open: function (url) {
            this.opened.push(url);
        }
    };
    var items = [
        episode('video', 'Episode 1', 'anilibria:episode:1', 0, 0),
        episode('video', 'Episode 2', 'anilibria:episode:2', 1, 0),
        episode('video', 'Episode 3', 'anilibria:episode:3', 0, 0)
    ];
    var scheduledDelay;

    watchedEpisode.scan({ getItems: function () { return items; } }, items, {
        delay: 900,
        schedule: function (fn, delay) {
            scheduledDelay = delay;
            fn();
        },
        effects: effects
    });

    assert.strictEqual(scheduledDelay, 900);
    assert.strictEqual(effects.messages.length, 1);
    assert.deepStrictEqual(effects.opened, ['anilibria:episode:3']);
});

test('does not schedule a scan when the policy is disabled', function () {
    var scheduled = false;
    var previous = watchedEpisode.snapshotConfig();
    watchedEpisode.configure({ enabled: false });

    watchedEpisode.scan({}, [], {
        schedule: function () {
            scheduled = true;
        }
    });

    watchedEpisode.configure(previous);
    assert.strictEqual(scheduled, false);
});

test('owns watched configuration normalization behind configure', function () {
    watchedEpisode.configure({
        enabled: 1,
        autoResume: 0,
        findNext: '',
        delay: 99999
    });

    assert.deepStrictEqual(watchedEpisode.snapshotConfig(), {
        enabled: true,
        autoResume: false,
        findNext: false,
        delay: 5000
    });

    watchedEpisode.configure({
        enabled: true,
        autoResume: false,
        findNext: true,
        delay: 1500
    });
});
