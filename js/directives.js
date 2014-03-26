'use strict';

angular.module('xbmc.directives', [])

    .directive('myTransclude', function () {
        return {
            link: function (scope, element, /*Angular.Attributes*/attr) {
                var transclude = scope.$eval(attr.myTransclude);
                transclude(scope, function (dom) {
                    element.append(dom);
                });
            }
        }
    })

    .directive('autoComplete', ["$timeout", function ($timeout) {
        return{
            scope: {
                items: "=items",
                select_func: "=onSelect",
                search_func: "=onSearch",
                base_url: "=baseUrl"
            },
            replace: true,
            transclude: true,
            templateUrl: 'views/autocomplete.html',
            compile: function () {
                return function (scope, el, attrs, controllers, /*Angular.Attributes*/transclude) {
                    scope.transcludeFn = transclude;
                    scope.show_items = false;
                    scope.mouse_over = false;
                    scope.placeholder = attrs.placeholder;
                    scope.tabindex = attrs.tabindex || 0;
                    scope.local_filter = scope.$eval(attrs.localFilter) || false;
                    scope.show_on_focus = scope.$eval(attrs.showOnFocus);
                    scope.selected_item_idx = -1;
                    if (scope.show_on_focus == undefined)
                        scope.show_on_focus = true;

                    scope.widget_style = {};

                    if (attrs.width)
                        scope.widget_style.width = attrs.width;


                    function set_current_item(item, idx, offset) {
                        if (offset){
                            idx = scope.selected_item_idx + offset;
                            if (idx < 0)
                                idx = 0;
                            if (idx > scope.filtered_items.length-1)
                                idx = scope.filtered_items.length-1;
                            item = scope.filtered_items[idx]
                        }
                        scope.selected_item_idx = idx;
                        scope.selected_item = item;
                        el.find("li").removeClass("hover");
                        angular.element(el.find("li")[idx]).addClass("hover");
                    }

                    function select(item) {
                        scope.mouse_over = false;
                        el.find("input")[0].blur();
                        if (scope.select_func)
                            scope.select_func(item);
                    }

                    function search(val) {
                        if (scope.search_func)
                            scope.search_func(val);
                    }

                    scope.open = function () {
                        if (scope.show_on_focus)
                            scope.show_items = true;
                    };

                    scope.close = function (force) {
                        if (!force && scope.mouse_over) {
                            return false;
                        }
                        scope.show_items = false;
                        scope.current_item = -1;
                        return true;
                    };

                    scope.select = function (item) {
                        select(item);
                        scope.close(true);
                    };

                    scope.on_mouse_over = function (item, idx) {
                        set_current_item(item, idx);
                    };

                    scope.on_mouse_leave = function () {
                        scope.mouse_over = false;
                    };

                    scope.on_key_down = function(e){
                        if (scope.show_items) {
                            switch (e.keyCode) {
                                case 40:
                                    set_current_item(null, null, +1);
                                    break;
                                case 38:
                                    set_current_item(null, null, -1);
                                    break;
                                case 13:
                                    $timeout(function(){select(scope.selected_item)});
                                    break;
                            }
                        }
                    };

                    scope.$watch('query_items', function (new_val) {
                        if (!scope.show_on_focus){
                            if (new_val)
                                scope.show_items = true;
                            else
                                scope.close();
                        }
                        search(new_val);
                    });
                }
            }
        }
    }])

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

                scope.$watch('show', function (val) {
                    if (val) {
                        scope.open();
                    }
                })
            }
        };
    })

    .directive('links', ['SETTINGS', '$compile', function (SETTINGS, $compile) {
        return {
            scope: {
                item: "="
            },
            templateUrl: "views/links.html",
            link: function (scope, element) {
                var links = SETTINGS.LINK_PATTERNS;
                var el = null;
                var tpl = "";
                for (var i = 0; i < links.length; i++) {
                    tpl = '<a href="' + links[i].url + '" target="_blank">' + links[i].name + '</a>';
                    el = $compile(tpl)(scope);
                    element.find('div').append(el);
                }
            }
        };
    }])

    .directive('notifications', ["$interval", "Video", "Globals", "$compile", "Helpers", "$timeout", function ($interval, Video, Globals, $compile, Helpers, $timeout) {
        return {
            link: function (scope) {
                scope.notifications = [];
                function notification_listener(method) {
                    var msg = "";
                    switch (method.replace(Video.prefix, "")) {
                        case "OnScanStarted":
                            msg = "Started Scan";
                            break;
                        case "OnScanFinished":
                            msg = "Finish Scan";
                            break;
                        case "OnCleanStarted":
                            msg = "Started Clean";
                            break;
                        case "OnCleanFinished":
                            msg = "Finish Clean";
                            break;
                    }
                    if (msg) {
                        scope.notifications.push({msg: msg, time: new Date().getTime()});
                        scope.$apply();
                    }
                }

                $interval(function () {
                    var time = new Date().getTime() - 10000;
                    for (var i = 0; i < scope.notifications.length; i++) {
                        if (scope.notifications[i].time < time) {
                            scope.notifications.splice(i, 1);
                            i--;
                        }
                    }
                }, 10000);

                scope.dismiss = function(){
                    scope.notifications = [];
                    Globals.notifications = [];
                };

                scope.$watchCollection(function () {return Globals.notifications}, function (new_val) {
                    var el = null;
                    for (var i = 0; i < new_val.length-1; i++) {
                        var template = new_val[i].template;
                        scope[new_val[i].obj_name] = new_val[i].obj;
                        el = $compile(template)(scope);
                        $timeout(function(){
                            if (!Helpers.find_in_array(scope.notifications, "msg", el.html())) {
                                scope.notifications.push({msg: el.html(), time: new Date().getTime()+1000000});
                            }
                        });
                    }
                });

                Video.registerListener(null, notification_listener);
            }
        };
    }]);