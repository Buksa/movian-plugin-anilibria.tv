// ============================================================================
// lib/api.js - API клиент (упрощенный)
// ============================================================================

var http = require('movian/http');
var url = require('url');
var querystring = require('querystring');
var config = require('./config');

function buildUrl(baseUrl, params) {
  var queryParts = [];
  for (var key in params) {
    if (params.hasOwnProperty(key)) {
      queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
    }
  }
  return baseUrl + (queryParts.length > 0 ? '?' + queryParts.join('&') : '');
}

function request(requestUrl, callback) {
  http.request(requestUrl, {
    method: 'GET',
    headers: config.HEADERS,
    caching: config.CACHE.ENABLED,
    cacheTime: config.CACHE.DURATION
  }, function(error, response) {
    if (error) {
      callback(error, null);
      return;
    }
    
    // ✅ Определение источника данных
    var isFromCache = (response.statuscode === 0);
    
    if (response.statuscode !== 200 && response.statuscode !== 0) {
      callback(new Error('HTTP ' + response.statuscode), null);
      return;
    }
    
    try {
      var data = JSON.parse(response.toString());
      // ✅ Возврат с флагом fromCache
      callback(null, data, isFromCache);
    } catch (e) {
      callback(e, null);
    }
  });
}

module.exports = {
  getCatalog: function(page, callback) {
    var requestUrl = buildUrl(config.API.BASE_URL + '/anime/catalog/releases', {
      limit: config.UI.PAGE_SIZE,
      'f[sorting]': 'FRESH_AT_DESC',
      page: page
    });
    request(requestUrl, callback);
  },
  
  getRelease: function(id, callback) {
    var requestUrl = config.API.BASE_URL + '/anime/releases/' + id;
    request(requestUrl, callback);
  },
  
  getFranchise: function(id, callback) {
    var requestUrl = config.API.BASE_URL + '/anime/franchises/release/' + id;
    request(requestUrl, function(error, data) {
      // Франшиза опциональна, не возвращаем ошибку
      callback(null, error ? null : data);
    });
  },
  
  search: function(query, callback) {
    // Старый API для поиска
    var requestUrl = 'https://www.anilibria.tv/public/api/index.php';
    http.request(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      postdata: {
        query: 'search',
        search: query.trim(),
        filter: 'id,code,names,poster'
      }
    }, function(error, response) {
      var isFromCache = (response.statuscode === 0);
      
      if (error || (response.statuscode !== 200 && response.statuscode !== 0)) {
        callback(error || new Error('Search failed'), null);
        return;
      }
      try {
        callback(null, JSON.parse(response.toString()), isFromCache);
      } catch (e) {
        callback(e, null);
      }
    });
  }
};