var assert = require('assert');
var pagination = require('../lib/pagination');

function FakeClock() {
    this.now = 0;
    this.nextId = 1;
    this.tasks = [];
}

FakeClock.prototype.setTimeout = function (fn, delay) {
    var task = {
        id: this.nextId++,
        at: this.now + delay,
        fn: fn,
        canceled: false
    };
    this.tasks.push(task);
    return task.id;
};

FakeClock.prototype.clearTimeout = function (id) {
    this.tasks.forEach(function (task) {
        if (task.id === id) task.canceled = true;
    });
};

FakeClock.prototype.runNext = function () {
    var task;
    var index = -1;

    this.tasks.sort(function (a, b) {
        return a.at - b.at || a.id - b.id;
    });

    for (var i = 0; i < this.tasks.length; i++) {
        if (!this.tasks[i].canceled) {
            index = i;
            break;
        }
    }

    if (index === -1) return false;

    task = this.tasks.splice(index, 1)[0];
    this.now = task.at;
    task.fn();
    return true;
};

FakeClock.prototype.runAll = function () {
    while (this.runNext()) {}
};

function harness(options) {
    options = options || {};
    var clock = new FakeClock();
    var loads = [];
    var events = {
        starts: [],
        ends: [],
        items: [],
        errors: [],
        more: []
    };

    var pager = pagination.create({
        scheduler: clock,
        maxPrefetchPage: options.maxPrefetchPage,
        loadPage: function (pageNumber, callback) {
            loads.push({ page: pageNumber, callback: callback });
        },
        onLoadStart: function (pageNumber) {
            events.starts.push(pageNumber);
        },
        onLoadEnd: function (reason, pageNumber) {
            events.ends.push({ reason: reason, page: pageNumber });
        },
        onItems: function (items) {
            events.items.push(items);
        },
        onError: function (err) {
            events.errors.push(err.message);
        },
        onHaveMore: function (hasMore) {
            events.more.push(hasMore);
        }
    });

    return {
        clock: clock,
        loads: loads,
        events: events,
        pager: pager
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

test('loads page one and delays has-more completion', function () {
    var h = harness();

    h.pager.load();
    h.pager.load();

    assert.deepStrictEqual(h.loads.map(function (load) { return load.page; }), [1]);
    assert.deepStrictEqual(h.events.starts, [1]);

    h.loads[0].callback(null, {
        items: ['one'],
        hasMore: true,
        cacheHit: false
    });

    assert.deepStrictEqual(h.events.items, [['one']]);
    assert.deepStrictEqual(h.events.ends, [{ reason: 'success', page: 1 }]);
    assert.deepStrictEqual(h.events.more, []);

    h.clock.runNext();
    assert.deepStrictEqual(h.events.more, [true]);
});

test('completes a short page without pacing', function () {
    var h = harness();

    h.pager.load();
    h.loads[0].callback(null, {
        items: ['last'],
        hasMore: false,
        cacheHit: false
    });

    assert.deepStrictEqual(h.events.more, [false]);
    assert.deepStrictEqual(h.events.ends, [{ reason: 'success', page: 1 }]);
});

test('prefetches cached pages through page three only', function () {
    var h = harness();

    h.pager.load();
    h.loads[0].callback(null, {
        items: ['one'],
        hasMore: true,
        cacheHit: true
    });
    h.clock.runNext();

    assert.deepStrictEqual(h.loads.map(function (load) { return load.page; }), [1, 2]);
    h.loads[1].callback(null, {
        items: ['two'],
        hasMore: true,
        cacheHit: true
    });
    h.clock.runNext();

    assert.deepStrictEqual(h.loads.map(function (load) { return load.page; }), [1, 2, 3]);
    h.loads[2].callback(null, {
        items: ['three'],
        hasMore: true,
        cacheHit: true
    });
    h.clock.runAll();

    assert.deepStrictEqual(h.loads.map(function (load) { return load.page; }), [1, 2, 3]);
});

test('does not prefetch cached pages when the limit is one', function () {
    var h = harness({ maxPrefetchPage: 1 });

    h.pager.load();
    h.loads[0].callback(null, {
        items: ['one'],
        hasMore: true,
        cacheHit: true
    });
    h.clock.runAll();

    assert.deepStrictEqual(h.loads.map(function (load) { return load.page; }), [1]);
});

test('ignores a callback after timeout cancellation', function () {
    var h = harness();

    h.pager.load();
    h.clock.runNext();

    assert.deepStrictEqual(h.events.ends, [{ reason: 'timeout', page: 1 }]);
    assert.deepStrictEqual(h.events.items, []);
    assert.deepStrictEqual(h.events.more, []);

    h.loads[0].callback(null, {
        items: ['late'],
        hasMore: false,
        cacheHit: false
    });

    assert.deepStrictEqual(h.events.items, []);
    assert.deepStrictEqual(h.events.more, []);
});

test('renders an error and stops after a failed page load', function () {
    var h = harness();
    var failure = new Error('network down');

    h.pager.load();
    h.loads[0].callback(failure);

    assert.deepStrictEqual(h.events.errors, ['network down']);
    assert.deepStrictEqual(h.events.more, [false]);
    assert.deepStrictEqual(h.events.ends, [{ reason: 'error', page: 1 }]);
});
