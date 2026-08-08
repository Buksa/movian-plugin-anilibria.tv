// ============================================================================
// lib/richtext.js — RichText class and HTML formatting helpers
// ============================================================================

function RichText(x) {
    this.str = x.toString();
}

RichText.prototype.toRichString = function () {
    return this.str;
};

RichText.prototype.concat = function (other) {
    this.str += other.toString();
    return this;
};

function boldStr(str) {
    return '<b>' + (str || '') + '</b>';
}

function coloredStr(str, color) {
    return '<font color="' + color + '">' + (str || '') + '</font>';
}

function sizedStr(str, size) {
    return '<font size="' + size + '">' + (str || '') + '</font>';
}

module.exports = {
    RichText: RichText,
    boldStr: boldStr,
    coloredStr: coloredStr,
    sizedStr: sizedStr
};
