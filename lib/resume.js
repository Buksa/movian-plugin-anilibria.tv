// ============================================================================
// lib/resume.js - Возобновление просмотра
// ============================================================================

var popup = require('native/popup');
var nav = require('./navigation');

function findLastWatched(items) {
  var lastWatched = null;
  var maxIndex = -1;
  
  for (var i = 0; i < items.length; i++) {
    try {
      var item = items[i];
      var type = item.root.type ? item.root.type.valueOf() : null;
      var playcount = item.root.playcount ? item.root.playcount.valueOf() : 0;
      
      if (type === 'video' && playcount > 0) {
        maxIndex = i;
        lastWatched = {
          index: i,
          title: item.root.metadata.title.valueOf(),
          url: item.root.url.valueOf()
        };
      }
    } catch (e) {
      continue;
    }
  }
  
  return lastWatched;
}

function findNext(items, currentIndex) {
  var nextIndex = currentIndex + 1;
  if (nextIndex >= items.length) return null;
  
  try {
    var item = items[nextIndex];
    return {
      index: nextIndex,
      title: item.root.metadata.title.valueOf(),
      url: item.root.url.valueOf()
    };
  } catch (e) {
    return null;
  }
}

module.exports = {
  find: function(page, items, options) {
    options = options || {};
    var autoResume = options.autoResume || false;
    var shouldFindNext = options.findNext !== false;
    var delay = options.delay || 1000;
    
    setTimeout(function() {
      var lastWatched = findLastWatched(items);
      if (!lastWatched) return;
      
      var target = lastWatched;
      if (shouldFindNext) {
        var next = findNext(items, lastWatched.index);
        if (next) target = next;
      }
      
      if (autoResume) {        
        nav.openUrl(lastWatched.url);
      } else {
        var message = shouldFindNext && target !== lastWatched ?
          'Вы смотрели: "' + lastWatched.title + '"\n\n' +
          'Продолжить со следующего эпизода?\n"' + target.title + '"' :
          'Продолжить просмотр?\n\n"' + target.title + '"';
        
        if (popup.message(message, true, true)) {
         nav.openUrl(lastWatched.url);
        }
      }
    }, delay);
  }
};