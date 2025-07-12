/**
 *  anilibra.tv plugin for Movian
 *
 *  Copyright (C) 2019 Buksa
 *
 *  This program is free software": "you can redistribute it and/or modif,
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var plugin = JSON.parse(Plugin.manifest);
var PREFIX = plugin.id;
var LOGO = Plugin.path + plugin.icon;
var io = require('native/io');
var service = require('movian/service');
var settings = require('movian/settings');
var page = require("movian/page");
var http = require("movian/http");
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
console.error(plugin.id + ' ' + plugin.version);

// Create the service (ie, icon on home screen)
service.create(plugin.title, PREFIX + ':start', 'video', true, LOGO);
settings.globalSettings(plugin.id, plugin.title, LOGO, plugin.synopsis);
settings.createInfo('info', LOGO, 'Plugin developed by ' + plugin.author + '. \n' + plugin.id + ' ' + plugin.version);
settings.createDivider('Settings:\n');
settings.createString('domain', '\u0414\u043e\u043c\u0435\u043d', 'anilibria.tv', function(v) {
  service.domain = v;
});
// settings.createBool('debug', 'Debug', false, function(v) {
//   service.debug = v;
// });
// settings.createBool('Show_META', 'Show more info from thetvdb', true, function(v) {
//   service.meta = v;
// });

var BASE_URL = service.domain;
var API_URL = 'https://api.'+ service.domain;
var COVER_URL = 'https://static-libria.weekstorm.one';
var DOWNLOAD_URL = 'https://www.'+BASE_URL;

io.httpInspectorCreate('.*libria.*', function(ctrl) {
  ctrl.setHeader('Accept-Encoding','gzip');
  ctrl.setHeader('User-Agent', UA);
  // ctrl.setHeader('mobileApp','true');
  // ctrl.setHeader('App-Id','ru.radiationx.anilibria.app');
  // ctrl.setHeader('App-Ver-Code','68');
  // ctrl.setHeader('App-Ver-Name','2.11.1')
//  ctrl.setHeader('Referer', ctrl.url);
});

new page.Route(PREFIX + ":start2", function (page) {
  page.loading = true;
  page.metadata.logo = LOGO;
  page.metadata.icon = LOGO;
  page.metadata.title = PREFIX;
  page.model.contents = "grid";
  page.type = "directory";
  page.entries = 0;
  var nextPage = 1;

  function loader() {
    var url = API_URL + '/v3/title/updates?filter=posters,description,code,names,id&page=' + nextPage + '&items_per_page=40';
    var resp = http.request(url, { caching: true, cacheTime: 6000 }).toString();
    var json = JSON.parse(resp);
    var list = json.list;
    page.entries = 0;
    list.forEach(function(item) {
      page.appendItem(PREFIX + ":moviepage:" + JSON.stringify(item.code),"video", { 
        title: item.names.ru,
        description: item.description,
        icon: COVER_URL + item.posters.small.url,
      });
      page.entries++;
    });
    nextPage++;
    page.haveMore(nextPage <= json.pagination.pages);
  }

  loader();

  page.loading = false;
  page.asyncPaginator = loader;
});

new page.Route(PREFIX + ":start", function (page) {
  page.loading = true;
  page.metadata.logo = LOGO;
  page.metadata.icon = LOGO;
  page.metadata.title = PREFIX;
  page.model.contents = "grid";
  page.type = "directory";
  
  var params = { filter: 'posters,description,code,names,id', items_per_page: '40', page: 1}
  //params.items_per_page = 40;
  //var offset = 0; 
  function loader() {
    
    asyncRequest('title/updates', params, page, function(result) {
      if (result.pagination.pages == params.page){
        page.haveMore(false);
        return;
      }

      // if(result.list && result.pagination.total_items === 0) {
      //   showNoContent(page);
      //   return;
      // }
      var list = result.list;
      page.entries = 0;
      //for (var i = 0; i < 20; i++) {
      for (var i = 0; i < list.length; i++) {
       
        //var item = list[offset + i];
        var item = list[i]; 
        //console.log(JSON.stringify(item, null, 4));
        page.appendItem(PREFIX + ":moviepage:" + JSON.stringify(item.code),"video", { 
          title: item.names.ru,
          description: item.description,
          icon: COVER_URL + item.posters.small.url,
        });
        page.entries++;
      }
      params.page++
   
      print(params.page <= result.pagination.pages);
      page.haveMore(params.page <= result.pagination.pages);
      //offset += 20;
      //if(offset == 40) offset = 0;
      //page.haveMore(true);

    });
  }

  loader();
  page.asyncPaginator = loader;
  page.loading = false;
});



new page.Route(PREFIX + ":moviepage:(.*)", function (page, code) {
  var code = JSON.parse(code);
  //https://github.com/anilibria/docs/blob/master/api_v3.md#-title
  ///v3/title?code=kizumonogatari-iii-reiketsu-hen
  var url = API_URL + '/v3/title?code='+code;
  opts = {
    debug: true,
    caching: true, // Enables Movian's built-in HTTP cache
    cacheTime: 6000,
    // headers: {
    //   "Accept": "*/*",
    //   // "Referer": "https://www.anilibria.tv/pages/catalog.php",
    //   // "Origin": "https://www.anilibria.tv",
    //   // "X-Requested-With": "XMLHttpRequest",
    //   // "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.81 Safari/537.36",
    //   // "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    // },
  }
  var resp = http.request(url,opts).toString();
  var json = JSON.parse(resp);
  page.type = "directory";
  page.metadata.title = json.names.en;
  page.metadata.icon = LOGO;
  page.metadata.logo = COVER_URL+json.posters.small.url;
  
  page.appendItem('', 'separator', {title: 'Anilibria:',});
  
  for (i in json.player.list) {
    var item = json.player.list[i];
    item.host = json.player.host; 
   
    page.appendItem(PREFIX + ':play:' + JSON.stringify(item), 'video', {
      title: 'Episode '+ item.episode,
      icon: COVER_URL+json.posters.small.url,
    }).bindVideoMetadata({title: json.names.en + ' S01' + 'E' + fix_0(item.episode),});
  }

  //franchises
  if (json.franchises.length) {
   page.appendItem("", "separator", {
    title: "franchises:",
  });

  for (i in json.franchises[0].releases) {
    var item = json.franchises[0].releases[i];
     
    page.appendItem(PREFIX + ":moviepage:" + JSON.stringify(item.code),"video", { 
      title: item.names.ru,
      description: item.description,
      icon: COVER_URL + json.posters.small.url,
    });
 }

  }

  //if (torrent.length) {
    page.appendItem("", "separator", {
      title: "torrent/magnet:",
    });

    for (i in json.torrents.list) {
      var item = json.torrents.list[i];
       
      //https://www.anilibria.tv/public/torrent/download.php?id=28107
      page.appendItem("torrent:browse:" + DOWNLOAD_URL +item.url, "directory", {
        title: 'T: '+'['+item.quality.string+'] ' + item.size_string+' S:'+item.seeders+' L:'+item.leechers,
      });
      page.appendItem("torrent:browse:" + item.magnet, "directory", {
        title: 'M: '+'['+item.quality.string+'] ' + item.size_string+' S:'+item.seeders+' L:'+item.leechers,
      });
   }
});

