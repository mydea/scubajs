/**
 * The Queue object
 * @class Queue
 * @param {String} selector The selector for an element.
 * @param {String} [context] The context for the search.
 */
var QueueClass = (function () {
	var items = [];
	var namespace = "scuba_queue";
	var errorCount = 0;

	/**
	 * Save queue to LocalStorage
	 * @private
	 */
	var _save = function () {
		window.localStorage.setItem(namespace, JSON.stringify(items));
	};

	/**
	 * Load the queue from LocalStorage and initialise it
	 * @private
	 */
	var _load = function () {
		var ls = window.localStorage.getItem(namespace);
		items = JSON.parse(ls) || [];
	};

	var queueError = function (err) {
		if (typeof err === "undefined") {
			errorCount++;
		} else {
			errorCount = parseInt(err);
		}

		return errorCount;
	};

	var hasError = function () {
		return errorCount >= 3;
	};

	/**
	 * Adds a new element to the queue
	 * @method enqueue
	 * @param {Object} item The item to add to the queue
	 */
	var enqueue = function (item) {
		items.push(item);
		_save();
	};

	/**
	 * Returns the first queue item and removes it from the queue
	 * @method dequeue
	 * @returns {Object} The first queue item
	 */
	var dequeue = function () {
		var item = items.shift();
		_save();

		return item;
	};

	/**
	 * Returns the queue length
	 * @method length
	 * @returns {Number} The number of items in the queue
	 */
	var length = function () {
		return items.length;
	};

	/**
	 * Returns the first queue element or null if queue is empty
	 * @method first
	 * @returns {Object} The first queue item
	 */
	var first = function () {
		return items[0] || null;
	};

	/**
	 * Returns the last queue element or null if queue is empty
	 * @method last
	 * @returns {Object}  The last queue item
	 */
	var last = function () {
		return items[items.length - 1] || null;
	};

	/**
	 * Returns the whole queue
	 * @method getQueue
	 * @returns {Array} Array of queue items
	 */
	var getQueue = function () {
		return items;
	};

	/**
	 * Clear all entries from the queue
	 * @method clearQueue
	 */
	var clearQueue = function () {
		items = [];
		errorCount = 0;
		_save();
	};

	var init = function (namespaceSet) {
		if (typeof namespaceSet === "undefined") {
			namespaceSet = "scuba_queue";
		}

		namespace = namespaceSet;
		_load();
	};

	return {
		enqueue: enqueue,
		dequeue: dequeue,
		length: length,
		first: first,
		last: last,
		init: init,
		getQueue: getQueue,
		queueError: queueError,
		hasError: hasError,
		clearQueue: clearQueue
	};
});