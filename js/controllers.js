'use strict';

/* Controllers */
angular.module('xbmc.controllers', [])

    .controller("MainController", ["$scope", "$rootScope", "Video", "SETTINGS", "Globals", "Helpers", function($scope, $rootScope, Video, SETTINGS, Globals, Helpers){
        console.log(SETTINGS);

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

        Video.getShows().then(function(/*Video.TvShows*/data){
            if (data.tvshows) {
                for (var i = 0; i < data.tvshows.length; i++) {
                    Video.getLastAired(data.tvshows[i].tvshowid, Helpers.xml_to_json(data.tvshows[i].episodeguide).episodeguide.url["#text"]).then(function(/*Video.EpisodeGuide*/episodeguide){
                        var show = Helpers.find_in_array(data.tvshows, "tvshowid", episodeguide.tvshowid);
                        if(show.latest_season < parseInt(episodeguide.SeasonNumber) || (show.latest_season == parseInt(episodeguide.SeasonNumber) && show.latest_episode < parseInt(episodeguide.EpisodeNumber))){
                            Globals.notifications.push({
                                obj: show, obj_name: "show",
                                persistant: true,
                                template: '<div>There is a new Episode for {{ show.title }} <div data-links data-item="show"></div></div>'
                            });
                        }
                    });
                }
            }
        });
    }])

    .controller('HeaderController', ['$scope', '$rootScope', '$timeout', 'Video', 'SETTINGS', function($scope, $rootScope, $timeout, Video, SETTINGS){
        $scope.HOST = SETTINGS.HOST;
        $scope.search_results = [];
        $rootScope.link_patterns = SETTINGS.link_patterns;

        $scope.search = function(val){
            if(!val){
                $scope.search_results = [];
                return false;
            }
            var results = [];
            Video.searchMovies(val).then(function(/*Video.Movies*/data){
                if(data.movies)
                    results = results.concat(data.movies);
                return Video.searchTVShows(val);
            }).then(function(/*Video.TvShows*/data){
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
                $timeout(function(){$rootScope.$apply()});
            }
        };
    }])

    .controller('HomeController', ["$scope", "Video", function($scope, Video){
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

    .controller('MoviesController', ["$scope", "Video", function($scope, Video){
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
    }])

    .controller('TVShowsController', ["$scope", "Video", function($scope, Video){
        getTvShows();

        function getTvShows(){
            Video.getShows().then(function(/*Video.TvShows*/data){
                $scope.shows = data.tvshows;
            })
        }

        $scope.$on(Video.prefix + 'OnScanFinished', function(){
            getTvShows();
        });

        $scope.$on(Video.prefix + 'OnCleanFinished', function(){
            getTvShows();
        });
    }])

    .controller('LeftMenuController', ["$scope", "Globals", function($scope, Globals){
        $scope.show_left_menu = Globals.left_menu_shown;
        $scope.selected_menu_item = Globals.current_page;
        $scope.commands = Globals.commands;

        $scope.run_command = function(item){
            if (item.func){
                item.func();
            }
        };

        $scope.$watch(function(){return Globals.current_page}, function(new_val){
            $scope.selected_menu_item = new_val;
        });

        $scope.$watch('show_left_menu', function(new_val){
            Globals.left_menu_shown = new_val;
        })
    }]);