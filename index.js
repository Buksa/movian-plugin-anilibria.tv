// ============================================================================
// index.js - Главный файл плагина
// ============================================================================

var page = require('movian/page');
var service = require('movian/service');

var config = require('./lib/config');
var settings = require('./lib/settings');
var routes = require('./lib/routes');

var plugin = JSON.parse(Plugin.manifest);
console.log(plugin.id + ' ' + plugin.version + ' initialized');

service.create(plugin.title, config.PREFIX + ':start', 'video', true, config.LOGO);
settings.initialize(plugin);
routes.register(page, config.PREFIX, plugin.title, config.LOGO);