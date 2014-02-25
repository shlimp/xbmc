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
                    templateUrl: 'views/movies.html'
                }).
                when('/shows/', {
                    templateUrl: 'views/shows.html'
                }).
                otherwise({
                    redirectTo: '/'
                });
        }
    ])
    .run(['$rootScope', '$location', 'Globals', function($rootScope, $location, Globals){
        $rootScope.$on("$routeChangeSuccess", function (event, next) {
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