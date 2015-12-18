/*global angular, $, L */

angular.module('voyager.map').
    factory('mapCustomControls', function (config, $http) {
        'use strict';

       function _bufferTemplate() {
            var markup = '<div class="buffer-option">';
            markup += '<form name="bufferOption">';
            markup += '<div class="buffer-content"><div class="buffer-label semi">Buffer distance</div>';
            markup += '<input type="text" ng-model="buffer.distance" />';
            markup += '<select ui-select2="{dropdownAutoWidth: \'true\', minimumResultsForSearch: -1}" ng-model="buffer.measure">';
            markup += '<option ng-repeat="type in ::bufferMeasures">{{::type}}</option>';
            markup += '</select></div>';
            markup += '<div class="buffer-footer">';
            markup += '<input type="submit" value="Done" class="btn btn-primary" ng-click="addBuffer()" />';
            markup += '<a href="#" ng-click="bufferCancel($event)" class="link_secondary">Cancel</a>';
            markup += '</div>';
            markup += '</form>';
            markup += '</div>';

            return markup;
        }

        function _drawingToolTemplate() {
            var template = '<div class="leaflet-draw-section"><div class="leaflet-bar">';
            template += '<a class="voyager-draw-rect" ng-class="{\'selected\': _drawing}" ng-mousedown="toggleDrawingOption($event)" ng-mouseup="releaseDrawingOption($event)"><i class="icon-map_draw_{{toolType}}"></i></a>';
            template += '</div>';
            template += '<div class="leaflet-bar drawing-option-cont" ng-if="showDrawingTools">';
            template += '<ul id="drawingTools">';
            template += '<li><a ng-click="selectDrawingTool($event, \'rectangle\')" title="Rectangle"><i class="icon-map_draw_rectangle"></i></a></li>';
            template += '<li><a ng-click="selectDrawingTool($event, \'polygon\')" title="Polygon"><i class="icon-map_draw_polygon"></i></a></li>';
            template += '<li><a ng-click="selectDrawingTool($event, \'polyline\')" title="Line"><i class="icon-map_draw_polyline"></i></a></li>';
            template += '<li><a ng-click="selectDrawingTool($event, \'point\')" title="Marker"><i class="icon-map_draw_point"></i></a></li>';
            template += '</ul>';
            template += '</div></div>';

            return template;
        }

        return {
            getBufferTemplate: function() {
                return _bufferTemplate();
            },
            getDrawingToolTemplate: function() {
                return _drawingToolTemplate();
            },
            convertBuffer: function(distance, geoJSON) {
                return $http.post(config.root + 'api/rest/spatial/buffer?diff=true&distance=' + distance, geoJSON);
            }
        };

    });