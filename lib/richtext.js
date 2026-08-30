// ============================================================================
// lib/richtext.js — RichText class and HTML formatting helpers
// ============================================================================

function normalizeText(value) {
    if (value === null || typeof value === 'undefined') return '';
    try {
        return String(value);
    } catch (error) {
        return '';
    }
}

function RichText(x) {
    this.str = normalizeText(x);
}

RichText.prototype.toRichString = function () {
    return this.str;
};

RichText.prototype.concat = function (other) {
    this.str += normalizeText(other);
    return this;
};

function boldStr(str) {
    return '<b>' + normalizeText(str) + '</b>';
}

function coloredStr(str, color) {
    return '<font color="' + color + '">' + normalizeText(str) + '</font>';
}

function sizedStr(str, size) {
    return '<font size="' + size + '">' + normalizeText(str) + '</font>';
}

module.exports = {
    RichText: RichText,
    boldStr: boldStr,
    coloredStr: coloredStr,
    sizedStr: sizedStr
};
