'use strict';

/* Controllers */
angular.module('xbmc.controllers', [])
    .controller("MainController", ["$scope", "$rootScope", "VIDEO", "HOST", function($scope, $rootScope, VIDEO, HOST){
        $scope.HOST = HOST;
        $scope.get_movie_details = function(){
            VIDEO.getMovieDetails($rootScope.movieid).then(function(data){
                if (data.moviedetails.trailer.substring(0, data.moviedetails.trailer.indexOf("?")) == 'plugin://plugin.video.youtube/') {
                    var trailer_id = data.moviedetails.trailer.substr(data.moviedetails.trailer.lastIndexOf("=") + 1);
                    data.moviedetails.trailer_url = "http://www.youtube.com/embed/" + trailer_id;
                }
                $scope.movie_details = data.moviedetails;
            });
        };

        $scope.search_results = [];

        $scope.search = function(val){
            if(!val){
                $scope.search_results = [];
                return false;
            }
            var results = [];
            VIDEO.searchMovies(val).then(function(data){
                if(data.movies)
                    results = results.concat(data.movies);
                return VIDEO.searchTVShows(val);
            }).then(function(data){
                if(data.tvshows)
                    results = results.concat(data.tvshows);
                $scope.search_results = results;
            });
            return true;
        };

        $scope.select_item = function(item){
            if(item.movieid){
                $rootScope.movieid = item.movieid;
                $rootScope.movie_details_show = true;
                $rootScope.$apply();
            }
        };

        $scope.clean_movie_details = function(){
            $scope.movie_details = null;
        }
    }])
    .controller('HomeController', ["$scope", "VIDEO", "HOST", function($scope, VIDEO){
        $scope.$on('socket_ready', function(e,val){
            if (val){
                getRecent();
            }
        });

        function getRecent(){
            VIDEO.getRecentlyAddedMovies().then(function(data){
                $scope.recent_movies = data.movies;
            });
            VIDEO.getRecentlyAddedEpisodes().then(function(data){
                $scope.recent_episodes = data.episodes;
            });
        }

        $scope.$on(VIDEO.prefix + 'OnScanFinished', function(){
            getRecent();
        });

        $scope.$on(VIDEO.prefix + 'OnCleanFinished', function(){
            getRecent();
        });
    }])
    .controller('LeftMenuController', ["$scope", "COMMANDS", function($scope, COMMANDS){
        $scope.show = true;
        $scope.commands = COMMANDS.commands;

        $scope.run_command = function(item){
            if (item.func){
                item.func();
            }
        }
    }])
    .controller('NotificationController', ["$scope", "$interval", "VIDEO", function($scope, $interval, VIDEO){
        $scope.notifications = [];
        function notification_listener(method){
            var msg = "";
            switch(method.replace(VIDEO.prefix, "")){
                case "OnScanStarted":
                    msg = "Started Scan";
                    break;
                case "OnScanFinished":
                    msg = "Finish Scan";
                    break;
                case "OnCleanStarted":
                    msg = "Started Clean";
                    break;
                case "OnCleanFinished":
                    msg = "Finish Clean";
                    break;
            }
            if(msg){
                $scope.notifications.push({msg: msg, time: new Date().getTime()});
                $scope.$apply();
            }
        }

        $interval(function(){
            var time = new Date().getTime()-5000;
            for(var i = 0; i < $scope.notifications.length; i++){
                if($scope.notifications[i].time < time){
                    $scope.notifications.splice(i, 1);
                    i--;
                }
            }
        }, 10000);

        VIDEO.registerListener(null, notification_listener);
    }]);