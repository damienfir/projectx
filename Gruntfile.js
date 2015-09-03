module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    "babel": {
      options: {
        sourceMap: true
      },
      dist: {
        files: {
          "dist/app.js": "src/app.js"
        }
      }
    },
    browserify: {
      options: {

      }
    }
    uglify: {
      dist: {
        files: {
          'app/public/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['concat']);
};
