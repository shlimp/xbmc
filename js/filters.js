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
    })
    .filter('space_to_dash', function(){
        return function(text){
            return text.replace(/\s/g, "-");
        }
    })
    .filter('clean_name', function(){
        return function(text){
            return text.replace(/(\s\(.+\))/g, "").toLowerCase();
        }
    });