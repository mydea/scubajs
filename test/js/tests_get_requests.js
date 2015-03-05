QUnit.module("GET requests");

QUnit.test("get request are redirected to local db", function (assert) {
	var done = assert.async();

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: "http://localhost:8000/test/api/users.json"
			}
		],
		routes: [
			{
				route: "http://localhost:8000/test/api/users.json",
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
				url: "http://localhost:8000/test/api/users.json",
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
				url: "http://localhost:8000/test/api/users.json"
			}
		],
		routes: [
			{
				route: "http://localhost:8000/test/api/users/!!",
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
				url: "http://localhost:8000/test/api/users/1",
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
				url: "http://localhost:8000/test/api/tasks_users.json"
			}
		],
		apiBaseUrl: "http://localhsot:8000/test/api",
		includeDefaultRoutes: true
	});

	scuba.onofflineready(function() {
		scuba.ajax({
			url: "http://localhost:8000/test/api/users",
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
			url: "http://localhost:8000/test/api/users/1",
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