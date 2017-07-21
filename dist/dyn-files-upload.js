(function() {
    'use strict';

    angular
        .module('dyn.files.upload', [
            'ngFileUpload'
        ]);
})();

(function() {
    'use strict';

    angular
        .module('dyn.files.upload')
		.value('dynUploadConfig', {
            authUrl: '/'
        });
})();

(function() {
    'use strict';

    angular
        .module('dyn.files.upload')
        .filter('bytes', filterBytes);

    /**
     * Filtro de tamanho de arquivo.
     */
    function filterBytes() {

        return filterFunc;

        /**
         * Filtra o tamanho do arquivo para um formato com visual melhor.
         * @param  {Number} bytes     Tamanho em bytes do arquivo.
         * @param  {Number} precision Precisão da conversão.
         * @return {String}           Valor filtrado.
         */
        function filterFunc(bytes, precision) {
            var mBytes = bytes;
            if (mBytes <= 0 || isNaN(parseFloat(mBytes)) || !isFinite(mBytes)) return 'Tamanho inválido';
            if (typeof precision === 'undefined') precision = 1;
            if (mBytes <= 1024) mBytes = 1024;
            var units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
            var number = Math.floor(Math.log(mBytes) / Math.log(1024));
            var val = (mBytes / Math.pow(1024, Math.floor(number))).toFixed(precision);
            return (val.match(/\.0*$/) ? val.substr(0, val.indexOf('.')) : val) + ' ' + units[number];
        }
    }
})();

