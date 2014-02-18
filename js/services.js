'use strict';

/* Services */

angular.module('xbmc.services', [])
    .factory('Helpers', [function(){
        return {
            find_in_array: function(arr, property, val){
                for(var i = 0; i < arr.length; i++){
                    if(arr[i][property] == val)
                        return arr[i];
                }
                return false;
            }
        }
    }])
    .factory('General', [function(){
        return {
            left_menu_shown: true,
            current_page: ""
        }
    }])
    .factory('XBMC_API', ['$q', '$rootScope', '$timeout', 'HOST', function ($q, $rootScope, $timeout,  HOST) {
        // We return this object to anything injecting our service
        var Service = {};
        // Keep all pending requests here until they get responses
        var callbacks = {};
        // Create a unique callback ID to map requests to responses
        var currentCallbackId = 0;
        // Create our websocket object with the address to the websocket
        var ws = new WebSocket("ws://"+HOST+":9090/jsonrpc");
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
            if(!socket_ready){
                return $timeout(function(){
                    return sendRequest(request, notify);
                });
                return false;
            }
            var defer = $q.defer();
            var callbackId = getCallbackId();
            callbacks[callbackId] = {
                time: new Date(),
                cb: defer,
                notify: notify
            };
            request.id = callbackId;
//            console.log('Sending request ' + callbackId);
            ws.send(JSON.stringify(request));
            if(notify)
                return {promise: defer.promise, id: callbackId};
            else
                return defer.promise;
        }

        function listener(data) {
//            console.log("Received data from websocket: ", data);
            // If an object exists with callback_id in our callbacks object, resolve it
            if (callbacks.hasOwnProperty(data.id)) {
                if(callbacks[data.id].notify){
                    callbacks[data.id].cb.notify(data.result);
                }
                else{
                    resolve_promise(data.id, data.result);
                }
            }
            // this is a message, no id attached. broadcast to all listeners
            else{
                var method = data.method;
                var i = 0;
                if(listeners[method]){
                    for(i = 0; i < listeners[method].length; i++){
                        listeners[method][i](method, data.data);
                    }
                }
                if(listeners.general.length > 0){
                    for(i = 0; i < listeners.general.length; i++){
                        listeners.general[i](method, data.data);
                    }
                }
                $rootScope.$broadcast(method)
            }
        }

        function resolve_promise(id, data){
            $timeout(function(){
                if(callbacks.hasOwnProperty(id)){
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

        function registerListener(method, func){
            if (method){
                if(!listeners[method])
                    listeners[method] = [];
                listeners[method].push(func);
            }
            else{
                listeners.general.push(func);
            }
        }

        // Define a "getter" for getting customer data
        Service.sendRequest = function (method, params, notify) {
            var request = {"jsonrpc": "2.0", "method": method, "params": params};
            // Storing in a variable for clarity on what sendRequest returns
            return sendRequest(request, notify);
        };

        Service.registerListener = function(method, func){
            registerListener(method, func);
        };

        Service.resolve_promise = resolve_promise;

        return Service;
    }])
    .factory('VIDEO', ['XBMC_API', 'Helpers', '$interval', function(XBMC_API, Helpers, $interval){
        var prefix = "VideoLibrary.";

        var Service = {};
        Service.prefix = prefix;

        Service.registerListener = function(method, func){
            method = method? prefix + method: null;
            XBMC_API.registerListener(method, func);
        };

        Service.getRecentlyAddedMovies = function(){
            return XBMC_API.sendRequest(prefix + "GetRecentlyAddedMovies", {properties: ["title", "thumbnail"], sort: {order: "descending", method: "dateadded"}, limits: {start: 0, end: 5}});
        };

        Service.getMovies = function(){
            return XBMC_API.sendRequest(prefix + "GetMovies", {properties: ["title", "thumbnail"], sort: {order: "descending", method: "dateadded"}});
        };

        Service.getRecentlyAddedEpisodes = function(){
            return XBMC_API.sendRequest(prefix + "GetRecentlyAddedEpisodes", {properties: ["title", "thumbnail", "season", "episode", "showtitle"], sort: {order: "descending", method: "dateadded"}, limits: {start: 0, end: 5}});
        };

        Service.getMovieDetails = function(movie_id){
            return XBMC_API.sendRequest(prefix + "GetMovieDetails", {movieid: movie_id, properties: ["title", "art", "rating", "tagline", "plot", "cast", "imdbnumber", "trailer"]});
        };

        Service.searchMovies = function(val){
            return XBMC_API.sendRequest(prefix + "GetMovies", {filter: {field: "title", operator: "contains", value: val}, properties: ["title", "thumbnail", "rating"], sort: {order: "ascending", method: "label"}});
        };

        Service.searchTVShows = function(val){
            var promise = XBMC_API.sendRequest(prefix + "GetTVShows", {filter: {field: "title", operator: "contains", value: val}, properties: ["title", "thumbnail", "rating", "episodeguide", "episode", "season"], sort: {order: "ascending", method: "label"}}, true);
            return promise.promise.then(
                null,
                null,
                function(data){
                    var resolved = 0;
                    var i = 0;
                    if(data.tvshows){
                        var interval = $interval(function(){
                            var item = data.tvshows[i];
                            XBMC_API.sendRequest(prefix + "GetSeasons", {tvshowid: item.tvshowid, properties: ["tvshowid", "season", "episode"]}).then(
                                function(season_data){
                                    var show = Helpers.find_in_array(data.tvshows, "tvshowid", season_data.seasons[season_data.seasons.length-1].tvshowid);
                                    show.latest_season = season_data.seasons[season_data.seasons.length-1].season;
                                    show.latest_episode = season_data.seasons[season_data.seasons.length-1].episode;
                                    resolved++;
                                    if(resolved >= data.tvshows.length-1){
                                        XBMC_API.resolve_promise(promise.id, data);
                                    }
                            });
                            i++;
                            if(i == data.tvshows.length){
                                $interval.cancel(interval);
                            }
                        }, 1);
                    }
                    else{
                        XBMC_API.resolve_promise(promise.id, data);
                    }
            });
        };

        Service.scan = function(){
            return XBMC_API.sendRequest(prefix + "Scan");
        };

        Service.clean = function(){
            return XBMC_API.sendRequest(prefix + "Clean");
        };

        return Service;
    }])
    .factory('GUI', ['XBMC_API', function(XBMC_API){
        var prefix = "GUI.";

        var Service = {};
        Service.prefix = prefix;

        Service.fullscreen = function(){
            return XBMC_API.sendRequest(prefix + "SetFullscreen", {fullscreen: false});
        };

        return Service;
    }])
    .factory('JSONRPC', ['XBMC_API', function(XBMC_API){
        var prefix = "JSONRPC.";

        var Service = {};
        Service.prefix = prefix;

        Service.getVersion = function(){
            return XBMC_API.sendRequest(prefix + "Version");
        };

        return Service;
    }])
    .factory('COMMANDS', ['VIDEO', 'GUI', function(VIDEO, GUI){
        var Service = {};
        Service.commands = [
            {name: "Scan Video Library", func: VIDEO.scan},
            {name: "Clean Video Library", func: VIDEO.clean},
            {name: "Toggle Full Screen", func: GUI.fullscreen}
        ];

        return Service;
    }]);
