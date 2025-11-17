// ============================================================================
// lib/formatters.js - Форматирование данных
// ============================================================================

var config = require('./config');

function formatDuration(seconds) {
  if (!seconds) return '';
  var minutes = Math.floor(seconds / 60);
  var secs = seconds % 60;
  return minutes + ' мин ' + secs + ' сек';
}

function formatSize(bytes) {
  if (!bytes) return '';
  var units = ['B', 'KB', 'MB', 'GB'];
  var size = bytes;
  var i = 0;
  while (size >= 1024 && i < 3) {
    size /= 1024;
    i++;
  }
  return size.toFixed(1) + ' ' + units[i];
}

function truncate(text, length) {
  if (!text || text.length <= length) return text || '';
  var truncated = text.substring(0, length - 3);
  var lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > length * 0.8) {
    truncated = truncated.substring(0, lastSpace);
  }
  return truncated + '...';
}

module.exports = {
  // Каталог
  catalog: function(data) {
    if (!data || !data.data) return [];
    
    return data.data.map(function(item) {
      var genres = item.genres ? 
        item.genres.slice(0, 3).map(function(g) { return g.name; }).join(', ') : 
        undefined;
      
      var rating = item.added_in_users_favorites ?
        Math.min(100, Math.round(Math.log(item.added_in_users_favorites + 1) / Math.log(10) * 20)) :
        undefined;
      
      return {
        url: config.PREFIX + ':moviepage:' + item.id,
        type: 'video',
        metadata: {
          title: item.name.main || 'Без названия',
          description: truncate(item.description || 'Описание отсутствует', 200),
          icon: config.API.COVER_URL + (item.poster.preview || item.poster.src),
          year: item.year,
          genre: genres,
          rating: rating,
          duration: item.average_duration_of_episode && item.episodes_total ?
            item.average_duration_of_episode * item.episodes_total * 60 : undefined
        }
      };
    });
  },
  
  // Поиск
  search: function(data) {
    if (!data || !data.data) return [];
    return data.data.map(function(item) {
      return {
        url: config.PREFIX + ':moviepage:' + item.id,
        type: 'video',
        metadata: {
          title: item.names && item.names[0] || 'Без названия',
          icon: item.poster ? config.API.COVER_URL + item.poster : undefined,
          //year: item.year
        }
      };
    });
  },
  
  // Эпизоды
  episodes: function(release) {
    if (!release.episodes) return [];
    
    return release.episodes.map(function(ep) {
      var num = ep.ordinal < 10 ? '0' + ep.ordinal : ep.ordinal;
      var title = release.name.english + ' S01E' + num;
      
      return {
        url: config.PREFIX + ':play:' + JSON.stringify({
          id: release.id,
          ordinal: ep.ordinal,
          title: title,
          hls_480: ep.hls_480,
          hls_720: ep.hls_720,
          hls_1080: ep.hls_1080,
          duration: ep.duration
        }),
        type: 'video',
        metadata: {
          title: title,
          description: 'Длительность: ' + formatDuration(ep.duration)
        }
      };
    });
  },
  
  // Торренты
  torrents: function(release) {
    if (!release.torrents) return [];
    
    return release.torrents.map(function(t) {
      var size = formatSize(t.size);
      return {
        url: 'torrent:browse:' + t.magnet,
        type: 'list',
        metadata: {
          title: t.label + ' ' + size + ' | S: ' + t.seeders + ' | L: ' + t.leechers,
          description: 'Размер: ' + size + ' | Сиды: ' + t.seeders + ' | Личи: ' + t.leechers
        }
      };
    });
  },
  
  // Франшиза
  franchise: function(data, currentId) {
    if (!data || !data[0] || !data[0].franchise_releases) return null;
    
    var franchise = data[0];
    var releases = franchise.franchise_releases
      .filter(function(fr) { return fr.release.id != currentId; })
      .map(function(fr) {
        var r = fr.release;
        var info = [
          r.year,
          r.type && r.type.description,
          r.season && r.season.description
        ].filter(Boolean).join(' | ');
        
        return {
          url: config.PREFIX + ':moviepage:' + r.id,
          type: 'list',
          metadata: {
            title: r.name.main + (r.name.english ? ' (' + r.name.english + ')' : ''),
            description: info,
            icon: config.API.COVER_URL + (r.poster.preview || r.poster.src)
          }
        };
      });
    
    if (releases.length === 0) return null;
    
    return {
      title: 'Франшиза: ' + franchise.name + 
             (franchise.name_english ? ' (' + franchise.name_english + ')' : ''),
      info: [
        franchise.first_year && franchise.last_year ? 
          franchise.first_year + '-' + franchise.last_year : null,
        franchise.total_releases ? franchise.total_releases + ' релизов' : null,
        franchise.total_episodes ? franchise.total_episodes + ' эпизодов' : null
      ].filter(Boolean).join(' | '),
      releases: releases
    };
  }
};