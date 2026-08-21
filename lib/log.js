// ============================================================================
// lib/log.js — Small runtime logger with a switchable debug channel
// ============================================================================

var debugMode = false;

function format(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (error) {
            return '[unserializable: ' + error.message + ']';
        }
    }
    return String(value);
}

function setDebug(value) {
    debugMode = !!value;
}

function debug(message) {
    if (debugMode) console.log('[D] ' + format(message));
}

function error(message) {
    console.error('[E] ' + format(message));
}

function output(message) {
    console.log(format(message));
}

module.exports = {
    setDebug: setDebug,
    d: debug,
    e: error,
    p: output
};
