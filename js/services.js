'use strict';

/* Services */

angular.module('xbmc.services', ['ngResource'])

    .factory('Helpers', [function () {
        return {
            find_in_array: function (arr, property, val) {
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i][property] == val)
                        return arr[i];
                }
                return false;
            },

            xml_to_json: function (xml) {
                // Create the return object
                var obj = {};
                if(typeof xml == "string"){
                    var parser = new DOMParser();
                    xml = parser.parseFromString(xml,"text/xml");
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

    .factory('Globals', ['Video', 'Helpers', 'SETTINGS', function (Video, Helpers, SETTINGS) {
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
            view_type: SETTINGS.DEFAULT_VIEW_TYPE
        };

        function searchNewEpisodes(){
            Video.getShows().then(function(/*Video.TvShows*/data){
                if (data.tvshows) {
                    for (var i = 0; i < data.tvshows.length; i++) {
                        Video.getLastAired(data.tvshows[i].tvshowid, Helpers.xml_to_json(data.tvshows[i].episodeguide).episodeguide.url["#text"]).then(function(/*Video.EpisodeGuide*/episodeguide){
                            var show = Helpers.find_in_array(data.tvshows, "tvshowid", episodeguide.tvshowid);
                            if(show.latest_season < parseInt(episodeguide.SeasonNumber) || (show.latest_season == parseInt(episodeguide.SeasonNumber) && show.latest_episode < parseInt(episodeguide.EpisodeNumber))){
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

    .factory('XBMC_HTTP_API', ['XBMC_API', '$resource', '$q', 'SETTINGS', function (XBMC_API, $resource, $q, SETTINGS) {
        var Service = {};
        var Resource = $resource('jsonrpc.php', {}, {
            post: {method: 'POST', params: {}, isArray: false}
        });

        function sendRequest(request) {
            request.id = XBMC_API.getCallbackId();
            var defer = $q.defer();
            var data = {url: "http://" + SETTINGS.HOST + ":8080/jsonrpc", request: request};
            Resource.post(data, function (data) {
//                console.log("data received from http", data.result);
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

    .factory('LOCAL_API', ['XBMC_API', '$resource', '$q', function (XBMC_API, $resource, $q) {
        var Service = {};
        var Resource = $resource('jsonrpc.php', {}, {
            post: {method: 'POST', params: {}, isArray: false, headers: {'Content-Type': 'application/json'}}
        });

        function sendRequest(request) {
            request.id = XBMC_API.getCallbackId();
            var defer = $q.defer();
            Resource.post(request, function (data) {
//                console.log("data received from http", data);
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

    .factory('XBMC_API', ['$q', '$rootScope', '$timeout', 'SETTINGS', function ($q, $rootScope, $timeout, SETTINGS) {
        // We return this object to anything injecting our service
        var Service = {};
        // Keep all pending requests here until they get responses
        /*Services.Callbacks*/var callbacks = {};
        // Create a unique callback ID to map requests to responses
        var currentCallbackId = 0;
        // Create our websocket object with the address to the websocket
        var ws = new WebSocket("ws://" + SETTINGS.HOST + ":9090/jsonrpc");
        var socket_ready = false;

        var listeners = {general: []};

        ws.onopen = function () {
//            console.log("Socket has been opened!");
            socket_ready = true;
        };

        ws.onmessage = function (message) {
            listener(JSON.parse(message.data));
        };

        function sendRequest(request, notify) {
            var defer = $q.defer();
            var callbackId = getCallbackId();
            callbacks[callbackId] = {
                time: new Date(),
                cb: defer,
                notify: notify
            };
            request.id = callbackId;
            console.log('Sending request', request);
            sendToWs(request);
            if (notify)
                return {promise: defer.promise, id: callbackId};
            else
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
            console.log("Received data from websocket: ", data);
            // If an object exists with callback_id in our callbacks object, resolve it
            if (callbacks.hasOwnProperty(data.id)) {
                if (callbacks[data.id].notify) {
                    callbacks[data.id].cb.notify(data.result);
                }
                else {
                    resolve_promise(data.id, data.result);
                }
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

        function resolve_promise(id, data) {
            $timeout(function () {
                if (callbacks.hasOwnProperty(id)) {
                    callbacks[id].cb.resolve(data);
                    $rootScope.$apply();
                    delete callbacks[id];
                }
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

        // Define a "getter" for getting customer data
        Service.sendRequest = function (method, params, notify) {
            var request = {"jsonrpc": "2.0", "method": method, "params": params};
            // Storing in a variable for clarity on what sendRequest returns
            return sendRequest(request, notify);
        };

        Service.registerListener = function (method, func) {
            registerListener(method, func);
        };

        Service.getCallbackId = getCallbackId;

        Service.resolve_promise = resolve_promise;

        return Service;
    }])

    .factory('Video', ['XBMC_API', 'LOCAL_API', 'Helpers', '$interval', function (XBMC_API, LOCAL_API, Helpers, $interval) {
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
                properties: ["title", "thumbnail", "genre", "year", "writer", "playcount"],
                sort: {order: "descending", method: "dateadded"}
            });
        };

        Service.getLastAired = function (tvshowid, zip_url) {
            return LOCAL_API.sendRequest("get_last_aired", {tvshoid: tvshowid, zipfile_url: zip_url});
        };

        Service.getShows = function () {
            var promise = XBMC_API.sendRequest(prefix + "GetTVShows", {
                properties: ["title", "thumbnail", "genre", "art", "episodeguide", "playcount"],
                sort: {order: "descending", method: "dateadded"}
            }, true);
            return promise.promise.then(
                null,
                null,
                function (/*Video.TvShows*/data) {
                    var resolved = 0;
                    var i = 0;
                    if (data.tvshows) {
                        var interval = $interval(function () {
                            var item = data.tvshows[i];
                            XBMC_API.sendRequest(prefix + "GetSeasons", {tvshowid: item.tvshowid, properties: ["tvshowid", "season", "episode"]}).then(
                                function (/*Video.Seasons*/season_data) {
                                    var show = Helpers.find_in_array(data.tvshows, "tvshowid", season_data.seasons[season_data.seasons.length - 1].tvshowid);
                                    show.latest_season = season_data.seasons[season_data.seasons.length - 1].season;
                                    show.latest_episode = season_data.seasons[season_data.seasons.length - 1].episode;
                                    resolved++;
                                    if (resolved >= data.tvshows.length - 1) {
                                        XBMC_API.resolve_promise(promise.id, data);
                                    }
                                });
                            i++;
                            if (i == data.tvshows.length) {
                                $interval.cancel(interval);
                            }
                        }, 1);
                    }
                    else {
                        XBMC_API.resolve_promise(promise.id, data);
                    }
                });
        };

        Service.getMovieDetails = function (movie_id) {
            return XBMC_API.sendRequest(prefix + "GetMovieDetails", {
                movieid: movie_id,
                properties: ["title", "art", "rating", "tagline", "plot", "cast", "imdbnumber", "trailer", "file"]
            });
        };

        Service.searchMovies = function (val) {
            return XBMC_API.sendRequest(prefix + "GetMovies", {
                filter: {field: "title", operator: "contains", value: val},
                properties: ["title", "thumbnail", "rating", "art"],
                sort: {order: "ascending", method: "label"}
            });
        };

        Service.searchTVShows = function (val) {
            var promise = XBMC_API.sendRequest(prefix + "GetTVShows", {
                filter: {field: "title", operator: "contains", value: val},
                properties: ["title", "thumbnail", "rating", "episodeguide", "episode", "season", "art"],
                sort: {order: "ascending", method: "label"}}, true);
            return promise.promise.then(
                null,
                null,
                function (data) {
                    var resolved = 0;
                    var i = 0;
                    if (data.tvshows) {
                        var interval = $interval(function () {
                            var item = data.tvshows[i];
                            XBMC_API.sendRequest(prefix + "GetSeasons", {
                                tvshowid: item.tvshowid,
                                properties: ["tvshowid", "season", "episode"]
                            }).then(
                                function (season_data) {
                                    var show = Helpers.find_in_array(data.tvshows, "tvshowid", season_data.seasons[season_data.seasons.length - 1].tvshowid);
                                    show.latest_season = season_data.seasons[season_data.seasons.length - 1].season;
                                    show.latest_episode = season_data.seasons[season_data.seasons.length - 1].episode;
                                    resolved++;
                                    if (resolved >= data.tvshows.length - 1) {
                                        XBMC_API.resolve_promise(promise.id, data);
                                    }
                                });
                            i++;
                            if (i == data.tvshows.length) {
                                $interval.cancel(interval);
                            }
                        }, 1);
                    }
                    else {
                        XBMC_API.resolve_promise(promise.id, data);
                    }
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

    .factory('Files', ['XBMC_HTTP_API', function (XBMC_HTTP_API) {
        var prefix = "Files.";

        var Service = {};
        Service.prefix = prefix;

        Service.prepareDownload = function (path) {
            return XBMC_HTTP_API.sendRequest(prefix + "PrepareDownload", {path: path});
        };

        return Service;
    }]);