page.Searcher(PREFIX + " - Result", LOGO, function (page, query) {
  page.metadata.icon = LOGO;

  page.entries = 0;
  //new page.Route(PREFIX + ":search:(.*)", function (page, query) {
  page.metadata.icon = LOGO;
  page.metadata.logo = LOGO;
  page.metadata.title = PREFIX + " - Search results for: " + query;
  page.type = "directory";
  page.loading = true;
  page.entries = 0;

  post = {
    debug: true,
    caching: true, // Enables Movian's built-in HTTP cache
    cacheTime: 6000,
    headers: {
      "Accept-Encoding":"gzip",
      "App-Id":"ru.radiationx.anilibria.app",
      "App-Ver-Code":68,
      "App-Ver-Name":"2.11.1",
      "Host":"www.anilibria.tv",
      "mobileApp":true,
      "User-Agent":"mobileApp Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.170 Safari/537.36 OPR/53.0.2907.68",
      "Referer": "https://www.anilibria.tv",
      "Origin": "https://www.anilibria.tv",
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    postdata: {
      query: 'search',
      search: query,
      filter: 'id,code,names,poster',
    },
  };
  var resp = http.request("https://www."+BASE_URL+"/public/api/index.php", post).toString();
  print(resp);

  json = JSON.parse(resp);
  for(i in json.data){
    var data = json.data[i];
      page.appendItem(PREFIX + ":moviepage:" + JSON.stringify(data.code), "video", {
        title: data.names[0],
        icon: COVER_URL+data.poster 

      });
      page.entries++;
    }
  
  page.loading = false;
});

new page.Route(PREFIX + ":play:(.*)", function (page, data) {
  data = JSON.parse(data);
  page.loading = true;
  page.type = "directory";
  page.metadata.logo = LOGO;
  page.metadata.title = data.title;

  file = data.hls;
  for (i in file) {
    page.appendItem("hls:http://" + data.host+file[i],"video",
    {
      title:"[HLS]-" + i.replace('fhd','1080').replace('hd','720').replace('sd','480') +'-'+(data.name !== null? data.name : 'Episode '+ fix_0(data.episode)), 
      icon: data.icon,
    });
  }

  page.loading = false;
});

function fix_0(n) { return (n < 10 ? '0' : '') + n; }


//    var resp = http.request('https://api.'+BASE_URL+'/v3/title/updates?filter=posters,description,code,names,id&page=' + nextPage + '&items_per_page=40',opts).toString();


// title/updates
function asyncRequest(endpoint, params, page, cb) {
  var URL = API_URL +'/v3/' + endpoint;
  var opts = {
    args: [params || {}],
    noFail: true,
    compression: true,
    caching: true,
    cacheTime: 6000,
    debug: true
  };
  http.request(URL, opts, function(err, result) {
    if(err) {
      page && page.error(err);
    } else {
      try {
        var r = JSON.parse(result);
        if(r.error) {
          console.error("Request failed: " + URL);
          console.error(r.error.errors[0].message);
          page && page.error(r.error.errors[0].reason);
          throw(new Error("Request failed: " + r.error.errors[0].reason));
        }
        cb(r);
      } catch(e) {
        page && page.error(e);
        throw(e);
      }
    }
    page && (page.loading = false);
  });
}
