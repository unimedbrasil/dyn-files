// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var karma = require('karma').Server;
var path = require('path');
var merge = require('merge-stream');

var config = {
    source: 'src',
    targetPath: 'dist',
    prefix: 'dyn-files-',
    modules: ['upload', 'ged']
};

// Lint Task
gulp.task('lint', function() {
    return gulp.src(config.source + '/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Concatenate & Minify JS
gulp.task('scripts', function() {
    var tasks = config.modules.map(function(module) {
        var targetName = config.prefix + module;
        return gulp.src([
                path.join(config.source, module, '/*.module.js'),
                path.join(config.source, module, '/*.js')
            ])
            .pipe(concat(targetName + '.js'))
            .pipe(gulp.dest(config.targetPath))
            .pipe(rename(targetName + '.min.js'))
            .pipe(uglify())
            .pipe(gulp.dest(config.targetPath));
    });
    return merge(tasks);
});

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('/*.js', ['lint', 'scripts']);
});

// gulp.task('test', ['scripts'], function (done) {
//     karma.start({
//         configFile: __dirname + '/karma.conf.js',
//         singleRun: true
//     }, function() {
//         done();
//     });
// });

// Default Task
gulp.task('default', ['build']);

// Build Task
gulp.task('build', ['lint', 'scripts']);
