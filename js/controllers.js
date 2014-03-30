'use strict';

/* Controllers */
angular.module('xbmc.controllers', [])

    .controller("MainController", ["$scope", "$rootScope", "Video", "SETTINGS", "Globals", function($scope, $rootScope, Video, SETTINGS, Globals){

        $scope.content_style = {paddingLeft: "220px"};
        $scope.$watch(function(){return Globals.left_menu_shown}, function(new_val){
            $scope.content_style.paddingLeft = new_val == true? "220px": "20px";
        });

        $scope.HOST = SETTINGS.HOST;
        $scope.get_movie_details = function(){
            Video.getMovieDetails($rootScope.movieid).then(function(/*Video.MovieDetails*/data){
                if (data.moviedetails.trailer.substring(0, data.moviedetails.trailer.indexOf("?")) == 'plugin://plugin.video.youtube/') {
                    var trailer_id = data.moviedetails.trailer.substr(data.moviedetails.trailer.lastIndexOf("=") + 1);
                    data.moviedetails.trailer_url = "http://www.youtube.com/embed/" + trailer_id;
                }
                $scope.movie_details = data.moviedetails;
            });
        };

        $scope.clean_movie_details = function(){
            $scope.movie_details = null;
        };

        if (SETTINGS.SEARCH_NEW_EPISODES_ON_LOAD)
            Globals.searchNewEpisodes();

//        Player.getItem().then(function(data){
//            console.log(data)
//        });

    }])

    .controller('HeaderController', ['$scope', '$rootScope', '$timeout', 'Video', 'SETTINGS', function($scope, $rootScope, $timeout, Video, SETTINGS){
        $scope.HOST = SETTINGS.HOST;
        $scope.all_movies_and_shows = [];
        $rootScope.link_patterns = SETTINGS.LINK_PATTERNS;

        var results = [];
        Video.getMovies().then(function(/*Video.Movies*/data){
            if(data.movies)
                results = results.concat(data.movies);
            return Video.getShows();
        }).then(function(/*Video.TvShows*/data){
            if(data.tvshows)
                results = results.concat(data.tvshows);
            $scope.all_movies_and_shows = results;
        });

        $scope.select_item = function(item){
            if(item.movieid){
                $rootScope.movieid = item.movieid;
                $rootScope.movie_details_show = true;
                $timeout(function(){$rootScope.$apply()});
            }
        };
    }])

    .controller('HomeController', ["$scope", "Video", function($scope, Video){
        $scope.recent_movies = [];
        $scope.recent_episodes = [];
        getRecent();

        function getRecent(){
            Video.getRecentlyAddedMovies().then(function(/*Video.Movies*/data){
                $scope.recent_movies = data.movies;
            });
            Video.getRecentlyAddedEpisodes().then(function(/*Video.Episodes*/data){
                $scope.recent_episodes = data.episodes;
            });
        }

        $scope.$on(Video.prefix + 'OnScanFinished', function(){
            getRecent();
        });

        $scope.$on(Video.prefix + 'OnCleanFinished', function(){
            getRecent();
        });
    }])

    .controller('MoviesController', ["$scope", "Video", "Globals", function($scope, Video, Globals){
        $scope.templateUrl = "views/" + $scope.view_type + "/movies.html";
        $scope.movies = [];
        getMovies();

        function getMovies(){
            Video.getMovies().then(function(/*Video.Movies*/data){
                $scope.movies = data.movies;
            })
        }

        $scope.$on(Video.prefix + 'OnScanFinished', function(){
            getMovies();
        });

        $scope.$on(Video.prefix + 'OnCleanFinished', function(){
            getMovies();
        });

        $scope.$watch(function(){return Globals.view_type}, function(new_val){
            $scope.templateUrl = "views/" + new_val + "/movies.html";
        });
    }])

    .controller('TVShowsController', ["$scope", "Video", "Globals", "Helpers", function($scope, Video, Globals, Helpers){
        $scope.shows = [];
        getTvShows();

        function getTvShows(){
            Video.getShows().then(function(/*Video.TvShows*/data){
                $scope.shows = data.tvshows;

                for (var i = 0; i < $scope.shows.length; i++) {
                    Video.getLastAired($scope.shows[i].tvshowid, Helpers.xml_to_json($scope.shows[i].episodeguide).episodeguide.url["#text"]).then(function(/*Video.EpisodeGuide*/episodeguide){
                        var show = $scope.shows.filter(function(el){return el.tvshowid == episodeguide.tvshowid})[0];
                        if(show.latest_season < parseInt(episodeguide.SeasonNumber) || (show.latest_season == parseInt(episodeguide.SeasonNumber) && show.latest_episode < parseInt(episodeguide.EpisodeNumber))){
                            show.has_new_episode = true;
                            show.has_new_episode_class = "has_new";
                        }
                    });
                }
            })
        }

        $scope.$on(Video.prefix + 'OnScanFinished', function(){
            getTvShows();
        });

        $scope.$on(Video.prefix + 'OnCleanFinished', function(){
            getTvShows();
        });

        $scope.$watch(function(){return Globals.view_type}, function(new_val){
            $scope.templateUrl = "views/" + new_val + "/shows.html";
        });
    }])

    .controller('LeftMenuController', ["$scope", "Globals", "LocalData", function($scope, Globals, LocalData){
        $scope.view_type = Globals.view_type;
        $scope.show_left_menu = Globals.left_menu_shown;
        $scope.selected_menu_item = Globals.current_page;
        $scope.commands = Globals.commands;

        $scope.run_command = function(item){
            if (item.func){
                item.func();
            }
        };

        $scope.change_view_type = function(type){
            Globals.view_type = type;
            $scope.view_type = type;
            LocalData.set("view_type", type);
        };

        $scope.$watch(function(){return Globals.current_page}, function(new_val){
            $scope.selected_menu_item = new_val;
        });

        $scope.$watch('show_left_menu', function(new_val){
            Globals.left_menu_shown = new_val;
        });
    }]);