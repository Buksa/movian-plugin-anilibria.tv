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

// parsit plugin.json
var plugin = JSON.parse(Plugin.manifest);
var PREFIX = plugin.id;
var LOGO = Plugin.path + plugin.icon;
var page = require('movian/page');
var http = require("movian/http");
var html = require("movian/html");

// Create the service (ie, icon on home screen)
require('movian/service').create(plugin.title, PREFIX + ':start', 'video', true, LOGO);

new page.Route(PREFIX + ":start", function (page) {
  page.loading = true;
  page.metadata.logo = LOGO;
  page.metadata.title = PREFIX;
  page.model.contents = 'grid';
  page.type = 'directory';
  page.entries = 0;
  var nextPage = 1;

  function loader() {

    post = {
      debug: true,
      caching: true, // Enables Movian's built-in HTTP cache
      cacheTime: 6000,
      headers: {
        "Accept": "*/*",
        "Referer": "https://www.anilibria.tv/pages/catalog.php",
        "Origin": "https://www.anilibria.tv",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.81 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      postdata: {
        page: nextPage,
        search: '%7B%22year%22%3A%22%22%2C%22genre%22%3A%22%22%2C%22season%22%3A%22%22%7D',
        xpage: 'catalog',
        sort: 1,
        finish: 1
      }
    };
    var resp = http.request('https://www.anilibria.tv/public/catalog.php', post).toString();
    table = JSON.parse(resp).table;

    dom = html.parse(table).root;
    list = ScrapeList(dom);
    populateItemsFromList(page, list);
    nextPage++;
    page.haveMore(list.endOfData !== undefined && !list.endOfData);
  }

  loader();

  page.loading = false;
  page.asyncPaginator = loader;
});

// movie page
new page.Route(PREFIX + ':moviepage:(.*)', function (page, data) {
  data = JSON.parse(data);
  page.type = 'directory';
  page.metadata.title = PREFIX + '|' + data.title;
  page.metadata.icon = LOGO;

  resp = http.request(data.url).toString();
  dom = html.parse(resp).root;
  title = dom.getElementByClassName('release-title')[0].textContent.split('/');
  title_ru = title[0].trim();
  title_en = (title.length == 2)?title[1].trim() : title[0].trim();

  //https://www.anilibria.tv/public/iframe.php?id=8447
  regexp = /http[\s\S]{0,30}public\/iframe\.php\?id=\d+/;
  if (libra = (regexp.exec(resp) || [])[0]) {
    page.appendItem('', 'separator', {
      title: 'anilibra:'
    });
    data.url = libra;
    libra = http.request(data.url).toString();
    eval('file=' + /file:(\[.*\])\,/gm.exec(resp)[1]);
    for (i in file) {
      console.log(undefined == title_en);
      data.links = file[i];
      page.appendItem(PREFIX + ':play:' + JSON.stringify(data), 'video', {
        title: file[i].title,
        icon: data.icon,
      }).bindVideoMetadata({
        title: (undefined == title_en ? title_ru : title_en) + ' S01' + 'E' + fix_0(file[i].title.match(/\d+/)[0])
      });
    }
  };

  regexp = /http[\s\S]{0,60}video\/[a-f0-9]{16}\/iframe|http[\s\S]{0,60}[a-f0-9]{32}\/iframe|http[\s\S]{0,60}serial\/[a-f0-9]{32}\/iframe/;
  if (moon = (regexp.exec(resp) || [])[0]) {
    page.appendItem('', 'separator', {
      title: 'moonwalk:'
    });
    data.url = moon;
    page.appendItem('HDRezka:moviepage:' + JSON.stringify(data), 'directory', {
      title: data.title,
      icon: data.icon,
    });
  };


  torrent = dom.getElementByClassName('download-torrent');
  if (torrent.length) {
    page.appendItem('', 'separator', {
      title: 'torrent:'
    });

    var regex = /(.*?)(B)  (\d+)\W+(\d+)\W+(\d+)(Добавлен \d+\.\d+\.\d+).*/gm;
    torrent[0].getElementByTagName('tr').forEach(function (item) {
      url = 'https://www.anilibria.tv' + item.getElementByTagName('a')[0].attributes.getNamedItem('href').value;
      page.appendItem('torrent:browse:' + url, 'directory', {
        title: item.textContent.replace(regex, '$6 $1$2 S:$3 P:$4'),
        icon: data.icon,
      });
    });

  };

});

page.Searcher(PREFIX + " - Result", LOGO, function (page, query) {
  page.metadata.icon = LOGO;

  page.entries = 0;
  //new page.Route(PREFIX + ":search:(.*)", function (page, query) {
  page.metadata.icon = LOGO;
  page.metadata.logo = LOGO;
  page.metadata.title = PREFIX + " - Search results for: " + query;
  page.type = 'directory';
  page.loading = true;
  page.entries = 0;

  post = {
    debug: true,
    caching: true, // Enables Movian's built-in HTTP cache
    cacheTime: 6000,
    headers: {
      "Accept": "*/*",
      "Referer": "https://www.anilibria.tv",
      "Origin": "https://www.anilibria.tv",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.81 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    postdata: {
      search: query,
      small: 1
    }
  };
  var resp = http.request('https://www.anilibria.tv/public/search.php', post).toString();

  content = JSON.parse(resp).mes;
  content = html.parse(content).root;
  if ((elements = content.getElementByTagName('a'))) {
    for (i = 0; i < elements.length; i++) {
      element = elements[i];
      data = {
        url: 'https://www.anilibria.tv' + element.attributes.getNamedItem('href').value,
        title: element.textContent,
      }
      page.appendItem(PREFIX + ':moviepage:' + JSON.stringify(data), 'video', {
        title: data.title,
      });
      page.entries++;
    }
  }
  page.loading = false;
});

new page.Route(PREFIX + ":play:(.*)", function (page, data) {
  data = JSON.parse(data);
  page.loading = true;
  page.type = 'directory';
  page.metadata.logo = LOGO;
  page.metadata.title = data.title;

  page.appendItem(data.links.download, 'video', {
    title: "[MP4] " + data.title + ' ' + data.links.title,
    icon: data.icon
  });

  file = data.links.file.split(',')
  for (i in file) {
    page.appendItem('hls:http:' + file[i].replace(/(\[.*\])(.*)/gm, '$2'), 'video', {
      title: '[HLS]-' + file[i].replace(/(\[.*\])(.*)/gm, '$1') + ' ' + data.title + ' ' + data.links.title,
      icon: data.icon,
    });
  }

  page.loading = false;
});

function ScrapeList(dom) {
  var returnValue = [];
  //document.getElementById('dle-content');
  content = dom;
  if ((elements = content.getElementByTagName('a'))) {
    for (i = 0; i < elements.length; i++) {
      element = elements[i];
      console.log(element.getElementByTagName('img')[0].attributes.getNamedItem('src').value)
      returnValue.push({
        //content.getElementsByClassName('movie-item short-item')[0].getElementsByTagName('a')[0].href
        url: 'https://www.anilibria.tv' + element.attributes.getNamedItem('href').value,
        icon: element.getElementByTagName('img')[0].attributes.getNamedItem('src').value,
        title: element.getElementByClassName('anime_name')[0].textContent,
        tag: element.getElementByClassName('anime_number')[0].textContent,
        description: element.getElementByClassName('anime_description')[0].textContent,
      })
    }
  }
  //todo
  returnValue.endOfData = 0 //!dom.getElementByClassName("pnext")[0].getElementByTagName("a").length;
  return returnValue;
};

function populateItemsFromList(page, list) {
  page.entries = 0;
  for (i = 0; i < list.length; i++) {
    page.appendItem(PREFIX + ':moviepage:' + JSON.stringify(list[i]), 'video', {
      title: list[i].title,
      description: list[i].description,
      icon: list[i].icon,
    });
    page.entries++;
  }
};

function fix_0(num) {
  return ('0' + (num || '')).slice(-3);
};