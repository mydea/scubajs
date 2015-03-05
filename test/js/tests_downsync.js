QUnit.module("Down Sync");
QUnit.test("scuba can download and save data", function (assert) {
	var done = assert.async();

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: "http://localhost:8000/test/api/users.json",
				success: function (data) {
					delete data.meta;
					return data;
				}
			}
		],
		onofflineready: function (e, offlineReady) {
			scuba.LocalDB.findAll("users").then(function (items) {
				assert.equal(items.length, 5, "5 users are found in the local database");
				done();
				scuba.cleanUp();
			});

		}
	});
});

QUnit.test("scuba can use multiple downsync routes", function (assert) {
	var done = assert.async();
	var countDone = 0;

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: "http://localhost:8000/test/api/users.json",
				success: function (data) {
					delete data.meta;
					return data;
				}
			},
			{
				url: "http://localhost:8000/test/api/tasks.json",
				success: function (data) {
					delete data.meta;
					return data;
				}
			}
		],
		onofflineready: function (e, offlineReady) {
			scuba.LocalDB.findAll("users").then(function (items) {
				assert.equal(items.length, 5, "5 users are found in the local database");
				countDone++;
				if (countDone === 2) {
					done();
					scuba.cleanUp();
				}
			});

			scuba.LocalDB.findAll("tasks").then(function (items) {
				assert.equal(items.length, 7, "7 tasks are found in the local database");
				countDone++;
				if (countDone === 2) {
					done();
					scuba.cleanUp();
				}
			});
		}
	});
});

QUnit.test("down sync uses default parsing function when none is set", function (assert) {
	var done = assert.async();

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: "http://localhost:8000/test/api/users.json"
			}
		],
		onofflineready: function (e, offlineReady) {
			scuba.LocalDB.findAll("users").then(function (items) {
				assert.equal(items.length, 5, "5 users are found in the local database");
				done();
				scuba.cleanUp();
			});
		}
	});
});


QUnit.test("down sync can use multiple models per route", function (assert) {
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
		onofflineready: function (e, offlineReady) {
			scuba.LocalDB.findAll("users").then(function (items) {
				assert.equal(items.length, 5, "5 users are found in the local database");
				countDone++;
				if (countDone === 2) {
					done();
					scuba.cleanUp();
				}
			});

			scuba.LocalDB.findAll("tasks").then(function (items) {
				assert.equal(items.length, 7, "7 tasks are found in the local database");
				countDone++;
				if (countDone === 2) {
					done();
					scuba.cleanUp();
				}
			});

		}
	});
});

QUnit.test("down sync can merge a model from multiple route", function (assert) {
	var done = assert.async();

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: "http://localhost:8000/test/api/users.json"
			},
			{
				url: "http://localhost:8000/test/api/users_2.json"
			}
		]
	});

	scuba.onofflineready(function(e, offlineReady) {
		scuba.LocalDB.findAll("users").then(function (items) {
			assert.equal(items.length, 7, "7 users are found in the local database");
			done();
			scuba.cleanUp();
		});
	});
});