'use strict';

describe('Filters:', function () {

    var cfg = _.clone(config);

    function _flushHttp(httpMock) {
        httpMock.flush();
        httpMock.verifyNoOutstandingExpectation();
        httpMock.verifyNoOutstandingRequest();
    }
    //_.mixin(_.str.exports());  //this happens in the app.js, not fired here

    beforeEach(function () {
        module('voyager.util');
        module('voyager.security'); //auth service module - apparently this is needed to mock the auth service
        module(function ($provide) {
            $provide.constant('config', cfg);
            $provide.value('authService',{});  //mock the transitive auth service so it doesn't call the init methods
        });
        module('voyager.filters');
        module('ui.bootstrap');
    });

    var httpMock, _configService, scope, controllerService, _filterService, q, _treeService, $location, $timeout;

    beforeEach(inject(function ($rootScope, configService, $httpBackend, $controller, filterService, $q, treeService, _$location_, _$timeout_) {
        httpMock = $httpBackend;
        _configService = configService;
        scope = $rootScope.$new();
        controllerService = $controller;
        _filterService = filterService;
        q = $q;
        _treeService = treeService;
        $location = _$location_;
        $timeout = _$timeout_;
    }));

    describe('filtersController events', function () {

        it('should load', function () {
            controllerService('FiltersCtrl', {$scope: scope});
            scope.$apply();

            expect(scope.maxFacets).toBe(10);
        });

        it('should fetch on search event', function () {

            var displayFilter = {name: 'junk', field: 'junkField'};
            var displayFacet = ['junkFacet', 5];

            cfg.settings.data.filters.push(displayFilter);

            //evalutating sinon vs jasmine
            sinon.stub(_filterService, 'applyFromUrl').returns(q.when({}));

            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});
            scope.$apply();

            scope.$emit('doSearch');

            httpMock.expectJSONP().respond({facet_counts:{facet_fields:{junkField:displayFacet}}});

            scope.$apply();

            _flushHttp(httpMock);

            var actualFilter = scope.filters[0];
            expect(actualFilter.name).toBe(displayFilter.name);

            var facets = actualFilter.values;

            //This is more of a functional test it spans outside of the filtersController (trying to get more bang for buck)
            expect(facets[0].name).toBe(displayFacet[0]);
            expect(facets[0].count).toBe(displayFacet[1]);
            expect(facets[0].filter).toBe(displayFilter.field);
        });

        it('should fetch on filterChanged event', function () {

            var displayFilter = {name: 'junk', field: 'junkField'};
            var displayFacet = ['junkFacet', 5];

            cfg.settings.data.filters.push(displayFilter);

            //evalutating sinon vs jasmine
            sinon.stub(_filterService, 'applyFromUrl').returns(q.when({}));

            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});
            scope.$apply();

            scope.$emit('filterChanged');

            httpMock.expectJSONP().respond({facet_counts:{facet_fields:{junkField:displayFacet}}});

            scope.$apply();

            _flushHttp(httpMock);

            var actualFilter = scope.filters[0];
            expect(actualFilter.name).toBe(displayFilter.name);
        });
    });

    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    }

    describe('filtersController functions', function () {

        it('should open min date picker', function () {
            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});
            var facet = {};
            scope.openMinDatePicker($.Event('click'), facet);
            expect(facet.isMinOpened).toBeTruthy();
            expect(facet.isMaxOpened).toBeFalsy();
        });

        it('should open max date picker', function () {
            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});
            var facet = {};
            scope.openMaxDatePicker($.Event('click'), facet);
            expect(facet.isMaxOpened).toBeTruthy();
            expect(facet.isMinOpened).toBeFalsy();
        });

        it('should filter selected', function () {
            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});
            var facet = {isSelected: true};
            scope.filterResults(facet);

            var res = {facet_counts:{facet_fields:{}}};

            var url = new RegExp(escapeRegExp('root/solr/v0/select?voyager.config.id=default&rows=0&facet=true'));
            httpMock.expectJSONP(url).respond(res);  // solr filter query
            _flushHttp(httpMock);

            // TODO need assertions on scope.filters
            //console.log(JSON.stringify(scope.filters));
        });

        it('should filter results with shards', function () {

            cfg.settings.data.showFederatedSerach = true;

            $location.search('shards','shard');
            $location.path('/search');
            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});
            var facet = {isSelected: false, field:'shard', id:'shard'};

            spyOn(_configService,'getCatalogs').and.returnValue(q.when());

            scope.filterResults(facet);

            var res = {facet_counts:{facet_fields:{}},'shards.info':{'shard-key':{error:'error'}}};

            httpMock.expectGET(new RegExp(escapeRegExp('root/api/rest/index/config/federation.json'))).respond({servers:[{url:'url/'}]}); // catalogs call

            httpMock.expectGET(new RegExp(escapeRegExp('url/api/rest/i18n/field/location.json'))).respond({VALUE:{location:'location'}}); // remote catalog locations call

            var url = new RegExp(escapeRegExp('root/solr/v0/select?shards=shard,shard&voyager.config.id=default&rows=0&facet=true'));
            httpMock.expectJSONP(url).respond(res);  // solr filter query

            // TODO why called again?
            httpMock.expectGET(new RegExp(escapeRegExp('root/api/rest/index/config/federation.json'))).respond({servers:[{url:'url/'}]}); // catalogs call

            _flushHttp(httpMock);

            cfg.settings.data.showFederatedSerach = false; // set false so it doesn't affect other tests

            expect($location.search().shards).toEqual('shard,shard');
            // TODO need assertions on scope.filters
            //console.log(JSON.stringify(scope.filters));
        });

        it('should add range filter', function () {
            cfg.settings.data.filters = [{field: 'rangeField', style: 'RANGE', minCount: 0}];

            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});
            var facet = {isSelected: true, model:[1,2], name:'name', display:'display', style:'RANGE', filter:'rangeField', field:'rangeField'};
            scope.addRangeFilter(facet);

            httpMock.expectJSONP(new RegExp(escapeRegExp('stats=true'))).respond({stats:{stats_fields:{rangeField:{min:0, max:5}}}});  // stats query for range values

            var res = {facet_counts:{facet_fields:{rangeField:['facet',1]}}};
            var url = new RegExp(escapeRegExp('root/solr/v0/select?voyager.config.id=default&rows=0&facet=true'));
            httpMock.expectJSONP(url).respond(res);  // solr filter query
            _flushHttp(httpMock);

            cfg.settings.data.filters = [];
        });

        it('should add stats filter', function () {
            cfg.settings.data.filters = [{field: 'statsField', style: 'STATS', minCount: 0}];

            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});
            var facet = {isSelected: true, model:[1,2], name:'name', display:'display', style:'STATS', filter:'statsField', field:'statsField'};
            scope.addRangeFilter(facet);

            httpMock.expectJSONP(new RegExp(escapeRegExp('stats=true'))).respond({stats:{stats_fields:{statsField:{min:0, max:5}}}});  // stats query for range values

            var res = {facet_counts:{facet_fields:{statsField:['facet',1]}}};
            var url = new RegExp(escapeRegExp('root/solr/v0/select?voyager.config.id=default&rows=0&facet=true'));
            httpMock.expectJSONP(url).respond(res);  // solr filter query

            httpMock.expectJSONP(new RegExp(escapeRegExp('stats=true'))).respond({stats:{stats_fields:{statsField:{min:0, max:5}}}});  // stats query for range values

            _flushHttp(httpMock);

            cfg.settings.data.filters = [];
        });

        it('should add calendar filter', function () {
            cfg.settings.data.filters = [{field: 'calendarField', style: 'RANGE', minCount: 0, stype:'date'}];

            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});

            var facet = {isSelected: true, model:[1,2], name:'name', display:'display', style:'RANGE', stype:'date', filter:'calendarField'};
            scope.addCalendarFilter(facet);

            httpMock.expectJSONP(new RegExp(escapeRegExp('stats=true'))).respond({stats:{stats_fields:{calendarField:{min:0, max:5}}}});  // stats query for range values

            var res = {facet_counts:{facet_fields:{calendarField:['facet',1]}}};

            var url = new RegExp(escapeRegExp('root/solr/v0/select?voyager.config.id=default&rows=0&facet=true'));
            httpMock.expectJSONP(url).respond(res);  // solr filter query
            _flushHttp(httpMock);

            cfg.settings.data.filters = [];
        });

        it('should add folder filter', function () {
            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});
            var facet = {isSelected: false, model:[1,2], name:'name', display:'display', path:'path'};
            scope.addFolderFilter(facet);

            var res = {facet_counts:{facet_fields:{}}};

            var url = new RegExp(escapeRegExp('root/solr/v0/select?voyager.config.id=default&rows=0&facet=true'));
            httpMock.expectJSONP(url).respond(res);  // solr filter query
            _flushHttp(httpMock);
        });

    });

    describe('filtersController remove filter functions', function () {

        var facet = {isSelected: false, model: [1, 2], name: 'name', display: 'display', path: 'path'};
        var url = new RegExp(escapeRegExp('root/solr/v0/select'));
        var res = {facet_counts: {facet_fields: {}}};

        // set up controller and add a filter
        function initControllerAndFilter(facet) {
            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});

            scope.filterResults(facet);

            httpMock.expectJSONP(url).respond(res);  // solr filter query
            _flushHttp(httpMock);
        }

        it('should remove filter', function () {
            initControllerAndFilter(facet);
            scope.removeFilter(facet);

            httpMock.expectJSONP(url).respond(res);  // solr filter query
            _flushHttp(httpMock);
        });

        it('should remove filter', function () {
            initControllerAndFilter(facet);
            scope.removeFilter(facet);

            httpMock.expectJSONP(url).respond(res);  // solr filter query
            _flushHttp(httpMock);
        });

        it('should remove shard filter', function () {
            $location.search('shards', 'shard');
            facet.field = 'shard';
            initControllerAndFilter(facet);
            scope.removeFilter(facet);

            httpMock.expectJSONP(url).respond(res);  // solr filter query
            _flushHttp(httpMock);
            //TODO should remove comma
            expect($location.search().shards).toEqual('shard,');
        });

        it('should remove input filter', function () {
            facet.isInput = true;
            facet.field = 'field';
            $location.search('q','q');
            initControllerAndFilter(facet);
            scope.removeFilter(facet);

            httpMock.expectJSONP(url).respond(res);  // solr filter query
            _flushHttp(httpMock);

            expect($location.search().q).toBeUndefined();
        });
    });

    describe('filtersController misc functions', function () {

        it('should toggle display state', function () {
            controllerService('FiltersCtrl', {$scope: scope, filterService: _filterService});
            var filter = {displayState: '', field:'field'};
            scope.toggleDisplayState(filter);

            var filterElem = $('<div id="field"/>');
            $(document.body).append(filterElem);

            $timeout.flush();
            $timeout.flush();
        });

    });
});