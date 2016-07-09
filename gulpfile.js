var gulp = require('gulp');
var wiredep = require('wiredep').stream;
var sass = require('gulp-sass');
// var flatten = require('gulp-flatten'); not used currently since no copy
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var cssnano = require('gulp-cssnano');
var nunjucksRender = require('gulp-nunjucks-render');
var data = require('gulp-data');
var fs = require('fs');
var path = require('path');

gulp.task('build', ['aplayer-css', 'aplayer-js', 'nunjucks', 'sass', 'copy-js', 'css-future', 'cssnano']);

gulp.task('icons', function() { 
    return gulp.src('bower_components/font-awesome/fonts/**.*') 
        .pipe(gulp.dest('./shared/fonts')); 
});

gulp.task('nunjucks', function() {
  return gulp.src('shared/pages/*.njk')
  .pipe(nunjucksRender({
    path: ['shared/partials']
  }))
  .on('error', sass.logError)
  .pipe(gulp.dest('build/'))
});

gulp.task('aplayer-css', function() {
  return gulp.src('APlayer_fork/src/*.scss')
  .pipe(sass())
  .on('error', sass.logError)
  .pipe(gulp.dest('build/css'))
});

gulp.task('aplayer-js', function() {
  gulp.src('APlayer_fork/src/*.js')
  .on('error', sass.logError)
  .pipe(gulp.dest('build/js'));
});

gulp.task('sass', function() {
  return gulp.src('shared/scss/*.scss')
  .pipe(sass({
      includePaths: ['bower_components/bootstrap-sass/assets/stylesheets']
  }))
  .on('error', sass.logError)
  .pipe(gulp.dest('build/css'))
});

gulp.task('copy-js', ['sass'], function() {
  gulp.src('shared/js/*')
  .on('error', sass.logError)
  .pipe(gulp.dest('build/js'));
});

gulp.task('css-future', ['copy-js'], function() {
  var processors = [
    autoprefixer({
      browsers: ['last 5 versions', 'Firefox >= 3.5', 'iOS >= 4', 'Android >= 2.3']
    })
  ];
  return gulp.src('build/css/*.css')
  .pipe(postcss(processors))
  .pipe(gulp.dest('build/css'));
});

gulp.task('cssnano', ['css-future'], function() {
  return gulp.src('build/css/*.css')
  .pipe(cssnano())
  .pipe(gulp.dest('build/css'));
});

// watch
gulp.task('watch', function() {
  gulp.watch('./shared/scss/**/*.scss', ['sass']);
  gulp.watch('./shared/**/*.+(html|njk)', ['nunjucks']);
  gulp.watch('./APlayer_fork/src/*.scss', ['aplayer-css']);
  gulp.watch('./APlayer_fork/src/*.js', ['aplayer-js']);

});
