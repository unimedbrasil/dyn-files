(function() {
    'use strict';

    angular
        .module('dyn.files.ged')
        .directive('dynGedDownload', dynGedDownload);

    dynGedDownload.$inject = [];

    /* @ngInject */
    function dynGedDownload() {
        return {
            restrict: 'A',
            controller: DynGedDownloadController,
            controllerAs: 'dynGedDownloadCtrl',
            scope: {
                dynGedDownload: '@',
                onClick: '&',
                onAuthorizing: '&',
                onAuthorized: '&',
                onDownloading: '&',
                onError: '&',
                onSuccess: '&',
            },
            bindToController: true,
            link: function(scope, element, attrs, ctrl) {
                element.on('click', function() {
                    ctrl.downloadFile();
                });
            }
        };
    }

    DynGedDownloadController.$inject = ['DynGedService'];

    function DynGedDownloadController(DynGedService) {

        var _this = this;

        // Faz unwrap dos callbacks
        _this.onClick = unwrap(_this.onClick);
        _this.onAuthorizing = unwrap(_this.onAuthorizing);
        _this.onAuthorized = unwrap(_this.onAuthorized);
        _this.onDownloading = unwrap(_this.onDownloading);
        _this.onError = unwrap(_this.onError);
        _this.onSuccess = unwrap(_this.onSuccess);

        /**
         * Efetua a autorização e o download do arquivo.
         */
        _this.downloadFile = function() {
            _this.onClick(_this.dynGedDownload);
            _this.onAuthorizing(_this.dynGedDownload);
            DynGedService.authorize(_this.dynGedDownload).then(function(response) {
                _this.onAuthorized(response.data);
                _this.onDownloading(response.data);
                DynGedService.download(response.data);
                _this.onSuccess();
            }).catch(function(error) {
                _this.onError(error);
            });
        };

        /**
         * Efetua unwrap dos callbacks.
         * @param  {Function} callback Callback a ser desempacotado.
         * @return {Function}          Callback desempacotado.
         */
        function unwrap(callback) {
            return callback() || function() {};
        }
    }
})();
