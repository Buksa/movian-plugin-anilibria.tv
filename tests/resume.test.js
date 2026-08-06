var assert = require('assert');
var resume = require('../lib/resume');

function value(value) {
    return {
        valueOf: function () {
            return value;
        }
    };
}

function episode(type, title, url, playcount, restartpos) {
    return {
        root: {
            type: value(type),
            playcount: value(playcount || 0),
            restartpos: value(restartpos || 0),
            metadata: { title: value(title) },
            url: value(url)
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

test('normalizes page candidate and recognizes partial playback', function () {
    var candidate = resume.normalize({
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
    assert.strictEqual(resume.hasResumeSignal(candidate), true);
});

test('finds the last page candidate and the next video', function () {
    var items = [
        episode('video', 'Episode 1', 'anilibria:episode:1', 0, 0),
        episode('video', 'Episode 2', 'anilibria:episode:2', 0, 60),
        { root: { type: value('separator') } },
        episode('video', 'Episode 3', 'anilibria:episode:3', 1, 0)
    ];
    var last = resume.findLastWatched(items);
    var next = resume.findNext(items, last);

    assert.strictEqual(last.title, 'Episode 3');
    assert.strictEqual(last.index, 3);
    assert.strictEqual(next, null);

    next = resume.findNext(items, resume.findLastWatched(items.slice(0, 2)));
    assert.strictEqual(next.title, 'Episode 3');
    assert.strictEqual(next.index, 3);
});

test('decides resume versus next without a history source', function () {
    var partial = resume.normalize({
        title: 'Episode 2',
        url: 'anilibria:episode:2',
        restartpos: 120
    });
    var completed = resume.normalize({
        title: 'Episode 2',
        url: 'anilibria:episode:2',
        playcount: 1
    });
    var next = resume.normalize({
        title: 'Episode 3',
        url: 'anilibria:episode:3'
    });

    assert.deepStrictEqual(resume.decide(partial, next, true), {
        kind: 'resume',
        last: partial,
        target: partial
    });
    assert.deepStrictEqual(resume.decide(completed, next, true), {
        kind: 'next',
        last: completed,
        target: next
    });
    assert.deepStrictEqual(resume.decide(completed, null, true), {
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
    var last = resume.normalize({
        title: 'Episode 2',
        url: 'anilibria:episode:2',
        restartpos: 120
    });

    resume.present({ kind: 'resume', last: last, target: last }, {
        effects: effects,
        autoResume: false
    });

    assert.strictEqual(effects.messages.length, 1);
    assert.deepStrictEqual(effects.opened, ['anilibria:episode:2']);

    effects.messages = [];
    effects.opened = [];
    resume.present({ kind: 'resume', last: last, target: last }, {
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

    resume.find({ getItems: function () { return items; } }, items, {
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
