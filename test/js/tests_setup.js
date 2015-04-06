var generateDatabase = function () {
	return "scuba_test_" + Math.floor(999999 * Math.random());
};

// for eventual debuggin
var temp;

// to enable tests from everywhere
var localUrl = window.location.origin;
var pathname = window.location.pathname;
localUrl = localUrl + pathname.substr(0, pathname.lastIndexOf("/test"));

// Make window.navigator.onLine = true
// Necessary because PhantomJS always shows this as false
var fakeNavigator = {};
for (var i in navigator) {
	fakeNavigator[i] = navigator[i];
}
fakeNavigator.onLine = true;
window.navigator = fakeNavigator;