/*global describe, beforeEach, module, it, inject, config */

describe('TaskCtrl', function () {

    'use strict';

    beforeEach(function () {
        //module('voyager.security'); //auth service module - apparently this is needed to mock the auth service
        module('taskRunner');
        module('LocalStorageModule');
        module('angulartics');
        module('ui.bootstrap');
        module('cart');
        module('voyager.filters');
        module(function ($provide) {
            $provide.constant('config', config);
            //$provide.value('authService',{});  //mock the auth service so it doesn't call the init methods
        });
    });

    var scope, controllerService, q, location, timeout, httpMock, $modal, cartService;

    beforeEach(inject(function ($rootScope, $controller, $q, $location, $timeout, $httpBackend, _$modal_, _cartService_) {
        scope = $rootScope.$new();
        q = $q;
        controllerService = $controller;
        location = $location;
        timeout = $timeout;
        httpMock = $httpBackend;
        $modal = _$modal_;
        cartService = _cartService_;
    }));

    var inputItemsWithQuery = {name:'input_items', query:{fq:'field:facet', params:{bbox:'',bboxt:''}}, ids:[], type:'VoyagerResults', response:{docs:[]}};

    function initCtrl() {
        //spyOn(location,'path').and.returnValue('status');
        //
        httpMock.expectGET(new RegExp('projections')).respond({});  // param service - projections call (could mock param service)
        httpMock.expectGET(new RegExp('task\/name\/init')).respond({params:[inputItemsWithQuery],state:'SUCCESS'});  // check status call
        httpMock.expectGET(new RegExp('display')).respond({params:[inputItemsWithQuery],state:'SUCCESS'});  // check status call

        controllerService('TaskCtrl', {$scope: scope, $modalInstance:{close: function(){}}, task:{name:'name'}, taskList:{}, extent:'0 0 0 0'});

        httpMock.flush();
    }

    describe('Load', function () {

        it('should load', function () {
            initCtrl();
        });

        it('should exec', function () {
            cartService.addQuery({fq:'field:facet',params:{bbox:'',bboxt:''}});
            cartService.addItem({id:'1'});

            initCtrl();

            httpMock.expectPOST(new RegExp('validate=true')).respond({});  // validate
            httpMock.expectPOST(new RegExp('validate=false')).respond({id:'id'});  // exec

            scope.execTask();

            httpMock.flush();

            expect(location.path()).toBe('/status/id');
        });

    });

});