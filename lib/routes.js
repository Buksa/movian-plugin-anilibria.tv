// ============================================================================
// lib/routes.js - Маршруты (упрощенный)
// ============================================================================

var api = require('./api');
var ui = require('./ui');
var formatters = require('./formatters');
var resume = require('./resume');
var config = require('./config');

module.exports = {
  register: function(pageModule, prefix, pluginTitle, logo) {
    // Поиск
    pageModule.Searcher(pluginTitle + ' - Result', logo, function(page, query) {
      page.metadata.title = plugin.title + ' - Search results for: ' + query;
      page.type = 'directory';
      page.loading = true;
      page.entries = 0;

      if (!query || query.trim().length < 2) {
        ui.renderError(page, 'Минимум 2 символа для поиска');
        page.loading = false;
        return;
      }

      api.search(query, function(error, data, fromCache) {
        page.loading = false;
        if (error) {
          ui.renderError(page, 'Ошибка поиска');
          return;
        }
        var items = formatters.search(data);
        ui.renderSearch(page, items);
      });
    });
    
    // Главная (каталог)
    new pageModule.Route(prefix + ':start', function(page) {
      page.type = 'directory';
      page.metadata.title = 'Anilibria.tv';
      page.model.contents = 'movies';
      page.loading = true;
      
      var currentPage = 1;
      page.flush();
      
      function loader() {
        api.getCatalog(currentPage, function(error, data, fromCache) {
          page.loading = false;
          if (error) {
            ui.renderError(page, 'Ошибка загрузки');
            page.haveMore(false);
            return;
          }
          
          var items = formatters.catalog(data);
          ui.renderCatalog(page, items);
          
          currentPage++;
          
          var hasMore = data.data && data.data.length >= config.UI.PAGE_SIZE;
          page.haveMore(hasMore);
          
          // ✅ Автозагрузка из кэша (2-3 страницы)
          if (fromCache && hasMore && currentPage <= 3) {
            setTimeout(loader, 10);
          }
        });
      }
      
      loader();
      page.asyncPaginator = loader;
    });
    
    // Страница релиза
    new pageModule.Route(prefix + ':moviepage:(.*)', function(page, id) {
      page.type = 'directory';
      page.metadata.title = 'Загрузка...';
      page.loading = true;
      
      api.getRelease(id, function(error, release, fromCache) {
        if (error) {
          page.loading = false;
          ui.renderError(page, 'Ошибка загрузки релиза');
          return;
        }
        
        api.getFranchise(id, function(err, franchiseData, franchiseFromCache) {
          page.loading = false;
          
          var franchise = formatters.franchise(franchiseData, id);
          ui.renderRelease(page, release, franchise);
          
          resume.find(page, page.getItems(), {
            autoResume: config.RESUME.AUTO_RESUME,
            findNext: config.RESUME.FIND_NEXT_EPISODE,
            delay: config.RESUME.DELAY
          });
        });
      });
    });
    
    // Воспроизведение
    new pageModule.Route(prefix + ':play:(.*)', function(page, data) {
      page.type = 'directory';
      page.loading = true;
      
      try {
        var episode = JSON.parse(data);
        page.metadata.title = episode.title;
        
        var qualities = [
          { label: '480p', url: episode.hls_480 },
          { label: '720p', url: episode.hls_720 },
          { label: '1080p', url: episode.hls_1080 }
        ];
        
        qualities.forEach(function(q) {
          if (q.url) {
            var videoParams = {
              canonicalUrl: prefix + ':play:' + data,
              no_fs_scan: true,
              title: episode.title,
              sources: [{ url: 'hls:' + q.url, title: q.label }]
            };
            
            page.appendItem('videoparams:' + JSON.stringify(videoParams), 'item', {
              title: '[HLS] - ' + q.label + ' - ' + episode.title
            });
          }
        });
      } catch (e) {
        ui.renderError(page, 'Ошибка воспроизведения');
      }
      
      page.loading = false;
    });
  }
};