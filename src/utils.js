/**
 * utils.js
 *
 * Модуль со вспомогательными функциями (утилитами).
 */

var config = require('./config');

var utils = {
  /**
   * Formats a duration in seconds into a human-readable string (e.g., "X мин Y сек").
   * @param {number} seconds - The duration in seconds.
   * @returns {string} The formatted duration string.
   */
  formatDuration: function(seconds) {
    if (!seconds) return '';
    var minutes = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return minutes + ' мин ' + secs + ' сек';
  },

  /**
   * Formats a size in bytes into a human-readable string (e.g., "X.Y MB").
   * @param {number} bytes - The size in bytes.
   * @returns {string} The formatted size string.
   */
  formatSize: function(bytes) {
    if (!bytes) return '';
    var units = ['B', 'KB', 'MB', 'GB'];
    var size = bytes;
    var unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return size.toFixed(1) + ' ' + units[unitIndex];
  },

  /**
   * Pads a number with a leading zero if it's less than 10.
   * @param {number} n - The number to pad.
   * @returns {string|number} The padded number as a string, or the original number if not padded.
   */
  padZero: function(n) {
    return (n < 10 ? '0' : '') + n;
  },

  /**
   * Builds a URL by appending an endpoint and optionally adding query parameters.
   * @param {string} endpoint - The API endpoint.
   * @param {object} [params] - An object containing query parameters.
   * @returns {string} The constructed URL.
   */
  buildUrl: function(endpoint, params) {
    var url = config.apiUrl + endpoint;
    if (params) {
      var queryString = [];
      for (var key in params) {
        if (params.hasOwnProperty(key)) {
          queryString.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
      }
      if (queryString.length > 0) {
        url += '?' + queryString.join('&');
      }
    }
    return url;
  },

  /**
   * Extends a target object with properties from a source object.
   * @param {object} target - The object to extend.
   * @param {object} source - The object whose properties will be copied.
   * @returns {object} The extended target object.
   */
  extend: function(target, source) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
    return target;
  }
};

module.exports = utils;