(function() {
    'use strict';

    angular
        .module('dyn.files.upload')
        .factory('dynUpload', dynUpload);

    dynUpload.$inject = ['$http', '$log', '$q', 'Upload', 'dynUploadConfig'];

    /**
     * Serviço para autorização e upload de arquivos para o GED (Gestor de documentos).
     * @param  {Object} $http           Serviço de HTTP.
     * @param  {Object} $log            Serviço de log.
     * @param  {Object} $q              Serviço para execução de funções de modo assíncrono.
     * @param  {Object} Upload          Serviço interno de upload.
     * @param  {Object} dynUploadConfig Configuração do componente de upload.
     * @return {Object}                 Serviço de upload público.
     */
    function dynUpload($http, $log, $q, Upload, dynUploadConfig) {

        var filesWrapped = [];
        var defaults = {};

        /**
         * Estende as propriedades padrões com o que foi definido na config global.
         * @param  {Object} defaults        Propriedades padrões
         * @param  {Object} dynUploadConfig Configurações globais de upload.
         */
        angular.extend(defaults, dynUploadConfig);

        /**
         * Status possiveis durante o upload do arquivo.
         * @type {Object}
         */
        var FILE_STATUS = {
            WAITING: 0,
            AUTHORIZING: 100,
            AUTHORIZED: 110,
            AUTHORIZE_ERROR: -100,
            UPLOADING: 200,
            UPLOADED: 210,
            UPLOAD_ERROR: -200,
            CANCELED: 300
        };

        return {
            FILE_STATUS: FILE_STATUS,
            clearFiles: clearFiles,
            uploadOne: uploadOne,
            uploadAll: uploadAll,
            register: register,
            registerAll: registerAll,
            unregister: unregister,
            getFiles: getFiles,
            setAuthUrl: setAuthUrl,
            setAuthUrlResolver: setAuthUrlResolver,
            setAuthRequestParametersResolver: setAuthRequestParametersResolver,
            setAuthResponseParametersResolver: setAuthResponseParametersResolver,
            setOnUploadedListener: setOnUploadedListener
        };

        /**
         * Registra um arquivo para ser enviado.
         * @param  {Object} file       Arquivo a ser feito o upload
         * @param  {Object} moreInfos  Objeto com informações relavantes para o arquivo
         * @return {Integer}     Indice do arquivo no array de arquivos registrados.
         */
        function register(file, moreInfos) {
            var fileWrapBase = {
                id: generateUUID(),
                original: file,
                name: file.name,
                size: file.size,
                sizeLoaded: 0,
                status: FILE_STATUS.WAITING
            };
            var fileWrap = angular.extend({}, moreInfos, fileWrapBase);
            return filesWrapped.push(fileWrap) - 1;
        }

        /**
         * Registra toda a lista arquivos para ser enviado.
         *
         * @param  {Object} files  Arquivos a serem feitos o upload
         * @param  {Object} objetos com informações relavantes para cada arquivo
         */
        function registerAll(files, moreInfos) {
            if (!(files instanceof Array)) {
                return;
            }
            files.forEach(function(file) {
                register(file, moreInfos);
            });
        }

        /**
         * Limpa a fila de arquivos a ser enviado.
         */
        function clearFiles() {
            filesWrapped.length = 0;
        }

        /**
         * Remove um arquivo da fila para ser enviado.
         * @param  {Object} file Arquivo a ser feito o upload
         */
        function unregister(file) {
            var i = filesWrapped.length;
            while (i--) {
                var fileWrap = filesWrapped[i];
                if (fileWrap.id == file.id) {
                    filesWrapped.splice(i, 1);
                    return;
                }
            }
        }

        /**
         * Envia todos os arquivos registrados para upload.
         * @return {Object} Promise de execução do upload.
         */
        function uploadAll() {
            var promiseArray = [];
            filesWrapped.forEach(function(element, index) {
                promiseArray.push(uploadOne(index));
            });
            return $q.all(promiseArray);
        }

        /**
         * Envia um arquivo registrado para upload no indice especificado.
         * @param  {Integer} index Indice do arquivo no array de arquivos registrados.
         * @return {Object} Promise de execução do upload.
         */
        function uploadOne(index) {
            var defered = $q.defer();
            var fileWrap = filesWrapped[index];
            if (canUploadFile(fileWrap)) {
                authorizeAndSend(fileWrap, defered);
            } else {
                defered.resolve({
                    file: fileWrap
                });
            }
            return defered.promise;
        }

        /**
         * Retorna todos os arquivos registrados.
         * @return {Array} Array de arquivos registrados.
         */
        function getFiles() {
            return filesWrapped;
        }

        /**
         * Altera a url de autorização de upload de arquivos.
         * @param {String} path URL de autorização de arquivos.
         */
        function setAuthUrl(path) {
            angular.extend(defaults, {
                authUrl: path
            });
        }

        /**
         * Define uma função que vai resolver a URL de autorização para determinado arquivo.
         * @param {Function} resolverFn Função que irá receber o arquivo que precisa ser autorizado e deve retornar a URL para tal.
         */
        function setAuthUrlResolver(resolverFn) {
            angular.extend(defaults, {
                authUrlResolver: resolverFn
            });
        }

        /**
         * Define uma função que vai resolver os parâmetros da requisição de autorização para determinado arquivo.
         * @param {Function} resolverFn Função que irá receber o arquivo que precisa ser autorizado e deve retornar os parâmetros da requisição.
         */
        function setAuthRequestParametersResolver(resolverFn) {
            angular.extend(defaults, {
                authRequestParametersResolver: resolverFn
            });
        }

        /**
         * Define uma função que vai resolver os parâmetros do response de autorização para determinado arquivo.
         * @param {Function} resolverFn Função que irá receber o arquivo que foi autorizado e deve ter seu response manipulado.
         */
        function setAuthResponseParametersResolver(resolverFn) {
            angular.extend(defaults, {
                authResponseParametersResolver: resolverFn
            });
        }

        /**
         * Define um listener que será executado sempre que um arquivo for enviado com sucesso.
         * @param {Function} resolverFn Função que irá receber o arquivo que foi enviado.
         */
        function setOnUploadedListener(resolverFn) {
            angular.extend(defaults, {
                onUploadedListener: resolverFn
            });
        }

        /**
         * Autoriza e envia o arquivo especificado.
         * @param  {[type]} fileWrap    Arquivo a ser autorizado e enviado.
         * @param  {[type]} defered     Promise de execução da autorização e do upload.
         * @TODO Possibilidade de passar parâmetros no momento de autorizar.
         */
        function authorizeAndSend(fileWrap, defered) {
            fileWrap.status = FILE_STATUS.AUTHORIZING;
            $http.post(
                    defaults.authUrlResolver ? defaults.authUrlResolver(fileWrap) : defaults.authUrl,
                    defaults.authRequestParametersResolver ? defaults.authRequestParametersResolver(fileWrap) : {})
                .then(function(response) {

                    fileWrap.status = FILE_STATUS.AUTHORIZED;
                    fileWrap.authorization = response.data.authorization;
                    fileWrap.params = response.data.params;
                    fileWrap.uploadUrl = response.data.url;

                    if (defaults.authResponseParametersResolver) {
                        defaults.authResponseParametersResolver(response, fileWrap);
                    }

                    sendFile(fileWrap, defered);
                })
                .catch(function(response) {
                    fileWrap.status = FILE_STATUS.AUTHORIZE_ERROR;
                    fileWrap.errorAuth = response.data ? response.data.error : null;
                    defered.resolve({
                        response: response,
                        file: fileWrap
                    });
                });
        }

        /**
         * Envia o arquivo especificado.
         * @param  {Object} fileWrap Arquivo autorizado a ser enviado.
         * @param  {Object} defered  Promise de execução da autorização e do upload.
         * @return {Object}          Promise do upload.
         */
        function sendFile(fileWrap, defered) {

            var file = fileWrap.original;
            var params = fileWrap.params;
            var authorization = fileWrap.authorization;
            var uploadUrl = fileWrap.uploadUrl;

            var uploadEvent = Upload.upload({
                url: uploadUrl,
                data: {
                    'file': file,
                    'authorization': authorization,
                    'params': params
                },
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            uploadEvent.then(function(response) {
                fileWrap.status = FILE_STATUS.UPLOADED;
                if (defaults.onUploadedListener) {
                    defaults.onUploadedListener(fileWrap);
                }
                defered.resolve({
                    response: response,
                    file: fileWrap
                });
            }, function(response) {
                if (fileWrap.status != FILE_STATUS.CANCELED) {
                    fileWrap.status = FILE_STATUS.UPLOAD_ERROR;
                    defered.resolve({
                        response: response,
                        file: fileWrap
                    });
                }
            }, function(evt) {
                if (fileWrap.status != FILE_STATUS.CANCELED) {
                    fileWrap.status = FILE_STATUS.UPLOADING;
                    fileWrap.sizeLoaded = evt.loaded;
                    fileWrap.sizeTotal = evt.total;
                    fileWrap.progressPercent = parseInt(100.0 * evt.loaded / evt.total);
                }
            });

            fileWrap.abortUpload = function() {
                fileWrap.status = FILE_STATUS.CANCELED;
                uploadEvent.abort();
            };
        }

        /**
         * Indica se o arquivo está em um estado apto para ser enviado.
         * @param  {Object} fileWrap Arquivo autorizado a ser enviado.
         * @return {boolean}         true caso o arquivo esteja apto, false caso contrário.
         */
        function canUploadFile(fileWrap) {
            var canSend = false;
            if (fileWrap) {
                var status = fileWrap.status;
                canSend = status == FILE_STATUS.WAITING || status == FILE_STATUS.AUTHORIZE_ERROR || status == FILE_STATUS.UPLOAD_ERROR;
            }
            return canSend;
        }

        /**
         * Gera um UUID unico. Utilizado para diferenciar cada arquivo registrado.
         * @return {String} UUID
         */
        function generateUUID() {
            var d = new Date().getTime();
            if (window.performance && typeof window.performance.now === "function") {
                d += performance.now(); //use high-precision timer if available
            }
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
            return uuid;
        }
    }
})();
