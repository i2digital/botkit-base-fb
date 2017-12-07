const gulp = require('gulp');
const $ = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'run-sequence']
});

gulp.task('lint', () =>
  gulp.src('src/*.js')
    .pipe($.eslint())
    .pipe($.eslint.format())
);

gulp.task('concat', () =>
  gulp.src('src/*.js')
    .pipe($.concat('botkit-fb-bootstrap.js'))
    .pipe(gulp.dest('./dist/'))
);

gulp.task('watch', () => gulp.watch('src/**', ['lint', 'concat']));

gulp.task('build', ['lint', 'concat']);

gulp.task('default', ['lint', 'watch']);