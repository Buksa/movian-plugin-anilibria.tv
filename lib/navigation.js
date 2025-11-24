// ============================================================================
// lib/navigation.js - Навигация без изменения исходников Movian
// ============================================================================

var prop = require('movian/prop');

/**
 * Получить navigator eventSink для отправки событий openurl
 * 
 * @returns {Object|null} navigator eventSink или null если не найден
 */
function getNavigatorEventSink() {
  try {
    var navigators = prop.global.navigators;
    if (!navigators) {
      console.error('[NAV] prop.global.navigators not found');
      return null;
    }
    
    // Получить navigator через nodes[0]
    if (navigators.nodes) {
      var nav = navigators.nodes[0];
      if (nav && nav.eventSink) {
        return nav.eventSink;
      }
    }
    
    console.error('[NAV] navigator.eventSink not found');
    return null;
  } catch (e) {
    console.error('[NAV] Error getting navigator eventSink:', e);
    return null;
  }
}

/**
 * Открыть URL с сохранением истории навигации
 * 
 * @param {string} url - URL для открытия
 * @param {Object} options - Опции (необязательно)
 * @param {string} options.view - Тип представления (video, directory, etc)
 * @param {string} options.how - Способ открытия (newTab, newPage, etc)
 * @param {string} options.parenturl - URL родительской страницы
 * @returns {boolean} true если успешно, false если ошибка
 * 
 * @example
 * // Простое использование
 * navigation.openUrl("myapp:video:123");
 * 
 * @example
 * // С опциями
 * navigation.openUrl("myapp:video:123", {
 *   view: "video",
 *   parenturl: "myapp:list"
 * });
 */
function openUrl(url, options) {
  options = options || {};
  
  var eventSink = getNavigatorEventSink();
  if (!eventSink) {
    console.error('[NAV] Cannot open URL: navigator eventSink not found');
    return false;
  }
  
  var args = { url: url };
  if (options.view) args.view = options.view;
  if (options.how) args.how = options.how;
  if (options.parenturl) args.parenturl = options.parenturl;
  
  try {
    prop.sendEvent(eventSink, "openurl", args);
    console.log('[NAV] Opened URL:', url);
    return true;
  } catch (e) {
    console.error('[NAV] Error sending openurl event:', e);
    return false;
  }
}

// Экспорт
exports.getNavigatorEventSink = getNavigatorEventSink;
exports.openUrl = openUrl;
