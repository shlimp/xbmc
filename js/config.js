'use strict';

//Setting up route
angular.module('xbmc')
    .config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider.
                when('/', {
                    templateUrl: 'views/home.html'
                }).
                when('/movies/', {
                    controller: "MoviesController",
                    template: '<div data-ng-include="templateUrl"></div>'
                }).
                when('/torrents/', {
                    controller: "TorrentsController",
                    templateUrl: 'views/torrents.html'
                }).
                when('/shows/', {
                    controller: "TVShowsController",
                    template: '<div data-ng-include="templateUrl"></div>'
                }).
                when('/shows/:tvshowid', {
                    controller: "SeasonsController",
                    template: '<div data-ng-include="templateUrl"></div>'
                }).
                when('/shows/:tvshowid/:seasonid', {
                    controller: "EpisodesController",
                    template: '<div data-ng-include="templateUrl"></div>'
                }).
                when('/movies_subtitles/', {
                    controller: "SubtitlesController",
                    template: '<div data-ng-include="templateUrl"></div>'
                }).
                when('/log/', {
                    controller: "LogController",
                    templateUrl: 'views/log.html'
                }).
                otherwise({
                    redirectTo: '/'
                });
        }
    ])
    .run(['$rootScope', '$location', 'Globals', function($rootScope, $location, Globals){
        $rootScope.$on("$routeChangeSuccess", function (event, /*Angular.Route*/next) {
            Globals.current_page = next.originalPath.replace(/\//g, "");
        });
    }]);

//Setting HTML5 Location Mode
angular.module('xbmc').config(['$locationProvider',
    function ($locationProvider) {
        $locationProvider.hashPrefix('!');
    }
]);

angular.module('xbmc').config(['$sceProvider',
    function ($sceProvider) {
        $sceProvider.enabled(false);
    }
]);

angular.module('xbmc').config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.useXDomain = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }
]);
