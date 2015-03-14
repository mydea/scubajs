module.exports = function (grunt) {

	// 1. All configuration goes here 
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				mangle: false,
				banner: "/*! \n * scuba.js \n * \n * author: Francesco Novy \n * licence: MIT license \n * https://github.com/mydea/scubajs \n */\n\n"
			},
			scubajs: {
				src: 'scuba.js',
				dest: 'scuba.min.js'
			}
		},
		connect: {
			test: {
				options: {
					port: 8000,
					base: '.'
				}
			},
			server: {
				options: {
					port: 8000,
					base: '.',
					keepalive: true
				}
			}
		},
		qunit: {
			all: {
				options: {
					urls: [
						'http://localhost:8000/test/index.html',
					],
					timeout: 10000,
					'--ignore-ssl-errors': true,
					'--max-disk-cache-size': 200000,
					'--load-images': false,
					'--local-to-remote-url-access': true,
					'--ssl-protocol': 'any',
					'--cookies-file': 'test/temp/cookies.txt',
					'--web-security': false,
					"--local-storage-path": "test/temp/cache",
					'--local-storage-quota': "10000000"
				}
			}
		},

		jshint: {
			options: {
				curly: true,
				eqeqeq: true,
				eqnull: true,
				browser: true,
				loopfunc: true,
				globals: {
					jQuery: true,
					"$": true
				}
			},
			files: ['scuba.js']
		}

	});

	// 3. Where we tell Grunt we plan to use this plug-in.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	// 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
	grunt.registerTask('default', ["uglify"]);

	grunt.registerTask("build", [
		"connect:test",
		"jshint",
		"qunit:all",
		"uglify"
	]);

	grunt.registerTask("test", [
		"connect:test",
		"jshint",
		"qunit:all"
	]);

	grunt.registerTask("serve", [
		"connect:server"
	]);

};