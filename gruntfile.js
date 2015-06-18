module.exports = function (grunt) {

	// 1. All configuration goes here 
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				mangle: false,
				stripBanners: true,
				banner: '/*!\t\n * <%= pkg.title || pkg.name %>' +
				'\t\n * v<%= pkg.version %>' +
				'\t\n * <%= grunt.template.today("yyyy-mm-dd") %>' +
				'\t\n * <%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
				'\t\n * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>' +
				'\t\n * Licensed <%= pkg.license %> \t\n */\t\n\t\n'
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
			files: ['src/*.js']
		},

		yuidoc: {
			dist: {
				name: '<%= pkg.name %>',
				description: '<%= pkg.description %>',
				version: '<%= pkg.version %>',
				url: '<%= pkg.homepage %>',
				options: {
					paths: ['./src'],
					"themedir": "node_modules/yuidoc-bootstrap-theme",
					"helpers": ["node_modules/yuidoc-bootstrap-theme/helpers/helpers.js"],
					outdir: 'docs/'
				}
			}
		},
		concat: {
			options: {
				stripBanners: true,
				banner: '/*!\t\n * <%= pkg.title || pkg.name %>' +
				'\t\n * v<%= pkg.version %>' +
				'\t\n * <%= grunt.template.today("yyyy-mm-dd") %>' +
				'\t\n * <%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
				'\t\n * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>' +
				'\t\n * Licensed <%= pkg.license %> \t\n */' +
				'\t\n\t\n(function ($, indexedDB) {\t\n\t\n',
				footer: "\t\n}(jQuery, window.indexedDB));"
			},
			dist: {
				src: ['src/Queue.js', 'src/LocalDB.js', 'src/Scuba.js'],
				dest: 'scuba.js'
			}
		}

	});

	// 3. Where we tell Grunt we plan to use this plug-in.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-yuidoc');
	grunt.loadNpmTasks('grunt-contrib-concat');

	// 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
	grunt.registerTask('default', ["build"]);

	grunt.registerTask("build", [
		"concat:dist",
		"connect:test",
		"jshint",
		"qunit:all",
		"uglify",
		"yuidoc:dist"
	]);

	grunt.registerTask("test", [
		"concat:dist",
		"connect:test",
		"jshint",
		"qunit:all"
	]);

	grunt.registerTask("serve", [
		"connect:server"
	]);

};