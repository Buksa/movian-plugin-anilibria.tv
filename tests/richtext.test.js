var assert = require('assert');
var richtext = require('../lib/richtext');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

test('renders missing values as empty RichText', function () {
    assert.strictEqual(new richtext.RichText(undefined).toRichString(), '');
    assert.strictEqual(new richtext.RichText(null).toRichString(), '');
});

test('coerces values consistently across RichText and HTML helpers', function () {
    var value = new richtext.RichText('value');

    value.concat(null).concat(undefined).concat(7).concat(false);

    assert.strictEqual(value.toRichString(), 'value7false');
    assert.strictEqual(richtext.boldStr(0), '<b>0</b>');
    assert.strictEqual(
        richtext.coloredStr(false, 'red'),
        '<font color="red">false</font>'
    );
    assert.strictEqual(
        richtext.sizedStr(null, 12),
        '<font size="12"></font>'
    );
});

test('falls back to empty text when value coercion fails', function () {
    var throwing = {
        toString: function () {
            throw new Error('cannot stringify');
        }
    };
    var value = new richtext.RichText('prefix');

    assert.strictEqual(new richtext.RichText(throwing).toRichString(), '');
    assert.strictEqual(value.concat(throwing), value);
    assert.strictEqual(value.toRichString(), 'prefix');
    assert.strictEqual(richtext.boldStr(throwing), '<b></b>');
    assert.strictEqual(
        richtext.coloredStr(throwing, 'red'),
        '<font color="red"></font>'
    );
    assert.strictEqual(
        richtext.sizedStr(throwing, 12),
        '<font size="12"></font>'
    );
});
