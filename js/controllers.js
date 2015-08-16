'use strict';

/* Controllers */
angular.module('xbmc.controllers', [])

    .controller("MainController", ["$scope", "$rootScope", "Video", "SETTINGS", "Globals", "Player", "$interval", function($scope, $rootScope, Video, SETTINGS, Globals, Player, $interval){

        $scope.playing = {percentage: 0};
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

        function get_playing(){
            Player.getItem().then(function(data){
                if (Array.isArray(data) && data.length == 0) {
                    return false;
                }
                else{
                    $scope.playing = data;
                }
            });
        }

        if (SETTINGS.SEARCH_NEW_EPISODES_ON_LOAD)
            Globals.searchNewEpisodes();

//        Player.getItem().then(function(data){
//            console.log(data)
//        });

        $interval(get_playing, 1000);

    }])

    .controller('HeaderController', ['$scope', '$rootScope', '$timeout', 'Video', 'SETTINGS', "Globals", "$routeParams", function($scope, $rootScope, $timeout, Video, SETTINGS, Globals, /*Route.Params*/$routeParams){
        $scope.HOST = SETTINGS.HOST;
        $scope.all_movies_and_shows = [];
        $rootScope.link_patterns = SETTINGS.LINK_PATTERNS;
        $scope.breadcrumbs = [];

        //var results = [];
        //Video.getMovies().then(function(/*Video.Movies*/data){
        //    if(data.movies)
        //        results = results.concat(data.movies);
        //    return Video.getShows();
        //}).then(function(/*Video.TvShows*/data){
        //    if(data.tvshows)
        //        results = results.concat(data.tvshows);
        //    $scope.all_movies_and_shows = results;
        //});

        $scope.select_item = function(item){
            if(item.movieid){
                $rootScope.movieid = item.movieid;
                $rootScope.movie_details_show = true;
                $timeout(function(){$rootScope.$apply()});
            }
        };

        $scope.$watch(function(){return Globals.current_page}, function(new_val){
            var base_page = new_val;
            if(base_page.indexOf(":") > -1)
                base_page = base_page.substring(0, base_page.indexOf(":"));
            $scope.breadcrumbs = [];
            $scope.breadcrumbs.push({
                name: "Home",
                path: "#!/"
            });
            switch (base_page){
                case "shows":
                    $scope.breadcrumbs.push({
                        name: "TV Shows",
                        path: "#!/shows"
                    });
                    if ($routeParams.tvshowid){
                        Video.getTVShowDetails($routeParams.tvshowid).then(function(/*Video.TvShows*/data){
                            $scope.breadcrumbs.push({
                                name: data.tvshowdetails.title,
                                path: "#!/shows/" + $routeParams.tvshowid
                            });
                            if ($routeParams.seasonid){
                                $scope.breadcrumbs.push({
                                    name: "Season " + $routeParams.seasonid,
                                    path: ""
                                });
                            }
                        })
                    }
                    break;
                case "movies":
                    $scope.breadcrumbs.push({
                        name: "Movies",
                        path: "#!/movies"
                    });
            }
        });

    }])

    .controller('HomeController', ["$scope", "Video", "XBMC_API", function($scope, Video, XBMC_API){
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

        XBMC_API.cleanListeners();
        Video.registerListener('OnScanFinished', getRecent);
        Video.registerListener('OnCleanFinished', getRecent);
    }])

    .controller('TorrentsController', ["$scope", 'SETTINGS', "XBMC_API", function($scope, SETTINGS, XBMC_API){
        $scope.HOST = SETTINGS.HOST;
        $scope.torrent_url = "http://"+SETTINGS.HOST+":8100/transmission/web/";
        XBMC_API.cleanListeners();
    }])

    .controller('MoviesController', ["$scope", "Video", "Globals", "XBMC_API", "Files", function($scope, Video, Globals, XBMC_API, Files){
        $scope.templateUrl = "views/" + $scope.view_type + "/movies.html";
        $scope.movies = [];
        getMovies();

        function getMovies(){
            Video.getMovies().then(function(/*Video.Movies*/data){
                $scope.movies = data.movies;
            })
        }

        $scope.delete_movie = function(ev, movie){
            ev.stopPropagation();
            if (confirm("Are you sure you want to delete " + movie.title + "?")){
                Files.deleteMovie(movie.file);
                Video.clean();
            }
        };

        XBMC_API.cleanListeners();
        Video.registerListener('OnScanFinished', getMovies);
        Video.registerListener('OnCleanFinished', getMovies);

        $scope.$watch(function(){return Globals.view_type}, function(new_val){
            $scope.templateUrl = "views/" + new_val + "/movies.html";
        });
    }])

    .controller('TVShowsController', ["$scope", "Video", "Globals", "Helpers", "XBMC_API", function($scope, Video, Globals, Helpers, XBMC_API){
        $scope.shows = [];
        getTvShows();

        function getTvShows(){
            Video.getShows().then(function(/*Video.TvShows*/data){
                $scope.shows = data.tvshows;

                for (var i = 0; i < $scope.shows.length; i++) {
                    Video.getLastAired($scope.shows[i].tvshowid, Helpers.xml_to_json($scope.shows[i].episodeguide).episodeguide.url["#text"]).then(function(/*Video.EpisodeGuide*/episodeguide){
                        var last_aired = episodeguide.last_aired;
                        var show = $scope.shows.filter(function(el){return el.tvshowid == last_aired.tvshowid})[0];
                        if(show.latest_season < parseInt(last_aired.SeasonNumber) || (show.latest_season == parseInt(last_aired.SeasonNumber) && show.latest_episode < parseInt(last_aired.EpisodeNumber))){
                            show.has_new_episode = true;
                            show.has_new_episode_class = "has_new";
                        }
                        show.next_aired = episodeguide.next_aired;
                    });
                }
            })
        }

        XBMC_API.cleanListeners();
        Video.registerListener('OnScanFinished', getTvShows);
        Video.registerListener('OnCleanFinished', getTvShows);

        $scope.$watch(function(){return Globals.view_type}, function(new_val){
            $scope.templateUrl = "views/" + new_val + "/shows.html";
        });
    }])

    .controller('SeasonsController', ["$scope", "Video", "Globals", "$routeParams", "XBMC_API", function($scope, Video, Globals, $routeParams, XBMC_API){
        $scope.seasons = [];
        getSeasons();

        function getSeasons(){
            Video.getSeasons($routeParams.tvshowid).then(function(data){
                $scope.seasons = data.seasons;
            });
        }

        XBMC_API.cleanListeners();
        Video.registerListener('OnScanFinished', getSeasons);
        Video.registerListener('OnCleanFinished', getSeasons);

        $scope.$watch(function(){return Globals.view_type}, function(new_val){
            $scope.templateUrl = "views/" + new_val + "/seasons.html";
        });
    }])

    .controller('EpisodesController', ["$scope", "Video", "Globals", "$routeParams", "XBMC_API", function($scope, Video, Globals, $routeParams, XBMC_API){
        $scope.episodes = [];
        getEpisodes();

        function getEpisodes(){
            Video.getEpisodes($routeParams.tvshowid, $routeParams.seasonid).then(function(data){
                $scope.episodes = data.episodes;
            });
        }

        XBMC_API.cleanListeners();
        Video.registerListener('OnScanFinished', getEpisodes);
        Video.registerListener('OnCleanFinished', getEpisodes);

        $scope.$watch(function(){return Globals.view_type}, function(new_val){
            $scope.templateUrl = "views/" + new_val + "/episodes.html";
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
            if(new_val.indexOf(":") > -1)
                new_val = new_val.substring(0, new_val.indexOf(":"));
            $scope.selected_menu_item = new_val;
        });

        $scope.$watch('show_left_menu', function(new_val){
            Globals.left_menu_shown = new_val;
        });

    }])

    .controller('SubtitlesController', ["$scope", "Video", "Globals", function($scope, Video, Globals){
        $scope.$watch(function(){return Globals.view_type}, function(new_val){
            $scope.templateUrl = "views/" + new_val + "/subtitles.html";
        });
        $scope.subs = [];
        Video.getSubtitles().then(function(data){
            $scope.subs = data.rss.channel.item;
        });
    }])

    .controller('LogController', ["$scope", "$rootScope", "Misc", "$interval", "$timeout", "SETTINGS", function($scope, $rootScope, Misc, $interval, $timeout, SETTINGS){
        $scope.log = [];

        function get_log(){
            Misc.getLog().then(function (data) {
                $scope.log = data;
            });
        }
        get_log();
        var interval = $interval(get_log, SETTINGS.LOG_INTERVAL);
        $rootScope.$on("$routeChangeStart", function(){
            $interval.cancel(interval);
        })
    }]);
