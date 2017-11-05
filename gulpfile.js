const gulp = require('gulp');
const $ = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'run-sequence']
});

gulp.task('lint', () =>
  gulp.src('index.js')
    .pipe($.eslint())
    .pipe($.eslint.format())
);

gulp.task('watch', () => gulp.watch('index.js', ['lint']));

gulp.task('default', ['lint', 'watch']);