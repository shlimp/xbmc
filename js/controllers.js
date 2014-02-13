'use strict';

/* Controllers */
angular.module('xbmc.controllers', [])
    .controller('HomeController', function($scope, VIDEO, HOST){
        $scope.HOST = HOST;
        $scope.limit = {
            movies: 5,
            episodes: 5
        };
        $scope.$on('socket_ready', function(e,val){
            if (val){
                getRecent();
            }
        });

        function getRecent(){
            VIDEO.getRecentlyAddedMovies().then(function(data){
                $scope.recent_movies = data.movies}
            );
            VIDEO.getRecentlyAddedEpisodes().then(function(data){
                $scope.recent_episodes = data.episodes}
            );
        }

        $scope.showNext = function(what_to_show){
            if(what_to_show == "movies"){
                $scope.limit.movies += 5;
                if($scope.limit.movies > $scope.recent_movies.length){
                    $scope.limit.movies = 5;
                }
            }
            else if (what_to_show == "episodes"){
                $scope.limit.episodes += 5;
                if($scope.limit.episodes> $scope.recent_episodes.length){
                    $scope.limit.episodes = 5;
                }
            }
        };

        $scope.$on(VIDEO.prefix + 'OnScanFinished', function(a,b){
            getRecent();
        });

        $scope.$on(VIDEO.prefix + 'OnCleanFinished', function(a,b){
            getRecent();
        });

        $scope.showPrev = function(what_to_show){
            if(what_to_show == "movies"){
                $scope.limit.movies -= 5;
                if($scope.limit.movies < 5){
                    $scope.limit.movies = 5;
                }
            }
            else if (what_to_show == "episodes"){
                $scope.limit.episodes -= 5;
                if($scope.limit.episodes < 5){
                    $scope.limit.episodes = 5;
                }
            }
        }
    })
    .controller('LeftMenuController', function($scope, COMMANDS){
        $scope.show = true;
        $scope.commands = COMMANDS.commands;
    })
    .controller('NotificationController', function($scope, $interval, VIDEO){
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
    });