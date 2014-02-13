'use strict';

angular.module('xbmc.directives', [])
    .directive('autoComplete', function () {
        return{
            scope: true,
            transclude: false,
            link: function (scope, el, attrs) {
                scope.show_items = false;
                scope.items = scope.$eval(attrs.autoComplete);
                scope.mouse_over = false;
                scope.current_item = -1;

                function set_current_item(element) {
                    var items = el.find("li");
                    angular.forEach(items, function (item, idx) {
                        if (item == element[0]) {
                            focus_item(idx);
                        }
                    })
                }

                function focus_item(idx, offset) {
                    var items = el.find("li");
                    idx = idx || scope.current_item + offset;
                    if (offset && ((offset > 0 && idx > items.length - 1) || (offset < 0 && idx < 0)))
                        return false;
                    scope.current_item = idx;
                    angular.element(items[idx]).addClass("hover");
                    angular.forEach(items, function (item, i) {
                        if (i != idx) {
                            angular.element(item).removeClass("hover");
                        }
                    });
                    return true;
                }

                function select(idx) {
                    idx = typeof idx != "undefined" ? idx : scope.current_item;
                    var items = scope.filtered_items || scope.items;
                    items[idx].func();
                    scope.mouse_over = false;
                    el.find("input")[0].blur();
                }

                scope.open = function () {
                    scope.show_items = true;
                };

                scope.close = function (force) {
                    if (!force && scope.mouse_over) {
                        return false;
                    }
                    scope.show_items = false;
                    scope.current_item = -1;
                };

                scope.select = function (idx) {
                    select(idx);
                    scope.close(true);
                };

                scope.on_mouse_over = function (e) {
                    scope.mouse_over = true;
                    set_current_item(angular.element(e.target));
                };

                scope.on_mouse_leave = function () {
                    scope.mouse_over = false;
                    scope.current_item = -1;
                };

                angular.element(window).bind("keydown", function (e) {
                    if (scope.show_items) {
                        switch (e.keyCode) {
                            case 40:
                                focus_item(null, +1);
                                break;
                            case 38:
                                focus_item(null, -1);
                                break;
                            case 13:
                                select();
                                break;
                        }
                    }
                })
            }
        }
    })
    .directive('modalDialog', function () {
        return {
            scope: {
                show: '=',
                open: '&onOpen',
                close: '&onClose'
            },
            replace: true, // Replace with the template below
            transclude: true, // we want to insert custom content inside the directive
            templateUrl: 'views/modal.html',
            link: function (scope, element, attrs) {
                scope.dialogStyle = {};

                if (attrs.width)
                    scope.dialogStyle.width = attrs.width;
                if (attrs.height)
                    scope.dialogStyle.height = attrs.height;

                scope.hideModal = function () {
                    scope.show = false;
                    scope.close();
                };

                scope.$watch('show', function(val){
                    if(val){
                        scope.open();
                    }
                })
            }
        };
    });