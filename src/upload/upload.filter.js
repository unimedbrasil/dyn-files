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
