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
            HOST: "127.0.0.1",
            PORT: "8080",
            RPC_HOST: "127.0.0.1:5000/",
            RPC_PATH: "",
            LINK_PATTERNS: [
                {name: "Kickass", url: "http://kickass.to/usearch/{{ item.title | clean_name }} s{{ item.latest_season | leading_zero }}e{{ item.latest_episode+1 | leading_zero }}/"},
                {name: "Torrentz", url: "http://torrentz.eu/search?f={{ item.title | clean_name }} s{{ item.latest_season | leading_zero }}e{{ item.latest_episode+1 | leading_zero }}"},
                {name: "TorrentLeach", url: "http://torrentleech.org/torrents/browse/index/query/{{ item.title | clean_name }} s{{ item.latest_season | leading_zero }}e{{ item.latest_episode+1 | leading_zero }}"},
                {name: "Subtitle", url: "http://www.subtitle.co.il/browse.php?q={{ item.title | clean_name }}"},
                {name: "Subscenter", url: "http://subscenter.cinemast.com/he/subtitle/series/{{ item.title | clean_name | space_to_dash}}/{{ item.latest_season }}/{{ item.latest_episode+1 }}"}
            ],
            DEFAULT_VIEW_TYPE: "grid",
            SEARCH_NEW_EPISODES_ON_LOAD: false,
            LOG_INTERVAL: 10000,
            DEBUG: false
        }
    }])
    .factory('SETTINGS', ['BASE_SETTINGS', function(BASE_SETTINGS){
        return BASE_SETTINGS;
    }]);