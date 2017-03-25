'use strict';

/* Services */

angular.module('xbmc.services', ['ngResource'])

    .factory('Helpers', [function () {
        return {
            xml_to_json: function (xml) {
                // Create the return object
                var obj = {};
                if (typeof xml == "string") {
                    var parser = new DOMParser();
                    xml = parser.parseFromString(xml, "text/xml");
                }

                if (xml.nodeType == 1) { // element
                    // do attributes
                    if (xml.attributes.length > 0) {
                        obj["@attributes"] = {};
                        for (var j = 0; j < xml.attributes.length; j++) {
                            var attribute = xml.attributes.item(j);
                            obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                        }
                    }
                } else if (xml.nodeType == 3) { // text
                    obj = xml.nodeValue;
                }

                // do children
                if (xml.hasChildNodes()) {
                    for (var i = 0; i < xml.childNodes.length; i++) {
                        var item = xml.childNodes.item(i);
                        var nodeName = item.nodeName;
                        if (typeof(obj[nodeName]) == "undefined") {
                            obj[nodeName] = this.xml_to_json(item);
                        } else {
                            if (typeof(obj[nodeName].push) == "undefined") {
                                var old = obj[nodeName];
                                obj[nodeName] = [];
                                obj[nodeName].push(old);
                            }
                            obj[nodeName].push(this.xml_to_json(item));
                        }
                    }
                }
                return obj;
            }
        }
    }])

    .factory('Debug', ['SETTINGS', function (SETTINGS) {
        function log() {
            if (SETTINGS.DEBUG) {
                console.log.apply(this, arguments);
            }
        }

        return {
            log: log
        };
    }])

    .factory('Globals', ['Video', 'Helpers', 'SETTINGS', "LocalData", function (Video, Helpers, SETTINGS, LocalData) {
        var Service = {
            left_menu_shown: true,
            current_page: "",
            commands: [
                {name: "Scan Video Library", func: Video.scan},
                {name: "Clean Video Library", func: Video.clean},
                {name: "Search new Episodes", func: searchNewEpisodes}
            ],
            movies_grouping: [
                {name: "No Grouping", value: "none", selected: true},
                {name: "Genre", value: "genre", selected: false},
                {name: "Year", value: "year", selected: false},
                {name: "Writer", value: "writer", selected: false}
            ],
            notifications: [],
            searchNewEpisodes: searchNewEpisodes,
            view_type: LocalData.get("view_type") || SETTINGS.DEFAULT_VIEW_TYPE
        };

        function searchNewEpisodes() {
            Video.getShows().then(function (/*Video.TvShows*/data) {
                if (data.tvshows) {
                    for (var i = 0; i < data.tvshows.length; i++) {
                        Video.getLastAired(data.tvshows[i].tvshowid, Helpers.xml_to_json(data.tvshows[i].episodeguide).episodeguide.url["#text"]).then(function (/*Video.EpisodeGuide*/episodeguide) {
                            var last_aired = episodeguide.last_aired;
                            var show = data.tvshows.filter(function (item) {
                                return item.tvshowid == last_aired.tvshowid
                            })[0];
                            if (show.latest_season < parseInt(last_aired.SeasonNumber) || (show.latest_season == parseInt(last_aired.SeasonNumber) && show.latest_episode < parseInt(last_aired.EpisodeNumber))) {
                                Service.notifications.push({
                                    obj: show, obj_name: "show",
                                    persistant: true,
                                    template: '<div>There is a new Episode for {{ show.title }} <div data-links data-item="show"></div></div>'
                                });
                            }
                        });
                    }
                }
            });
        }

        return Service;
    }])

    .factory('LocalData', function () {
        return {
            set: function (key, val) {
                val = JSON.stringify(val);
                localStorage.setItem(key, val);
            },
            get: function (key) {
                return JSON.parse(localStorage.getItem(key));
            },
            remove: function (key) {
                localStorage.removeItem(key);
            }
        }
    })

    .factory('XBMC_HTTP_API', ['XBMC_API', '$resource', '$q', 'SETTINGS', "Debug", function (XBMC_API, $resource, $q, SETTINGS, Debug) {
        var Service = {};
        var Resource = $resource('jsonrpc.php', {}, {
            post: {method: 'POST', params: {}, isArray: false}
        });

        function sendRequest(request) {
            request.id = XBMC_API.getCallbackId();
            var defer = $q.defer();
            var data = {url: "http://" + SETTINGS.HOST + ":" + SETTINGS.PORT + "/jsonrpc", request: request};
            Resource.post(data, function (data) {
                Debug.log("data received from http", data.result);
                defer.resolve(data.result);
            });
            return defer.promise;
        }

        Service.sendRequest = function (method, params) {
            var request = {"jsonrpc": "2.0", "method": method, "params": params};
            return sendRequest(request);
        };

        return Service;
    }])

    .factory('LOCAL_API', ['XBMC_API', '$resource', '$q', "Debug", "SETTINGS",  function (XBMC_API, $resource, $q, Debug, SETTINGS) {
        var Service = {};
        var Resource = $resource('http://' + SETTINGS.RPC_HOST + SETTINGS.RPC_PATH, {}, {
            post: {method: 'POST', params: {}, isArray: false, headers: {'Content-Type': 'application/json'}}
        });

        function sendRequest(request) {
            request.id = XBMC_API.getCallbackId();
            var defer = $q.defer();
            Resource.post(request, function (data) {
                Debug.log("data received from http", data);
                defer.resolve(data.result);
            });
            return defer.promise;
        }

        Service.sendRequest = function (method, params) {
            var request = {"jsonrpc": "2.0", "method": method, "params": params};
            return sendRequest(request);
        };

        return Service;
    }])

    .factory('XBMC_API', ['$q', '$rootScope', '$timeout', 'SETTINGS', "Debug", function ($q, $rootScope, $timeout, SETTINGS, Debug) {
        // We return this object to anything injecting our service
        var Service = {};
        // Keep all pending requests here until they get responses
        /*Services.Callbacks*/
        var callbacks = {};
        // Create a unique callback ID to map requests to responses
        var currentCallbackId = 0;
        // Create our websocket object with the address to the websocket
        var ws = new WebSocket("ws://" + SETTINGS.HOST + ":9090/jsonrpc");
        var socket_ready = false;

        var listeners = {general: []};

        ws.onopen = function () {
            Debug.log("Socket has been opened!");
            socket_ready = true;
        };

        ws.onmessage = function (message) {
            listener(JSON.parse(message.data));
        };

        function sendRequest(request, data_to_append) {
            var defer = $q.defer();
            var callbackId = getCallbackId();
            callbacks[callbackId] = {
                time: new Date(),
                cb: defer,
                data_to_append: data_to_append
            };
            request.id = callbackId;
            Debug.log('Sending request', request);
            sendToWs(request);
            return defer.promise;
        }

        function sendToWs(request) {
            if (!socket_ready) {
                $timeout(function () {
                    sendToWs(request);
                });
            }
            else {
                ws.send(JSON.stringify(request));
            }
        }

        function listener(data) {
            Debug.log("Received data from websocket: ", data);
            // If an object exists with callback_id in our callbacks object, resolve it
            if (callbacks.hasOwnProperty(data.id)) {
                if (callbacks[data.id].data_to_append) {
                    angular.extend(data.result, callbacks[data.id].data_to_append)
                }
                resolvePromise(data.id, data.result);
            }
            // this is a message, no id attached. broadcast to all listeners
            else {
                var method = data.method;
                var i = 0;
                if (listeners[method]) {
                    for (i = 0; i < listeners[method].length; i++) {
                        listeners[method][i](method, data.data);
                    }
                }
                if (listeners.general.length > 0) {
                    for (i = 0; i < listeners.general.length; i++) {
                        listeners.general[i](method, data.data);
                    }
                }
                $rootScope.$broadcast(method)
            }
        }

        function resolvePromise(id, data) {
            $timeout(function () {
                if (callbacks.hasOwnProperty(id)) {
                    callbacks[id].cb.resolve(data);
                    $rootScope.$apply();
                    delete callbacks[id];
                }
            })
        }

        function resolveDirectPromise(defer, data) {
            $timeout(function () {
                defer.resolve(data);
                $rootScope.$apply();
            })
        }

        // This creates a new callback ID for a request
        function getCallbackId() {
            currentCallbackId += 1;
            if (currentCallbackId > 10000) {
                currentCallbackId = 0;
            }
            return currentCallbackId;
        }

        function registerListener(method, func) {
            if (method) {
                if (!listeners[method])
                    listeners[method] = [];
                listeners[method].push(func);
            }
            else {
                listeners.general.push(func);
            }
        }

        function cleanListeners() {
            for(var listener in listeners){
                if (listeners.hasOwnProperty(listener) && listener != "general"){
                    delete listeners[listener];
                }
            }
        }

        // Define a "getter" for getting customer data
        Service.sendRequest = function (method, params, data_to_append) {
            var request = {"jsonrpc": "2.0", "method": method, "params": params};
            // Storing in a variable for clarity on what sendRequest returns
            return sendRequest(request, data_to_append);
        };

        Service.registerListener = function (method, func) {
            registerListener(method, func);
        };

        Service.getCallbackId = getCallbackId;

        Service.resolveDirectPromise = resolveDirectPromise;
        Service.cleanListeners = cleanListeners;

        return Service;
    }])

    .factory('Video', ['XBMC_API', 'LOCAL_API', 'Helpers', '$interval', "$q", function (XBMC_API, LOCAL_API, Helpers, $interval, $q) {
        var prefix = "VideoLibrary.";

        var Service = {};
        Service.prefix = prefix;

        Service.registerListener = function (method, func) {
            method = method ? prefix + method : null;
            XBMC_API.registerListener(method, func);
        };

        Service.getRecentlyAddedMovies = function () {
            return XBMC_API.sendRequest(prefix + "GetRecentlyAddedMovies", {
                properties: ["title", "thumbnail", "file", "art"],
                sort: {order: "descending", method: "dateadded"},
                limits: {start: 0, end: 5}
            });
        };

        Service.getRecentlyAddedEpisodes = function () {
            return XBMC_API.sendRequest(prefix + "GetRecentlyAddedEpisodes", {
                properties: ["title", "thumbnail", "season", "episode", "showtitle", "art"],
                sort: {order: "descending", method: "dateadded"},
                limits: {start: 0, end: 5}
            });
        };

        Service.getMovies = function () {
            return XBMC_API.sendRequest(prefix + "GetMovies", {
                properties: ["title", "thumbnail", "genre", "year", "writer", "playcount", "art", "file"],
                sort: {order: "descending", method: "dateadded"}
            });
        };

        Service.getLastAired = function (tvshowid, zip_url) {
            return LOCAL_API.sendRequest("get_last_next_aired", {tvshowid: tvshowid, zipfile_url: zip_url});
        };

        Service.getSubtitles = function(){
            return LOCAL_API.sendRequest("get_subtitles");
        };

        Service.getShows = function () {
            var self = this;
            var defer = $q.defer();
            XBMC_API.sendRequest(prefix + "GetTVShows", {
                properties: ["title", "thumbnail", "rating", "genre", "art", "episodeguide", "playcount", "episode", "season", "imdbnumber"],
                sort: {order: "ascending", method: "episode"}
            }).then(
                function (/*Video.TvShows*/data) {
                    var shows = data.tvshows.filter(function(itm) {
                        return itm.season > 0 && itm.episode > 0;
                    });
                    var resolved = 0;
                    var i = 0;
                    if (shows) {
                        var interval = $interval(function () {
                            var item = shows[i];
                            self.getEpisodes(item.tvshowid).then(
                                function (/*Video.Episodes*/episodes_data) {
                                    var show = shows.filter(function (item) {
                                        return item.tvshowid == episodes_data.episodes[episodes_data.episodes.length - 1].tvshowid
                                    })[0];
                                    show.latest_season = episodes_data.episodes[episodes_data.episodes.length - 1].season;
                                    show.latest_episode = episodes_data.episodes[episodes_data.episodes.length - 1].episode;
                                    resolved++;
                                    if (resolved >= shows.length - 1) {
                                        XBMC_API.resolveDirectPromise(defer, shows);
                                    }
                                });
                            i++;
                            if (i == shows.length) {
                                $interval.cancel(interval);
                            }
                        }, 10);
                    }
                    else {
                        XBMC_API.resolveDirectPromise(defer, data);
                    }
                });

            return defer.promise;
        };

        Service.getTVShowDetails = function(show_id){
            return XBMC_API.sendRequest(prefix + "GetTVShowDetails", {tvshowid: parseInt(show_id), properties: ["title"]})
        };

        Service.getSeasons = function(show_id){
            return XBMC_API.sendRequest(prefix + "GetSeasons", {tvshowid: parseInt(show_id), properties: ["season", "showtitle", "playcount", "art", "tvshowid", "episode"]})
        };

        Service.getEpisodes = function(show_id, season_id){
            if (season_id)
                return XBMC_API.sendRequest(prefix + "GetEpisodes", {tvshowid: parseInt(show_id), season: parseInt(season_id), properties: ["title", "plot", "playcount", "art", "tvshowid", "runtime", "season", "episode", "showtitle"], sort: {order: "ascending", "method": "episode"}});
            else
                return XBMC_API.sendRequest(prefix + "GetEpisodes", {tvshowid: parseInt(show_id), properties: ["title", "plot", "playcount", "art", "tvshowid", "runtime", "season", "episode", "showtitle"], sort: {order: "ascending", "method": "episode"}});
        };

        Service.getMovieDetails = function (movie_id) {
            return XBMC_API.sendRequest(prefix + "GetMovieDetails", {
                movieid: movie_id,
                properties: ["title", "art", "rating", "tagline", "plot", "cast", "imdbnumber", "trailer", "file"]
            });
        };

        Service.scan = function () {
            return XBMC_API.sendRequest(prefix + "Scan");
        };

        Service.clean = function () {
            return XBMC_API.sendRequest(prefix + "Clean");
        };

        return Service;
    }])

    .factory('Gui', ['XBMC_HTTP_API', function (XBMC_HTTP_API) {
        var prefix = "GUI.";

        var Service = {};
        Service.prefix = prefix;

        Service.fullscreen = function () {
            return XBMC_HTTP_API.sendRequest(prefix + "SetFullscreen", {fullscreen: "toggle"});
        };

        return Service;
    }])

    .factory('Files', ['XBMC_HTTP_API', 'LOCAL_API', function (XBMC_HTTP_API, LOCAL_API) {
        var prefix = "Files.";

        var Service = {};
        Service.prefix = prefix;

        Service.prepareDownload = function (path) {
            return XBMC_HTTP_API.sendRequest(prefix + "PrepareDownload", {path: path});
        };

        Service.deleteMovie = function (path) {
            return LOCAL_API.sendRequest("delete_movie", {path: path});
        };

        return Service;
    }])

    .factory('Misc', ['LOCAL_API', function (LOCAL_API) {

        var Service = {};

        Service.getLog = function () {
            return LOCAL_API.sendRequest("get_log");
        };

        return Service;
    }])

    .factory('Player', ['XBMC_API', function (XBMC_API) {
        var prefix = "Player.";

        var Service = {};
        Service.prefix = prefix;

        Service.getActivePlayers = function () {
            return XBMC_API.sendRequest(prefix + "GetActivePlayers");
        };

        Service.getItem = function () {
            var active_player = null;
            return Service.getActivePlayers().then(function (data) {
                active_player = data.filter(function (item) {
                    return item.type == "video"
                })[0];
                if (active_player)
                    return XBMC_API.sendRequest(prefix + "GetItem", {playerid: active_player.playerid, properties: ["title", "runtime", "showtitle"]});
                return data;
            }).then(function (data) {
                if (active_player)
                    return XBMC_API.sendRequest(prefix + "GetProperties", {playerid: active_player.playerid, properties: ["time", "totaltime", "percentage"]}, data);
                return data;
            });
        };

        Service.getProperties = function () {
            return Service.getActivePlayers().then(function (data) {
                var active_player = data.filter(function (item) {
                    return item.type == "video"
                })[0];
                if (active_player)
                    return XBMC_API.sendRequest(prefix + "GetProperties", {playerid: active_player.playerid, properties: ["time", "totaltime", "percentage"]});
                return data
            });
        };

        return Service;
    }]);
