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
                otherwise({
                    redirectTo: '/'
                });
        }
    ])
    .run(['$rootScope', '$location', 'General', function($rootScope, $location, General){
        $rootScope.$on("$routeChangeSuccess", function (event, next) {
            General.current_page = next.originalPath.replace(/\//g, "");
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