/**
 * this is the default settings
 * to overwrite a setting, create a file called settings_local.js and overwrite the "SETTINGS" factory:
 * angular.module('xbmc.settings')
    .factory('SETTINGS', ['BASE_SETTINGS', function(BASE_SETTINGS){
        BASE_SETTINGS.HOST = "www.example.com";
        return BASE_SETTINGS;
    }]);
 */
angular.module('xbmc.settings', [])
    .factory('BASE_SETTINGS', [function(){
        return {
            HOST: "localhost",
            link_patterns: [
                {name: "Torrentz", url: "http://torrentz.eu/search?f={{ item.title }} s{{ item.latest_season | leading_zero }}e{{ item.latest_episode+1 | leading_zero }}"},
                {name: "TorrentLeach", url: "http://torrentleech.org/torrents/browse/index/query/{{ item.title }} s{{ item.latest_season | leading_zero }}e{{ item.latest_episode+1 | leading_zero }}"},
                {name: "Subtitle", url: "http://www.subtitle.co.il/browse.php?q={{ item.title }}"},
                {name: "Subscenter", url: "http://subscenter.cinemast.com/he/subtitle/series/{{ item.title | dash_str }}"},
            ],
            DEFAULT_VIEW_TYPE: "grid"
        }
    }])
    .factory('SETTINGS', ['BASE_SETTINGS', function(BASE_SETTINGS){
        return BASE_SETTINGS;
    }]);