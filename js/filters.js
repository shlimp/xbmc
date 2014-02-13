'use strict';

angular.module('xbmc.filters', []).filter('encode', function () {
    return function (text) {
        return encodeURIComponent(text);
    }
});