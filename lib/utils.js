// ============================================================================
// lib/utils.js — Data formatting utilities
// ============================================================================

function duration(seconds) {
    if (!seconds) return '';
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ' мин ' + (s > 0 ? s + ' сек' : '');
}

function fileSize(bytes) {
    if (!bytes) return '';
    var units = ['B', 'KB', 'MB', 'GB'];
    var size = bytes;
    var i = 0;
    while (size >= 1024 && i < 3) { size /= 1024; i++; }
    return size.toFixed(1) + ' ' + units[i];
}

function truncate(text, max) {
    if (!text || text.length <= max) return text || '';
    var t = text.substring(0, max - 3);
    var sp = t.lastIndexOf(' ');
    if (sp > max * 0.8) t = t.substring(0, sp);
    return t + '...';
}

function rating(favorites) {
    if (!favorites) return undefined;
    return Math.min(100, Math.round(Math.log(favorites + 1) / Math.log(10) * 20));
}

module.exports = {
    duration: duration,
    fileSize: fileSize,
    truncate: truncate,
    rating: rating
};
