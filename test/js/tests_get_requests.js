QUnit.module("GET requests");

QUnit.test("get request are redirected to local db", function (assert) {
	var done = assert.async();

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: ""+localUrl+"/test/api/users.json"
			}
		],
		routes: [
			{
				route: ""+localUrl+"/test/api/users.json",
				type: "get",
				data: function () {
					var data = this.findAll("users");
					return data;
				},
				format: function (data) {
					return {
						meta: {},
						users: data
					}
				}
			}
		],
		onofflineready: function (e, offlineReady) {
			scuba.ajax({
				url: ""+localUrl+"/test/api/users.json",
				type: "get",
				success: function (data) {
					assert.equal(data.users.length, 5, "5 users are returned by the route success function");

					scuba.LocalDB.findAll("users").then(function (items) {
						assert.equal(items.length, 5, "5 users are found in the local database");
						done();
						scuba.cleanUp();
					});
				}
			});

		}
	});
});

QUnit.test("path segments are parsed correctly", function (assert) {
	var done = assert.async();

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: ""+localUrl+"/test/api/users.json"
			}
		],
		routes: [
			{
				route: ""+localUrl+"/test/api/users/!!",
				type: "get",
				data: function (options, param1) {
					var data = this.findById("users", param1);
					return data;
				},
				format: function (data) {
					return {
						meta: {},
						users: data
					}
				}
			}
		],
		onofflineready: function (e, offlineReady) {

			scuba.ajax({
				url: ""+localUrl+"/test/api/users/1",
				type: "get",
				success: function (data) {
					assert.ok(data.users, "an object is returned by the route success function");
					done();
					scuba.cleanUp();
				}
			});

		}
	});
});

QUnit.test("default routes are inserted correctly", function (assert) {
	var done = assert.async();
	var countDone = 0;

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: ""+localUrl+"/test/api/tasks_users.json"
			}
		],
		apiBaseUrl: localUrl+"/test/api",
		includeDefaultRoutes: true
	});

	scuba.onofflineready(function() {
		scuba.ajax({
			url: ""+localUrl+"/test/api/users",
			type: "get",
			success: function (data) {
				assert.equal(data.length, 5, "5 users are returned by the default GET /model function");

				if(++countDone == 2) {
					done();
					scuba.cleanUp();
				}
			}
		});

		scuba.ajax({
			url: ""+localUrl+"/test/api/users/1",
			type: "get",
			success: function (data) {
				assert.equal(typeof data, "object", "an object is returned by the default GET /model/id function");
				assert.equal(data.id, "1",  "the right object is returned by the default GET /model/id function");

				if(++countDone == 2) {
					done();
					scuba.cleanUp();
				}
			}
		});
	});
});

QUnit.test("Hosts are matched correctly", function (assert) {
	var done = assert.async();
	var countDone = 0;

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: ""+localUrl+"/test/api/users.json"
			}
		],
		apiBaseUrl: "http://testapi.com/test/api",
		routes: [
			{
				route: "/users",
				type: "get",
				data: function () {
					var data = this.findAll("users");
					return data;
				}
			},
			{
				route: "http://testapi.com/test/api/users",
				type: "get",
				data: function () {
					var data = this.findAll("users");
					return data;
				}
			}
		]
	});

	scuba.onofflineready(function() {
		scuba.ajax({
			url: "/users",
			type: "get",
			success: function (data) {
				assert.equal(data.length, 5, "5 users are returned when route AND $.ajax() lack a host");

				if(++countDone == 3) {
					done();
					scuba.cleanUp();
				}
			}
		});

		scuba.ajax({
			url: "http://testapi.com/test/api/users",
			type: "get",
			success: function (data) {
				assert.equal(data.length, 5, "5 users are returned when only the route lacks a host");

				if(++countDone == 3) {
					done();
					scuba.cleanUp();
				}
			}
		});

		scuba.ajax({
			url: "/users",
			type: "get",
			success: function (data) {
				assert.equal(data.length, 5, "5 users are returned when only $.ajax() lacks a host");

				if(++countDone == 3) {
					done();
					scuba.cleanUp();
				}
			}
		});
	});
});

QUnit.test("Get parameters are parsed correctly", function (assert) {
	var done = assert.async();
	var countDone = 0;

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: ""+localUrl+"/test/api/users.json"
			}
		],
		routes: [
			{
				route: ""+localUrl+"/test/api/users",
				type: "get",
				data: function (options) {
					var searchOptions = {
						gender: options.getParams.gender
					};
					
					var data = this.findByAttributes("users", searchOptions);
					return data;
				}
			}
		]
	});

	scuba.onofflineready(function() {
		scuba.ajax({
			url: ""+localUrl+"/test/api/users?gender=1&admin",
			type: "get",
			success: function (data) {
				assert.equal(data.length, 2, "2 users are returned via GET parameters");

				if(++countDone == 2) {
					done();
					scuba.cleanUp();
				}
			}
		});

		scuba.ajax({
			url: ""+localUrl+"/test/api/users?admin=2",
			data: {
				gender: 1
			},
			type: "get",
			success: function (data) {
				assert.equal(data.length, 2, "2 users are returned via GET parameter transferred via the data field");

				if(++countDone == 2) {
					done();
					scuba.cleanUp();
				}
			}
		});
	});

});

QUnit.test("The jqXHR-object can be manipulated", function (assert) {
	var done = assert.async();
	var countDone = 0;

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: ""+localUrl+"/test/api/users.json"
			}
		],
		routes: [
			{
				route: ""+localUrl+"/test/api/users",
				type: "get",
				data: function (options) {
					// If invalid gender, throw error
					if(options.getParams.gender > 1) {
						options.jqXHR.status = 400;
						var deferred = $.Deferred();
						deferred.reject({
							errors: [
								"Invalid Gender"
							]
						});

						return deferred.promise();
					}

					var data = this.findAll("users");
					return data;
				}
			}
		]
	});

	scuba.onofflineready(function() {
		scuba.ajax({
			url: ""+localUrl+"/test/api/users?gender=3&admin",
			type: "get",
			complete: function (jqXHR) {
				assert.equal(jqXHR.status, 400, "The jqXHR-Status code must be 400");
				assert.equal(jqXHR.responseJSON.errors.length, 1, "jqXHR.responseJSON should contain an array with one item");

				if(++countDone == 1) {
					done();
					scuba.cleanUp();
				}
			}
		});
	});

});