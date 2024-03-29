module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // uglify: {
    //   dist: {
    //     files: {
    //       'app/public/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
    //     }
    //   }
    // },
    browserify: {
      options: {
        transform: ['babelify'],
        // watchifyOptions: {
        //   '--extension': '.jsx'
        // },
        // watchifyOptions: {
        debug: true,
        // browserifyOptions: {
        //   debug: true
        // }
        // watch: true,
        // keepAlive: true
        // }
      },
      dev: {
        src: './app/assets/js/main.js',
        dest: './public/js/bundle.js'
      }
    },
    // extract_sourcemap: {
    //   options: { 'removeSourcesContent': true },
    //   files: {
    //     'public/build': ['public/js/bundle.js'],
    //   },
    // },
    // less: {
    //   bootstrap: {
    //     src: "app/assets/less/custom-bootstrap.less",
    //     dest: "public/css/custom-bootstrap.css"
    //   }
    // },
    watch: {
      // bootstrap: {
      //   files: ['app/assets/less/*.less'],
      //   tasks: ['less']
      // },
      js: {
        files: ['app/assets/js/**/*.js'],
        // tasks: ['js']
        tasks: ['browserify']
      }
    }
  });

  // grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');
  // grunt.loadNpmTasks('grunt-contrib-less');
  // grunt.loadNpmTasks('grunt-extract-sourcemap');

  // grunt.registerTask('js', ['browserify', 'extract_sourcemap']);
  // grunt.registerTask('dev', ['browserify', 'watch']);

  grunt.registerTask('default', ['browserify']);
};
