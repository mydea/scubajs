/**
 * The LocalDB Object
 * @class LocalDB
 * @param {String} selector The selector for an element.
 * @param {String} [context] The context for the search.
 */
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