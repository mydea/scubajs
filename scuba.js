/*!	
 * scuba.js	
 * v0.2.0	
 * 2015-06-18	
 * 	
 * Copyright (c) 2015 Francesco Novy	
 * Licensed MIT 	
 */	
	
(function ($, indexedDB) {	
	
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
var LocalDBClass = (function (databaseIsReadyFunction) {
	var db = null;
	var dbName = "scuba";
	var databaseIsReady = false;

	/**
	 * Returns all entries of a table
	 *
	 * @method findAll
	 * @param {String} table The tablename
	 * @return {Array} List of entries
	 */
	var findAll = function (table) {
		if (!databaseIsReady) {
			return false;
		}

		var trans = db.transaction([table], "readonly");
		var store = trans.objectStore(table);

		// Get everything in the store;
		var keyRange = IDBKeyRange.lowerBound(0);
		var request = store.openCursor(keyRange);
		var deferred = new $.Deferred();
		var resultCache = [];

		request.onsuccess = function (e) {
			var result = e.target.result;
			if (!result) {
				// finished
				deferred.resolve(resultCache);
				resultCache = null;
				return;
			}

			resultCache.push(result.value);
			result.continue();
		};

		request.onerror = function () {
			deferred.reject("an error occured when trying to load all entries of table " + table);
		};

		return deferred.promise();
	};

	/**
	 * Returns a single entry by its id
	 *
	 * @method findById
	 * @param {String} table The tablename
	 * @param {String} id The id to search for. This is type-sensitive, so if your IDs are numbers, make sure to convert this to an integer, findById("table", "1") will throw an error!
	 * @returns {Object} A single entry
	 */
	var findById = function (table, id) {
		if (!databaseIsReady) {
			return false;
		}

		id = "" + id;

		var trans = db.transaction([table], "readonly");
		var store = trans.objectStore(table);

		// Get everything in the store;
		var request = store.get(id);
		var deferred = new $.Deferred();

		request.onsuccess = function (e) {
			var result = e.target.result;
			deferred.resolve(result || null);
		};

		request.onerror = function () {
			deferred.reject("an error occured when trying to load the entries of table " + table + " with the id " + id);
		};

		return deferred.promise();
	};

	/**
	 * Returns a list of entries of a table with matching attributes
	 *
	 * @method findByAttributes
	 * @param {String} table The tablename
	 * @param {Object} attrs The attributes to match by AND
	 * @returns {Array} List of matching entries
	 */
	var findByAttributes = function (table, attrs) {
		if (!databaseIsReady) {
			return false;
		}

		var deferred = new $.Deferred();

		// Get all data from table and then sort it via JS
		// this is neccessary because IndexedDB does not provide a real WHERE clause
		findAll(table).then(function (data) {

			var filterFunction = function (searchAttribute, itemAttribute) {
				if ($.isArray(itemAttribute)) {
					// If item[i] is array, search in array
					if (itemAttribute.indexOf(searchAttribute) <= -1) {
						return false;
					}
				} else if (typeof searchAttribute === "string" || typeof itemAttribute === "string") {
					if (("" + searchAttribute).toLowerCase() !== ("" + itemAttribute).toLowerCase()) {
						return false;
					}
				} else {
					if (searchAttribute !== itemAttribute) {
						return false;
					}
				}

				return true;
			};


			var filteredData = $.grep(data, function (item) {
				var i, j, found = false;
				for (i in attrs) {
					found = false;
					// if attrs[i] is an array, one of the array elements has to match
					if ($.isArray(attrs[i])) {
						for (j = 0; j < attrs[i].length; j++) {
							if (filterFunction(attrs[i][j], item[i])) {
								found = true;
							}
						}
						if (!found) {
							return false;
						}
					} else {
						if (!filterFunction(attrs[i], item[i])) {
							return false;
						}
					}
				}
				return true;
			});

			deferred.resolve(filteredData);
		});

		return deferred.promise();
	};

	/**
	 * Returns a list of entries of a table filtered by a custom method
	 * This is just a shorthand for custom filtering.
	 * It calls all(table) and filters through the
	 *
	 * @method findCustom
	 * @param {String} table The tablename
	 * @param {Object} attrs The attributes to match by AND
	 * @returns {Array} List of matching entries
	 */
	var findCustom = function (table, func) {
		if (!databaseIsReady) {
			return false;
		}

		var deferred = new $.Deferred();

		// Get all data from table and then sort it via JS
		// this is neccessary because IndexedDB does not provide a real WHERE clause
		findAll(table).then(function (data) {
			var filteredData = $.grep(data, function (item) {
				return func(item);
			});

			deferred.resolve(filteredData);
		});

		return deferred.promise();
	};

	/**
	 * Insert a new entry into a table
	 *
	 * @method rowInsert
	 * @param {String} table The tablename
	 * @param {Object} data The data to insert into the table
	 * @param {Boolean} [checkIfExists] If set to true, data.id will be checked for existance before inserting the row
	 * @returns {Object} The inserted object
	 */
	var rowInsert = function (table, data) {
		var deferred = $.Deferred();

		if (!databaseIsReady) {
			return false;
		}

		data.id = "" + data.id;

		var trans = db.transaction([table], "readwrite");
		var store = trans.objectStore(table);

		var request = store.add(data);

		/*
		 * Use transaction.oncomplete instead of request.onsuccess
		 * because request.onsuccess fires a step before the data is actually available,
		 * which means that a consecutive findAll will not find the inserted row
		 */
		trans.oncomplete = function () {
			deferred.resolve(data);
		};

		trans.onerror = function (e) {
			// When cannot insert (e.g. because ID already exists), resolve with null
			// TODO: Maybe reject?

			// This is needed because otherwise Firefox throws an uncatchable exception
			e.preventDefault();
			deferred.resolve(null);
		};


		return deferred.promise();
	};

	/**
	 * Update an entry
	 *
	 * @method rowUpdate
	 * @param {String} table The tablename
	 * @param {string} id The id of the entry
	 * @param {object} data The data to update. Non-included fields are ignored
	 * @returns {object} The updated object
	 */
	var rowUpdate = function (table, id, data) {
		var deferred = $.Deferred();

		if (!databaseIsReady) {
			return false;
		}

		id = "" + id;
		data.id = "" + data.id;

		if (arguments.length !== 3) {
			console.error("rowUpdate() expects 3 parameters: table, id, data");
			return false;
		}

		// Check if row exists
		findById(table, id).then(function (item) {
			if (!item) {
				deferred.resolve(null);
				return;
			}

			var trans = db.transaction([table], "readwrite");
			var store = trans.objectStore(table);
			var request = store.put(data);

			/*
			 * Use transaction.oncomplete instead of request.onsuccess
			 * because request.onsuccess fires a step before the data is actually available,
			 * which means that a consecutive findAll will not find the inserted row
			 */
			trans.oncomplete = function () {
				deferred.resolve(data);
			};

			trans.onerror = function (e) {
				deferred.reject("error");
			};
		});


		return deferred.promise();
	};

	/**
	 * Delete an entry
	 *
	 * @method rowDelete
	 * @param {String} table The tablename
	 * @param {String} id The id of the record to delete
	 * @returns {boolean} True if the entry was deleted, false if it didn't exist
	 */
	var rowDelete = function (table, id) {
		var deferred = $.Deferred();

		if (!databaseIsReady) {
			return false;
		}

		id = "" + id;

		// Check if entry exists
		findById(table, id).then(function (item) {
			if (!item) {
				deferred.resolve(false);
				return;
			}

			var trans = db.transaction([table], "readwrite");
			var store = trans.objectStore(table);
			var request = store.delete(id);

			trans.oncomplete = function () {
				deferred.resolve(true);
			};

			trans.onerror = function (e) {
				deferred.reject("error");
			};

		});

		return deferred.promise();
	};

	/**
	 * Initialises the database schema
	 * Note that this will drop an existing database - all data will be lost!
	 * A completely new database will be initialised based on the passed schema
	 *
	 * @private
	 * @param {object} schema The schema after which the database should be created:
	 * [{table: "table1", schema: ["field1", "field2", "field3"]}, {table: "table2", schema: ["field1", "field2"]}]
	 *
	 */
	var _initSchema = function (schema) {
		// Until the initialisation is finished, no request can be processed

		// If it was ready before, send an offlineready=false event
		if(databaseIsReady) {
			databaseIsReady = false;
			_transferOfflineReadyEvent();
		}


		// First delete the database if it exists
		var request = indexedDB.deleteDatabase(dbName);

		// This is called when the database is loaded successfully
		request.onsuccess = function () {
			_createSchema(schema);
		};

		request.onerror = function () {
			console.error("error creating schema");
		};

		request.onblocked = function () {
			console.error("blocked creating schema");
		};

	};

	/**
	 * Drop the database
	 * @method cleanUp
	 */
	var cleanUp = function () {
		var deferred = $.Deferred();

		if (db) {
			db.close();
		}

		setTimeout(function () {
			var request = indexedDB.deleteDatabase(dbName);

			request.onsuccess = function () {
				deferred.resolve(null);
			};

			request.onerror = function () {
				deferred.resolve(null);
			};

			// In IE, the deletion of the DB might fail if a transaction is still open
			// In this case, try again a bit later
			request.onblocked = function () {
				setTimeout(function () {
					request = indexedDB.deleteDatabase(dbName);
				}, 10);
			};
		});


		return deferred.promise();
	};

	/**
	 * @method _createSchema
	 * @param schema
	 * @private
	 */
	var _createSchema = function (schema) {
		// Create database (async!)
		var request = indexedDB.open(dbName, 1);

		request.onupgradeneeded = function () {
			var db = this.result;
			var i, j, objectStore;

			// now init the schema
			for (i = 0; i < schema.length; i++) {

				// create the table
				objectStore = db.createObjectStore(schema[i].table, {
					keyPath: 'id',
					autoIncrement: false
				});
			}
		};

		// This is called when the database is loaded successfully
		request.onsuccess = function () {
			db = this.result;
			databaseIsReady = true;

			// now insert the data
			var i, j, promises = [];
			for (i = 0; i < schema.length; i++) {
				// insert the data
				for (j = 0; j < schema[i].data.length; j++) {
					promises.push(rowInsert(schema[i].table, schema[i].data[j], false));
				}
			}

			var tmp = $.Deferred();

			// Database is ready when all data is inserted
			$.when.apply($, promises).done(function () {
				_transferOfflineReadyEvent();
				/*clearTimeout(queueTimer);
				queueTimer = setTimeout(_workQueue, 10);*/
			});

		};

		request.onerror = function () {

		};
	};

	/**
	 * @method _initOffline
	 * @private
	 */
	var _initOffline = function () {
		var request = indexedDB.open(dbName);

		// This is called when the database is loaded successfully
		request.onsuccess = function () {
			db = this.result;

			// Check if it is empty
			if (db.objectStoreNames.length) {
				databaseIsReady = true;
				_transferOfflineReadyEvent();
			} else {
				// no entries, do nothing!
				databaseIsReady = true;
				_transferOfflineReadyEvent();
			}

		};

		request.onerror = function () {
			console.error("could not open offline database");
		};

	};

	/**
	 *
	 * @private
	 */
	var _transferOfflineReadyEvent = function () {
		if(typeof databaseIsReadyFunction !== "function") {
			return;
		}
		databaseIsReadyFunction(databaseIsReady);
		//_emitOfflineReadyEvent(databaseIsReady);

	};

	/**
	 * Initialised the local database layer
	 *
	 * @method init
	 * @param {Object} schema The schema for the database
	 */
	var init = function (schema) {
		if (schema) {
			_initSchema(schema);
		} else {
			_initOffline();
		}
	};

	/**
	 * Set the namespace for the LocalDB
	 * @method setNamespace
	 * @param namespace
	 */
	var setNamespace = function (namespace) {
		dbName = namespace;
	};


	/**
	 * Public API
	 */
	return {
		findAll: findAll,
		findById: findById,
		findByAttributes: findByAttributes,
		findCustom: findCustom,
		rowInsert: rowInsert,
		rowUpdate: rowUpdate,
		rowDelete: rowDelete,
		init: init,
		setNamespace: setNamespace,
		cleanUp: cleanUp,
		databaseIsReady: function () {
			return databaseIsReady;
		},
		namespace: dbName
	};
});
$.scuba = function (options) {
	// Extend the default options with the given options
	var settings = $.extend({}, $.scuba.defaults, options);

	var offline = !window.navigator.onLine;
	var queueTimer = null;
	var syncPaused = false;
	var syncInProgress = false;
	var offlineForced = false;
	var log = [];

	var offlineReadyEvent = "offlineready";
	var offlineStatusEvent = "offlinestatuschange";
	var queueStatusEvent = "queuestatuschange";
	var syncEvent = "sync";

	// This contains the original ajax method in order to make calls outside
	var ajaxOnline = $.ajax;

	var _databaseIsReadyFunction = function (databaseIsReady) {
		if (databaseIsReady) {
			clearTimeout(queueTimer);
			queueTimer = setTimeout(_workQueue, 10);
		}

		_emitOfflineReadyEvent();
	};

	var LocalDB = LocalDBClass(_databaseIsReadyFunction);
	var Queue = QueueClass();

	/*
	 * If localDBClass is set, overwrite the default LocalDB-Class with it
	 * This allows the implementation of a custom client side storage layer
	 * The overridden class must implement the public API of LocalDB!
	 */
	if (settings.localDBClass) {
		LocalDB = settings.localDBClass;
	}

	if (!settings.routes) {
		settings.routes = [];
	}
	for (var i = 0; i < settings.routes.length; i++) {
		// Default functions for routes
		if (typeof settings.routes[i].data !== "function") {
			settings.routes[i].data = function () {
				var deferred = $.Deferred();
				deferred.resolve([]);

				return deferred.promise();
			};
		}
		if (typeof settings.routes[i].format !== "function") {
			settings.routes[i].format = function (data) {
				return data;
			};
		}
		if (typeof settings.routes[i].action !== "function") {
			settings.routes[i].action = function () {
				return null;
			};
		}
	}

	if (typeof settings.offlineForced !== "undefined") {
		offlineForced = !!settings.offlineForced;
	}

	if (settings.namespace) {
		LocalDB.setNamespace(settings.namespace);
	}

	if (typeof settings.onofflineready !== "function") {
		settings.onofflineready = function () {
		};
	}

	if (typeof settings.onsync !== "function") {
		settings.onsync = function () {
		};
	}

	if (typeof settings.onqueuestatuschange !== "function") {
		settings.onqueuestatuschange = function () {
		};
	}


	if (typeof settings.onofflinestatuschange !== "function") {
		settings.onofflinestatuschange = function () {
		};
	}

	settings.noConflict = (typeof settings.noConflict !== "undefined") ? !!settings.noConflict : false;

	/**
	 * Emit the offlinestatuschange event on $(window)
	 * @private
	 */
	var _emitOfflineStatusChangeEvent = function () {
		if (!settings.noConflict) {
			$(window).trigger(offlineStatusEvent, [isOffline()]);
		}
		settings.onofflinestatuschange(isOffline());
	};

	/**
	 * Emit the offlineready event on $(window)
	 * @private
	 */
	var _emitOfflineReadyEvent = function () {
		if (!settings.noConflict) {
			$(window).trigger(offlineReadyEvent, [LocalDB.databaseIsReady()]);
		}
		settings.onofflineready(LocalDB.databaseIsReady());
	};

	/**
	 * Emit the sync event on $(window)
	 * @private
	 */
	var _emitSyncEvent = function () {
		if (!settings.noConflict) {
			$(window).trigger(syncEvent, [syncInProgress]);
		}
		settings.onsync(syncInProgress);
	};

	var _emitQueueStatusEvent = function () {
		var obj = {
			status: Queue.hasError() ? "ERROR" : "OK",
			nextElement: Queue.first(),
			queue: Queue.getQueue(),
			queueLength: Queue.length()
		};

		if (!settings.noConflict) {
			$(window).trigger(queueStatusEvent, [obj]);
		}
		settings.onqueuestatuschange(obj);
	};

	/**
	 * Initialises the local db with data provided by the down sync
	 * TODO: What to do when the local db is already initialised?
	 *
	 * @param object data The data object provided by the down sync
	 * @return boolean TRUE if data is not empty, elsewise FALSE
	 * @private
	 */
	var _initLocalDB = function (data) {
		if (!data) {
			LocalDB.init(null);
			offline = true;
			_emitOfflineStatusChangeEvent();
			return false;
		}

		// Build the schema from the provided data
		var i, schema = [], models = [];
		for (i in data) {
			models.push(i);
			schema.push({
				table: i,
				data: data[i]
			});
		}

		// initialise default routes
		if (settings.includeDefaultRoutes && settings.apiBaseUrl) {
			_initDefaultRoutes(models);
		}

		LocalDB.init(schema);
		return true;
	};

	/**
	 *
	 * @param models
	 * @private
	 */
	var _initDefaultRoutes = function (models) {
		var routes = settings.routes;
		var i, j, tempParts, regex, matches, tmpUrl;

		for (i = 0; i < models.length; i++) {
			(function () {
				var m = models[i], tempUrl;
				var j;

				// GET /model
				tempUrl = settings.apiBaseUrl + "/" + m;

				// Check if the route already exists
				for (j = 0; j < routes.length; j++) {
					if (routes[j].type.toLowerCase() === "get" && routes[j].route.toLowerCase() === tempUrl.toLowerCase()) {
						return;
					}
				}

				settings.routes.push({
					type: "get",
					route: tempUrl,
					data: function () {
						return this.findAll(m);
					}
				});

				// GET /model/id
				tempUrl = settings.apiBaseUrl + "/" + m + "/!!";

				// Check if the route already exists
				for (j = 0; j < routes.length; j++) {
					if (routes[j].type.toLowerCase() === "get" && routes[j].route.toLowerCase() === tempUrl.toLowerCase()) {
						return;
					}
				}

				settings.routes.push({
					type: "get",
					route: tempUrl,
					data: function (options, id) {
						return this.findById(m, id);
					}
				});

				// POST /model
				tempUrl = settings.apiBaseUrl + "/" + m + "";

				// Check if the route already exists
				for (j = 0; j < routes.length; j++) {
					if (routes[j].type.toLowerCase() === "post" && routes[j].route.toLowerCase() === tempUrl.toLowerCase()) {
						return;
					}
				}

				settings.routes.push({
					type: "post",
					route: tempUrl,
					data: function (options) {
						return this.findById(m, options.data.id);
					},
					action: function (options) {
						return this.rowInsert(m, options.data);
					}
				});

				// PUT /model/id
				tempUrl = settings.apiBaseUrl + "/" + m + "/!!";

				// Check if the route already exists
				for (j = 0; j < routes.length; j++) {
					if (routes[j].type.toLowerCase() === "put" && routes[j].route.toLowerCase() === tempUrl.toLowerCase()) {
						return;
					}
				}

				settings.routes.push({
					type: "put",
					route: tempUrl,
					data: function (options, id) {
						return this.findById(m, id);
					},
					action: function (options, id) {
						return this.rowUpdate(m, id, options.data);
					}
				});

				// DELETE /model/id
				tempUrl = settings.apiBaseUrl + "/" + m + "/!!";

				// Check if the route already exists
				for (j = 0; j < routes.length; j++) {
					if (routes[j].type.toLowerCase() === "delete" && routes[j].route.toLowerCase() === tempUrl.toLowerCase()) {
						return;
					}
				}

				settings.routes.push({
					type: "delete",
					route: tempUrl,
					data: function (options) {
						return null;
					},
					action: function (options, id) {
						return this.rowDelete(m, id);
					}
				});
			})();
		}
	};

	/**
	 * Start the down sync
	 * Takes all specified routes from settings.downSyncRoutes, works through them and insertes the data into
	 * the local database
	 *
	 * @private
	 */
	var _downSync = function () {
		// Get the specified downsync routes and load the data from each
		var routes = settings.downSyncRoutes;

		// This number is used to track if all downsync-routes are finished
		var openRoutes = routes.length;

		// This object will contain the merged data
		var data = {};

		// If this is true, ignore all further responses
		var abort = false;

		// is definitely offline?
		if (isOffline()) {
			_initLocalDB(null);
			return;
		}

		// timeout after 10 seconds
		setTimeout(function () {
			if (!abort && openRoutes > 0) {
				abort = true;
				_initLocalDB(null);
			}
		}, settings.downSyncTimeout);

		// No routes, skip directly to initialisation
		if (!routes || routes.length === 0) {
			abort = true;
			_initLocalDB(null);
		}

		for (var i = 0; i < routes.length; i++) {
			(function (route) {

				// Default functions for route
				if (typeof route.success !== "function") {
					route.success = function (data) {
						return data;
					};
				}

				ajaxOnline({
					url: route.url,
					success: function (response) {
						if (abort) {
							return;
						}

						var responseData = route.success(response);

						data = _mergeData(data, responseData);

						// Check if it is the last open route
						openRoutes--;
						if (openRoutes === 0) {
							_initLocalDB(data);
						}
					},
					error: function () {
						if (abort) {
							return;
						}
						abort = true;
						_initLocalDB(null);
					}
				});
			})(routes[i]);
		}
	};

	var queueIsWorking = false;
	/**
	 * Work on the next queue item
	 * Try to send it to the server
	 *
	 * @private
	 */
	var _workQueue = function () {
		if (!isOfflineReady() || syncPaused) {
			clearTimeout(queueTimer);
			queueTimer = setTimeout(_workQueue, settings.syncRetry);
			if (syncInProgress) {
				syncInProgress = false;
				_emitSyncEvent();
			}
			return;
		}

		if (queueIsWorking) {
			clearTimeout(queueTimer);
			queueTimer = setTimeout(_workQueue, 10);
			return;
		}

		// Queue is empty?
		if (!Queue.length()) {
			clearTimeout(queueTimer);
			queueTimer = setTimeout(_workQueue, settings.syncRetry);
			if (syncInProgress) {
				syncInProgress = false;
				_emitSyncEvent();
				_emitQueueStatusEvent();
			}
			return;
		}

		// Queue Error, handle it...
		if (Queue.hasError()) {
			if (typeof settings.queueIfError === "string" && settings.queueIfError.toLowerCase() === "continue") {
				_emitSyncEvent();
				_emitQueueStatusEvent();
				Queue.dequeue();
				Queue.queueError(0);
				clearTimeout(queueTimer);
				queueTimer = setTimeout(_workQueue, 10);
				return;
			}

			syncInProgress = false;
			_emitSyncEvent();
			_emitQueueStatusEvent();

			if (typeof settings.queueIfError === "function") {
				settings.queueIfError(Queue.getQueue());
			}

			return;
		}

		queueIsWorking = true;

		// At least one entry, try it...
		if (!syncInProgress) {
			syncInProgress = true;
			_emitSyncEvent();
		}

		var queueNext = Queue.first();
		if (typeof queueNext.data === "object") {
			queueNext.data = JSON.stringify(queueNext.data);
		}

		ajaxOnline(queueNext).then(function (data) {
			// Delete entry from queue, then continue with next entry
			var item = Queue.dequeue();

			queueIsWorking = false;
			offline = false;
			clearTimeout(queueTimer);
			queueTimer = setTimeout(_workQueue, 10);
			_emitQueueStatusEvent();
		}, function (jqXHR, textStatus, error) {
			// If readystate is 0, app is offline
			// TODO: ISSUE with CORS problems (no access-controll-allow-origin header, ...
			// readyState is also 0!

			if (jqXHR.readyState === 0) {
				queueIsWorking = false;
				clearTimeout(queueTimer);
				queueTimer = setTimeout(_workQueue, settings.syncRetry);
				offline = true;
				_emitOfflineStatusChangeEvent();
				return;
			}

			// Retry 3 times, wait 2 seconds
			Queue.queueError();
			queueIsWorking = false;
			clearTimeout(queueTimer);
			queueTimer = setTimeout(_workQueue, 1000);
		});

		return;
	};

	/**
	 * Initialise scuba
	 * Make general settings and start the down sync
	 *
	 * @private
	 */
	var _init = function () {

		/*
		 * Override the regular $.ajax() method of jQuery
		 * All ajax calls go through this class
		 * The original Method is available under $.ajaxOriginal()
		 * or under $ajax inside of this class
		 */
		//var originalAjax = $.ajax.bind($);

		if (!settings.noConflict) {
			$.ajaxOnline = ajaxOnline;
			$.ajax = ajax;
		}

		// start the downsync
		Queue.init(settings.namespace);
		_downSync();
		_workQueue();
	};

	/**
	 * Sync the local database
	 * Forces a down sync and the working of the queue
	 * @method sync
	 */
	var sync = function () {
		_downSync();

		clearTimeout(queueTimer);
		queueTimer = setTimeout(_workQueue, 10);
	};

	/**
	 * This function is used instead of the regular $.ajax() function
	 * It will route the requests to the local db and perform any actions required there
	 * It will also queue changing requests (post, put, delete) and send them to the server
	 * this happens asychronously - results are returned from the local db immediatley, and changes are performed on
	 * the server at some point later
	 * The original ajax function (for external requests) is available via ajaxOnline
	 *
	 * @method ajax
	 * @returns promise A promise which can be resolved (which will contain the returned data)
	 */

	var ajax = function () {
		// If not offline ready, use regular ajax and break
		if (!LocalDB.databaseIsReady()) {
			return ajaxOnline.apply($, arguments);
		}

		// parse options
		var options = {};
		if (typeof arguments[0] === "string") {
			options.url = arguments[0];
			if (typeof arguments[1] === "object") {
				$.extend(options, arguments[1]);
			}
		} else {
			options = $.extend(options, arguments[0]);
		}

		// set default values
		if (typeof options.type === "undefined" || (options.type.toLowerCase() !== "post" && options.type.toLowerCase() !== "put" && options.type.toLowerCase() !== "update")) {
			options.type = "get";
		} else {
			options.type = options.type.toLowerCase();
		}

		if (typeof options.success !== "function") {
			options.success = function () {
			};
		}

		if (typeof options.error !== "function") {
			options.error = function () {
			};
		}

		if (typeof options.complete !== "function") {
			options.complete = function () {
			};
		}

		// automatically parse data to JSON if it is a string
		if (typeof options.data === "string") {
			options.data = JSON.parse(options.data);
		}

		// Get the fitting route
		var fittingRoute = _getRoute(options.url, options.type);

		if (!fittingRoute) {
			// route not found, try online
			log.push("Route not found: " + options.type.toUpperCase() + " " + options.url);
			return ajaxOnline.apply($, arguments);
		}

		// Check for action, data and format functions in found route
		if (typeof fittingRoute.route.action !== "function") {
			fittingRoute.route.action = null;
		}
		// Data is required!
		if (typeof fittingRoute.route.data !== "function") {
			return ajaxOnline.apply($, arguments);
		}
		if (typeof fittingRoute.route.format !== "function") {
			fittingRoute.route.format = settings.defaultFormat;
		}

		// remove functions & context from the options
		var reducedOptions = {};
		for (var i in options) {
			if (typeof options[i] !== "function" && i !== "context") {
				reducedOptions[i] = options[i];
			}
		}

		// Get the params
		var params = fittingRoute.params.slice(1);
		params.unshift(reducedOptions);

		// Add GET params to options
		var scubaOptions = $.extend({}, reducedOptions);
		scubaOptions.getParams = fittingRoute.getParams;
		// For GET requests, add the data field to the getParams
		if (options.type === "get" && options.data) {
			scubaOptions.getParams = $.extend({}, scubaOptions.getParams, options.data);
		}

		var actionPromise = null;

		// First, the action...
		if (fittingRoute.route.action) {
			actionPromise = fittingRoute.route.action.apply(LocalDB, params);
		}

		/*
		 * post, put or delete request
		 * Add an entry to the queue for these requests
		 * TODO: optionally for get requests?
		 */
		if (options.type === "post" || options.type === "put" || options.type === "delete") {
			Queue.enqueue(reducedOptions);
			_emitQueueStatusEvent();
			clearTimeout(queueTimer);
			queueTimer = setTimeout(_workQueue, 10);
		}

		// Actually get the data

		// Wrap this in a function so it can also be run later if an action has to be performed before
		var getData = function (actionPromise) {

			// mock the jqXHR object
			var jqXHR = $.Deferred();
			jqXHR.responseJSON = {};
			jqXHR.responseText = "";
			jqXHR.readyState = 0;
			jqXHR.statusText = "OK";
			jqXHR.status = 200;
			jqXHR.getAllResponseHeaders = function () {

			};
			jqXHR.setRequestHeader = function (name, value) {

			};
			jqXHR.getResponseHeader = function (name) {

			};
			jqXHR.statusCode = function () {
				return this.status;
			};
			jqXHR.abort = function () {

			};

			scubaOptions.jqXHR = jqXHR;

			var getDataFunction = function () {
				var params = fittingRoute.params.slice(1);
				var response;

				params.unshift(scubaOptions);

				// route found, load specified data
				var data = fittingRoute.route.data.apply(LocalDB, params);

				// Get the status
				if (typeof fittingRoute.route.status === "function") {

				}

				// If data returns empty, return "null"
				if (!data) {
					response = fittingRoute.route.format(null, scubaOptions);

					jqXHR.readyState = 4;
					jqXHR.resolve(response);
					options.success(response, "success", jqXHR);
					options.complete(jqXHR, "success");
					return;
				}

				data.then(function (data) {
					var logRow = [
						"Route found: " + options.type.toUpperCase() + " " + options.url,
						reducedOptions,
						data
					];

					log.push(logRow);
					response = fittingRoute.route.format(data, scubaOptions);

					jqXHR.readyState = 4;
					jqXHR.resolve(response);
					options.success(response, "success", jqXHR);
					options.complete(jqXHR, "success");
				}).fail(function (e) {
					// Automatically add error message to body, if it is an object
					if (typeof e === "object") {
						jqXHR.responseText = JSON.stringify(e);
						jqXHR.responseJSON = e;
					}

					jqXHR.readyState = 4;
					jqXHR.reject(jqXHR, "error", e);
					options.error(jqXHR, "error", e);
					options.complete(jqXHR, "error", e);

					console.error("error loading data");
				});
			};

			if (actionPromise) {
				actionPromise.then(function () {
					getDataFunction();
				});
			} else {
				getDataFunction();
			}

			return jqXHR;
		};

		var deferred = getData(actionPromise);
		var promise = deferred.promise();
		promise.success = deferred.done;
		promise.error = deferred.fail;
		promise.complete = deferred.done;

		return promise;
	};

	/**
	 * Returns true if the LocalDB is ready
	 * @method isOfflineReady
	 * @returns {Boolean}
	 */
	var isOfflineReady = function () {
		return LocalDB.databaseIsReady();
	};

	/**
	 * Returns true if the client is currently offline
	 *
	 * @method isOffline
	 * @returns {boolean}
	 */
	var isOffline = function () {
		if (offlineForced) {
			return true;
		}
		return offline;
	};

	/**
	 * Returns true if scuba is currently syncing
	 * @method isSyncing
	 * @returns {boolean}
	 */
	var isSyncing = function () {
		return syncInProgress;
	};

	/**
	 * Pauses the syncing / working of the queue. If pause is not set, it is toggled
	 *
	 * @method pauseSync
	 * @param {boolean} [pause] TRUE if sync should be paused, FALSE if it should be continued
	 * @returns {boolean}
	 */
	var pauseSync = function (pause) {
		if (typeof pause === "undefined") {
			syncPaused = !syncPaused;
		} else {
			syncPaused = !!pause;
		}

		if (!syncPaused) {
			clearTimeout(queueTimer);
			queueTimer = setTimeout(_workQueue, 10);
		} else {
			clearTimeout(queueTimer);
		}

		return syncPaused;
	};

	/**
	 * Clean everything up
	 * clear all local Databases
	 *
	 * @method cleanUp
	 */
	var cleanUp = function () {
		return LocalDB.cleanUp();
	};

	/**
	 * Continue the working of the Queue. Discard eventual errors
	 * @method queueContinue
	 */
	var queueContinue = function () {
		Queue.queueError(0);
		clearTimeout(queueTimer);
		queueTimer = setTimeout(_workQueue, 10);
	};

	/**
	 * Force scuba to work in online or offline mode
	 * Useful for testing
	 *
	 * @method forceOffline
	 * @param {Boolean} [isForced] Toggles if not set
	 * @returns {boolean}
	 */
	var forceOffline = function (isForced) {
		if (typeof isForced !== "undefined") {
			offlineForced = !!isForced;
		} else {
			offlineForced = !offlineForced;
		}
		return offlineForced;
	};

	/**
	 * Return the internal log
	 * @method getLog
	 */
	var getLog = function () {
		for (var i = 0; i < log.length; i++) {
			if (typeof log[i] === "object") {
				console.log.apply(console, log[i]);
				continue;
			}
			console.log(log[i]);
		}
	};

	// Initialise scuba
	_init();


	/*
	 * UTILITY FUNCTIONS
	 */

	/**
	 * This function merges two objects together
	 * Both objects are expected to have the following syntax:
	 * { model1: [...], model2: [...]}
	 *
	 * For some reason, $.extend(true, data1, data2) does not seem to work as expected
	 *
	 * @param object data1
	 * @param object data2
	 * @returns object The merged object
	 * @private
	 */
	var _mergeData = function (data1, data2) {
		var model, i, length, lookup;

		for (model in data2) {
			if (!data1[model]) {
				data1[model] = [];
			}

			// Build a lookup object with the data from the original array
			lookup = {};
			for (i = 0, length = data1[model].length; i < length; i++) {
				lookup[data1[model][i].id] = data1[model][i];
			}

			for (i = 0; i < data2[model].length; i++) {
				if (typeof lookup[data2[model][i].id] === "undefined") {
					data1[model].push(data2[model][i]);
				}
			}
		}

		return data1;
	};

	/**
	 * Parses an URL and separates it into its different parts
	 *
	 * @param string uri The URL to parse
	 * @returns object The different parts of the URL
	 * @private
	 */
	var _parseURI = function (uri) {
		// If apiBaseUrl is set, all uris without http:// are prefixed with it
		if (settings.apiBaseUrl && uri.indexOf("http") !== 0) {
			uri = settings.apiBaseUrl + uri;
		}

		var parser = document.createElement('a');
		parser.href = uri;

		var path = parser.pathname;
		// delete leading and trailing /
		if (path.indexOf("/") === 0) {
			path = path.slice(1);
		}
		if (path.substr(path.length - 1) === "/") {
			path = path.slice(0, path.length - 1);
		}
		var pathSegments = path.split("/");

		return {
			hash: parser.hash,
			searchParams: parser.search,
			host: parser.host,
			protocol: parser.protocol,
			path: path,
			pathSegments: pathSegments

		};
	};

	/**
	 * Takes a route and matches it against the defined routes in settings.routes
	 * Parses the route into its parts and then tries to find a match - it also matches url segments,
	 * which are then available in the resulting object via result.params
	 *
	 * @param string route The route to match
	 * @param string type The HTTP type to match: get, post, put or delete
	 * @returns object The matched route and params or FALSE if no route is found
	 * @private
	 */
	var _getRoute = function (route, type) {
		var routes = settings.routes;
		var routeParts = _parseURI(route);
		var i, j, k, tempParts, regex, matches, getParams = {}, tmp;

		for (i = 0; i < routes.length; i++) {

			// Routes must match http type!
			// if type == "any" then any type is matched
			if (routes[i].type.toLowerCase() !== type.toLowerCase() && routes[i].type.toLowerCase() !== "any") {
				continue;
			}

			tempParts = _parseURI(routes[i].route);

			// Build a regex
			for (j = 0; j < tempParts.pathSegments.length; j++) {
				// Replace !! with capturing group
				if (tempParts.pathSegments[j] === "!!") {
					tempParts.pathSegments[j] = "([^\\/;]+)";
				}
			}

			regex = "^" + tempParts.pathSegments.join("\\/") + "$";
			regex = new RegExp(regex, "gi");

			matches = regex.exec(routeParts.path);
			if (matches) {

				// make key-value pairs from get params
				tmp = routeParts.searchParams;
				if (tmp.length > 0) {
					tmp = tmp.substr(1);
					tmp = tmp.split("&");

					for (k = 0; k < tmp.length; k++) {
						getParams[tmp[k].split("=")[0]] = tmp[k].split("=")[1] || null;
					}
				}

				return {
					route: routes[i],
					params: matches,
					getParams: getParams
				};
			}
		}

		return false;
	};

	/**
	 * Public API
	 */
	return {
		//sync: sync,
		cleanUp: cleanUp,
		LocalDB: LocalDB,
		Queue: Queue,
		ajax: ajax,
		isOffline: isOffline,
		isOfflineReady: isOfflineReady,
		isSyncing: isSyncing,
		pauseSync: pauseSync,
		onofflineready: function (f) {
			settings.onofflineready = f;
		},
		onofflinestatuschange: function (f) {
			settings.onofflinestatuschange = f;
		},
		onsync: function (f) {
			settings.onsync = f;
		},
		onqueuestatuschange: function (f) {
			settings.onqueuestatuschange = f;
		},
		queueContinue: queueContinue,
		forceOffline: forceOffline,
		getLog: getLog,
		sync: sync
	};
};

$.scuba.defaults = {
	syncRetry: 10000,
	downSyncTimeout: 10000,
	remoteIfOnline: false,
	includeDefaultRoutes: false,
	apiBaseUrl: "",
	localDBClass: null,
	downSyncRoutes: [],
	routes: [],
	namespace: "scuba",
	noConflict: false,
	offlineForced: false,

	queueIfError: "continue", // continue, stop, function

	defaultFormat: function (data) {
		return data;
	}
};

	
}(jQuery, window.indexedDB));