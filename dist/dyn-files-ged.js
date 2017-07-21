(function() {
    'use strict';

    angular
        .module('dyn.files.ged', []);
})();

(function() {
    'use strict';

    angular
        .module('dyn.files.ged')
        .value('dynGedConfig', {
            baseUrl: '/'
        });
})();

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

(function() {
    'use strict';

    angular
        .module('dyn.files.ged')
        .service('DynGedService', DynGedService);

    DynGedService.$inject = [
        '$http',
        '$window',
        'dynGedConfig'
    ];

    /**
     * Serviço com funções utilitárias para comunicação com o GED.
     *
     * @param {Object} $http    Serviço de http do Angular.
     */
    function DynGedService(
            $http,
            $window,
            dynGedConfig) {

        var _this = this;

        var defaults = {
            baseUrl: '/'
        };

        angular.extend(defaults, dynGedConfig);

        // Public methods
        _this.authorizeAndDownload = authorizeAndDownload;
        _this.authorize = authorize;
        _this.download = download;

        /**
         * Autoriza e baixa um arquivo do GED.
         * @param  {String} url      Caminho do arquivo a ser autorizado e baixado.
         * @return {Object}          Promise da requisição.
         */
        function authorizeAndDownload(url) {
            return authorize(url).then(function(response) {
                return download(response.data);
            });
        }

        /**
         * Autoriza um arquivo para download.
         * @param  {String} filePath Caminho do arquivo a ser autorizado.
         * @return {Object}          Promise da requisição.
         */
        function authorize(filePath) {
            return $http.post(makeUrl(filePath));
        }

        /**
         * Efetua o download de um arquivo do GED.
         * @param  {Object} gedObject Objeto de autorização de um arquivo do GED.
         */
        function download(gedObject) {
            $window.location.assign(gedObject.url);
        }

        /**
         * Cria a url de consulta de acordo com a configuração injetada (dynGedConfig.baseUrl).
         * @param  {string} filePath    Path do arquivo a ser baixado
         * @return {string}             Url gerada.
         */
        function makeUrl(filePath) {

            var mUrl = defaults.baseUrl;
            var mFilePath = filePath;

            if (!mFilePath) {
                return null;
            }

            // Valida a existencia da URL
            if (!mUrl) {
                mUrl = '/';
            }

            // Corrige possivel falta de barra
            if (mUrl.slice(-1) === '/') {
                mUrl = mUrl.slice(-1);
            }

            // Corrige possivel falta de barra
            if (mFilePath.charAt(0) === '/') {
                mFilePath = mFilePath.slice(1);
            }

            return mUrl + '/' + mFilePath;
        }
    }
})();
