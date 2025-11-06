/**
 * api.js
 *
 * Модуль для взаимодействия с API anilibria.tv.
 */

var http = require('movian/http');
var config = require('./config');
var utils = require('./utils');

var apiClient = {
  /**
   * Default headers to be sent with API requests.
   * @type {object}
   */
  defaultHeaders: {
    'Accept': 'application/json',
    'User-Agent': config.UA,
    'Content-Type': 'application/json',
    'Content-encoding': 'br'
  },

  /**
   * Makes an HTTP request to the Anilibria API.
   * @param {string} url - The URL to request.
   * @param {object} [options] - Options for the HTTP request (e.g., method, headers, postdata).
   * @param {function(Error|null, object|null)} callback - The callback function to handle the response.
   */
  request: function(url, options, callback) {
    var requestOptions = {
      method: 'GET',
      headers: utils.extend({}, this.defaultHeaders),
      caching: true,
      cacheTime: config.cacheTime
    };

    if (options) {
      utils.extend(requestOptions, options);
      if (options.headers) {
        utils.extend(requestOptions.headers, options.headers);
      }
    }

    http.request(url, requestOptions, function(error, response) {
      if (error) {
        console.error('API request failed:', error);
        callback(error, null);
        return;
      }

      if (response.statuscode !== 200) {
        var err = new Error('HTTP ' + response.statuscode);
        callback(err, null);
        return;
      }

      try {
        var data = JSON.parse(response.toString());
        callback(null, data);
      } catch (parseError) {
        callback(parseError, null);
      }
    });
  },

  /**
   * Searches for anime based on a query.
   * @param {string} query - The search query.
   * @param {function(Error|null, object|null)} callback - The callback function to handle the search results.
   */
  searchAnime: function(query, callback) {
    var url = 'https://www.' + config.baseUrl + '/public/api/index.php';
    var options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      postdata: {
        query: 'search',
        search: query,
        filter: 'id,code,names,poster'
      }
    };

    this.request(url, options, callback);
  },

  /**
   * Retrieves a catalog of anime releases.
   * @param {number} pageNum - The page number to retrieve.
   * @param {function(Error|null, object|null)} callback - The callback function to handle the catalog data.
   */
  getCatalog: function(pageNum, callback) {
    var url = utils.buildUrl('/anime/catalog/releases', {
      limit: config.pageSize,
      'f[sorting]': 'FRESH_AT_DESC',
      page: pageNum || 1
    });

    this.request(url, {}, callback);
  },

  /**
   * Retrieves details for a specific anime release.
   * @param {string} id - The ID of the anime release.
   * @param {function(Error|null, object|null)} callback - The callback function to handle the release data.
   */
  getRelease: function(id, callback) {
    var url = utils.buildUrl('/anime/releases/' + id);
    this.request(url, {}, callback);
  },

  /**
   * Retrieves franchise information for a given release.
   * @param {string} id - The ID of the anime release.
   * @param {function(Error|null, object|null)} callback - The callback function to handle the franchise data.
   */
  getFranchise: function(id, callback) {
    var url = utils.buildUrl('/anime/franchises/release/' + id);
    this.request(url, {}, function(error, data) {
      // Franchise might be missing, which is not critical
      callback(null, error ? null : data);
    });
  }
};

module.exports = apiClient;
