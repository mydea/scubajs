QUnit.module("POST requests");

QUnit.test("post requests are added to the queue", function (assert) {
	var done = assert.async();
	var countDone = 0;

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
				route: "http://fnovy.com/projects/scubajs/apitest.php",
				type: "post",
				data: function () {
					var data = this.findAll("users");
					return data;
				},
				action: function (options) {
					return this.rowInsert("users", options.data);
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
				url: "http://fnovy.com/projects/scubajs/apitest.php",
				type: "post",
				data: {
					"name": "test",
					"id": 11
				},
				success: function (data) {
					assert.equal(data.users.length, 6, "6 users are returned by the route success function");

					scuba.LocalDB.findAll("users").then(function (items) {
						assert.equal(items.length, 6, "6 users are found in the local database");
						if (++countDone === 2) {
							done();
							scuba.cleanUp();
						}
					});

					assert.equal(scuba.Queue.length(), 1, "1 queue entry in queue");
					if (++countDone === 2) {
						done();
						scuba.cleanUp();
					}
				}
			});
		}
	});
});

QUnit.test("default functions work", function (assert) {
	var done = assert.async();
	var countDone = 0;

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
				route: "http://fnovy.com/projects/scubajs/apitest.php",
				type: "post"
			}
		],
		onofflineready: function (e, offlineReady) {
			scuba.ajax({
				url: "http://fnovy.com/projects/scubajs/apitest.php",
				type: "post",
				data: {
					"name": "test",
					"id": 11
				},
				success: function (data) {
					assert.equal(data.length, 0, "empty array is returned (default)");
					scuba.cleanUp();
					done();
				}
			});


		}
	});
});

QUnit.test("queue is worked", function (assert) {
	var done = assert.async();
	var countDone = 0;

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
				route: "http://fnovy.com/projects/scubajs/apitest.php",
				type: "post"
			}
		],
		onofflineready: function (e, offlineReady) {

			scuba.pauseSync(true);

			scuba.ajax({
				url: "http://fnovy.com/projects/scubajs/apitest.php",
				type: "post",
				data: {
					"name": "test",
					"id": 11
				}
			});

			scuba.ajax({
				url: "http://fnovy.com/projects/scubajs/apitest.php",
				type: "post",
				data: {
					"name": "test2",
					"id": 12
				}
			});

			scuba.ajax({
				url: "http://fnovy.com/projects/scubajs/apitest.php",
				type: "post",
				data: {
					"name": "test3",
					"id": 13
				}
			});

			scuba.pauseSync(false);
		},
		onsync: function (syncInProgress) {
			if (syncInProgress) {
				assert.equal(scuba.Queue.length(), 3, "when sync begins, 3 queue entries are in the local database");
			} else {
				assert.equal(scuba.Queue.length(), 0, "queue has been worked and is empty");
				done();
			}
		}
	});
});

QUnit.test("queue errors are fired via event", function (assert) {
	var done = assert.async();
	var countDone = 0;

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
				route: "http://fnovy.com/projects/scubajs/apitest.php",
				type: "post"
			},
			{
				route: "http://fnovy.com/projects/scubajs/apitest2.php",
				type: "post"
			}
		]
	});

	scuba.onqueuestatuschange(function(e) {
		countDone++;

		if(countDone > 5) {
			assert.ok(false, "Queue should pause after ");
			done();
			return;
		}

		if(countDone === 5 && e.status === "ERROR") {
			assert.ok(true, "Queue status change with ERROR is called");
			done();
		}
	});

	scuba.onofflineready(function (e, offlineReady) {
		scuba.pauseSync(true);

		scuba.ajax({
			url: "http://fnovy.com/projects/scubajs/apitest.php",
			type: "post",
			data: {
				"name": "test",
				"id": 11
			}
		});

		scuba.ajax({
			url: "http://fnovy.com/projects/scubajs/apitest2.php",
			type: "post",
			data: {
				"name": "test2",
				"id": 12
			}
		});

		scuba.ajax({
			url: "http://fnovy.com/projects/scubajs/apitest.php",
			type: "post",
			data: {
				"name": "test3",
				"id": 13
			}
		});

		scuba.pauseSync(false);
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
			type: "post",
			data: {
				id: 99,
				firstname: "test",
				lastname: "test2"
			},
			success: function (data) {
				assert.equal(parseInt(data.id), 99, "user is inserted via the default POST /model/id function");
				done();
				scuba.cleanUp();
			}
		});
	});
});