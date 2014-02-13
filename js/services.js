'use strict';

/* Services */

angular.module('xbmc.services', [])
    .factory('XBMC_API', ['$q', '$rootScope', 'HOST', function ($q, $rootScope, HOST) {
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
            $rootScope.$broadcast('socket_ready', socket_ready);
        };

        ws.onmessage = function (message) {
            listener(JSON.parse(message.data));
        };

        function sendRequest(request) {
            var defer = $q.defer();
            var callbackId = getCallbackId();
            callbacks[callbackId] = {
                time: new Date(),
                cb: defer
            };
            request.id = callbackId;
//            console.log('Sending request', request);
            ws.send(JSON.stringify(request));
            return defer.promise;
        }

        function listener(data) {
//            console.log("Received data from websocket: ", data);
            // If an object exists with callback_id in our callbacks object, resolve it
            if (callbacks.hasOwnProperty(data.id)) {
                callbacks[data.id].cb.resolve(data.result);
                $rootScope.$apply();
                delete callbacks[data.id];
            }
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
        Service.sendRequest = function (method, params) {
            var request = {"jsonrpc": "2.0", "method": method, "params": params};
            // Storing in a variable for clarity on what sendRequest returns
            return sendRequest(request);
        };

        Service.registerListener = function(method, func){
            registerListener(method, func);
        };

        return Service;
    }])
    .factory('VIDEO', ['XBMC_API', function(XBMC_API){
        var prefix = "VideoLibrary.";

        var Service = {};
        Service.prefix = prefix;

        Service.registerListener = function(method, func){
            method = method? prefix + method: null;
            XBMC_API.registerListener(method, func);
        };

        Service.getRecentlyAddedMovies = function(){
            return XBMC_API.sendRequest(prefix + "GetRecentlyAddedMovies", {properties: ["title", "thumbnail"], sort: {order: "descending", method: "dateadded"}});
        };

        Service.getRecentlyAddedEpisodes = function(){
            return XBMC_API.sendRequest(prefix + "GetRecentlyAddedEpisodes", {properties: ["title", "thumbnail", "season", "episode", "showtitle"], sort: {order: "descending", method: "dateadded"}});
        };

        Service.getMovieDetails = function(movie_id){
            return XBMC_API.sendRequest(prefix + "GetMovieDetails", {movieid: movie_id, properties: ["title", "art", "rating", "tagline", "plot", "cast", "imdbnumber", "trailer"]});
        };

        Service.scan = function(){
            return XBMC_API.sendRequest(prefix + "Scan");
        };

        Service.clean = function(){
            return XBMC_API.sendRequest(prefix + "Clean");
        };

        return Service;
    }])
    .factory('COMMANDS', ['VIDEO', function(VIDEO){
        var Service = {};
        Service.commands = [
            {name: "Scan Video Library", func: VIDEO.scan},
            {name: "Clean Video Library", func: VIDEO.clean}
        ];

        return Service;
    }]);
