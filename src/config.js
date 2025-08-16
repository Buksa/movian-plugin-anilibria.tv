/**
 * config.js
 *
 * Централизованный модуль конфигурации.
 * Хранит все константы, URL и настройки плагина.
 */

var plugin = JSON.parse(Plugin.manifest);

var config = {
  // Plugin constants
  ID: plugin.id,
  PREFIX: plugin.id,
  LOGO: Plugin.path + plugin.icon,
  UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',

  // API and Content URLs
  baseUrl: 'anilibria.tv',
  apiUrl: 'https://anilibria.top/api/v1',
  coverUrl: 'https://static-libria.weekstorm.one',

  // Plugin settings
  pageSize: 25,
  //cacheTime: 6000 // 1 hour
};

module.exports = config;
