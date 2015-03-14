QUnit.module("Basic functionality");
QUnit.test("scuba can be run", function (assert) {
	var done = assert.async();

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true
	});

	assert.ok(scuba, "$.scuba() should return an object");

	scuba.onofflineready(function (offlineReady) {
		var clean = scuba.cleanUp();

		clean.always(function() {
			assert.ok(true, "can clean up with cleanUp()");
			done();
		});
	});
});

QUnit.test("scuba emits events", function (assert) {
	var done = assert.async();

	var scuba = $.scuba({
		namespace: generateDatabase(),
		noConflict: true
	});

	scuba.onofflineready(function (offlineReady) {
		assert.ok(offlineReady, "offlineready event should be called and param should be true");
		scuba.cleanUp().then(function() {
			done();
		});
	});
});

