'use strict';

angular.module('xbmc.filters', [])
    .filter('encode', function () {
        return function (text) {
            return encodeURIComponent(text);
        }
    })
    .filter('leading_zero', function(){
        return function(text){
            text = parseInt(text);
            if (text > 0 && text < 10){
                text = "0"+text;
            }
            return text;
        }
    });