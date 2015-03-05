QUnit.module("Local DB");

QUnit.test("findAll() works", function (assert) {
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

QUnit.test("findById() works", function (assert) {
	var done = assert.async();

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: "http://localhost:8000/test/api/users.json"
			}
		],
		onofflineready: function () {
			scuba.LocalDB.findById("users", 1).then(function (item) {
				assert.ok(item, "a user is found in the local database");
				done();
				scuba.cleanUp();
			});
		}
	});
});

QUnit.test("findByAttributes() works", function (assert) {
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
			scuba.LocalDB.findByAttributes("users", {
				is_admin: true,
				gender: 0
			}).then(function (items) {
				assert.equal(items.length, 2, "two users are found in the local database for the specified attributes");
				done();
				scuba.cleanUp();
			});
		}
	});
});

QUnit.test("findCustom() works", function (assert) {
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
			scuba.LocalDB.findCustom("users", function (item) {
				return item.birthday === "1980-01-01" || item.birthday === "1991-12-03";
			}).then(function (items) {
				assert.equal(items.length, 2, "two users are found in the local database for the specified custom function");
				done();
				scuba.cleanUp();
			});
		}
	});
});

QUnit.test("findById() returns null if nothing is found", function (assert) {
	var done = assert.async();

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: "http://localhost:8000/test/api/users.json"
			}
		],
		onofflineready: function () {
			scuba.LocalDB.findById("users", 999).then(function (item) {
				assert.equal(item, null, "null is returned");
				done();
				scuba.cleanUp();
			});
		}
	});
});

QUnit.test("findAll, findCustom, findByAttributes return [] if nothing is found", function (assert) {
	var done = assert.async();
	var countDone = 0;

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true,
		downSyncRoutes: [
			{
				url: "http://localhost:8000/test/api/users_empty.json"
			}
		],
		onofflineready: function (e, offlineReady) {
			scuba.LocalDB.findAll("users").then(function (items) {
				assert.equal(items.length, 0, "empty array is returned for findAll");

				countDone++;
				if (countDone === 3) {
					done();
					scuba.cleanUp();
				}
			});

			scuba.LocalDB.findByAttributes("users", {}).then(function (items) {
				assert.equal(items.length, 0, "empty array is returned for findByAttributes");

				countDone++;
				if (countDone === 3) {
					done();
					scuba.cleanUp();
				}
			});

			scuba.LocalDB.findCustom("users", function () {
				return true;
			}).then(function (items) {
				assert.equal(items.length, 0, "empty array is returned for findCustom");

				countDone++;
				if (countDone === 3) {
					done();
					scuba.cleanUp();
				}
			});
		}
	});
});

QUnit.test("rowInsert() works", function (assert) {
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
		onofflineready: function (e, offlineReady) {
			scuba.LocalDB.rowInsert(
				"users",
				{
					id: 99,
					firstname: "Firstname",
					lastname: "Lastname"
				},
				true).then(function (item) {
					assert.ok(item, "object is returned from rowInsert()");
					assert.equal(item.firstname, "Firstname", "firstname from returned object equals Firstname");

					scuba.LocalDB.findById("users", 99).then(function (item) {
						assert.ok(item, "inserted object is found in local db");
						assert.equal(item.firstname, "Firstname", "firstname from local db equals Firstname");

						countDone++;
						if (countDone === 3) {
							done();
							scuba.cleanUp();
						}
					});
				});

			scuba.LocalDB.rowInsert(
				"users",
				{
					id: 1,
					firstname: "Firstname2",
					lastname: "Lastname2"
				},
				true).then(function (item) {
					assert.ok(!item, "existing item cannot be inserted");

					scuba.LocalDB.findById("users", 1).then(function (item) {
						assert.equal(item.firstname, "John", "attribute is not overwritten when trying to insert existing row");

						countDone++;
						if (countDone === 3) {
							done();
							scuba.cleanUp();
						}
					});
				});

			scuba.LocalDB.rowInsert(
				"users",
				{
					id: 2,
					firstname: "Firstname2",
					lastname: "Lastname2"
				},
				false).then(function (item) {
					assert.ok(item, "existing item are overwritten when checkIfExists is set to false");

					scuba.LocalDB.findById("users", 2).then(function (item) {
						assert.equal(item.firstname, "Firstname2", "attribute is overwritten when trying to insert existing row without checkIfExists");

						countDone++;
						if (countDone === 3) {
							done();
							scuba.cleanUp();
						}
					});
				});
		}
	});
});

QUnit.test("rowDelete() works", function (assert) {
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
		onofflineready: function (e, offlineReady) {
			scuba.LocalDB.rowDelete("users", 1).then(function () {
				scuba.LocalDB.findAll("users").then(function (items) {
					assert.equal(items.length, 4, "4 items left after delete");

					countDone++;
					if (countDone === 2) {
						done();
						scuba.cleanUp();
					}
				});
			});

			scuba.LocalDB.rowDelete("users", 99).then(function (success) {
				assert.ok(!success, "promise returns false if row does not exists");

				countDone++;
				if (countDone === 2) {
					done();
					scuba.cleanUp();
				}
			});
		}
	});
});

QUnit.test("rowUpdate() works", function (assert) {
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
		onofflineready: function (e, offlineReady) {
			scuba.LocalDB.rowUpdate("users", 1, {
				id: 1,
				firstname: "Firstname",
				lastname: "Lastname"
			}).then(function (item) {
				assert.ok(item, "object is returned from rowUpdate()");
				assert.equal(item.firstname, "Firstname", "firstname from returned object equals Firstname");

				scuba.LocalDB.findById("users", 1).then(function (item) {
					assert.ok(item, "inserted object is found in local db");
					assert.equal(item.firstname, "Firstname", "firstname from local db equals Firstname");

					countDone++;
					if (countDone === 2) {
						done();
						scuba.cleanUp();
					}
				});
			});

			scuba.LocalDB.rowUpdate("users", 99, {
				id: 99,
				firstname: "Firstname2",
				lastname: "Lastname2"
			}).then(function (item) {
				assert.ok(!item, "cannot update non-existing row");

				countDone++;
				if (countDone === 2) {
					done();
					scuba.cleanUp();
				}
			});
		}
	});
});
