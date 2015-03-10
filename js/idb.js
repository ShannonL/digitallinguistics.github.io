// INDEXEDDB
// IndexedDB functionality, used as a mix-in on the models

var idb = {
  // Creates the tables (object stores) for the database
  createTables: function() {
    var defaults = { keyPath: 'id', autoIncrement: true };
    idb.tableList.forEach(function(table) {
      idb.database.createObjectStore(table.name, defaults);
    });
  },

  // Deletes the database as well as saved preferences; takes an optional callback
  deleteDatabase: function(dbname, callback) {
    if (!typeof dbname == 'string') { console.log('Please specify a database to delete.'); }
    
    delete localStorage.wugbotPreferences;
    delete app.preferences;
    
    var request = indexedDB.deleteDatabase(dbname);
    
    request.onsuccess = function() {
      console.log('Database deleted.');
      if (typeof callback == 'function') { callback(); }
    };
    
    request.onblocked = function() { idb.database.close(); };
  },

  // Exports the entire database and returns a database object in JSON format
  // Accepts an optional callback function
  export: function(callback) {
    idb.exported = {};
    var tableNames = Array.prototype.slice.call(idb.database.objectStoreNames);
    
    if (tableNames.length > 0) {
      var transaction = idb.database.transaction(tableNames);

      transaction.oncomplete = function() {
        if (typeof callback == 'function') { callback(idb.exported); }
      };

      tableNames.forEach(function(tableName) {
        var results = idb.exported[tableName] = [];
        
        var getAll = function(table) {
          var request = table.openCursor;
          
          request.onsuccess = function() {
            var cursor = request.result;
            
            if (cursor) {
              results.push(cursor.value);
              cursor.continue();
            }
          };
        };
        
        idb.transact(tableName, null, null, getAll);
      });
    } else {
      callback();
    }
  },

  // Gets items from the database by an ID (does not accept breadcrumbs)
  // The IDs argument may be a single ID, an array of IDs, or 'all'
  // Takes a required callback function that has the array of the returned results as its argument
  get: function(ids, tableName, callback) {
    var results = [];
    
    var getEach = function(table) {
      if (ids == 'all') {
        var request = table.openCursor();
        
        request.onsuccess = function() {
          var cursor = request.result;
          
          if (cursor) {
            results.push(idb.hydrate(cursor.value));
            cursor.continue();
          }
        };
        
      } else {
        if (!ids.length) {
          var ids = new Array(ids);
          ids.forEach(function(id) {
            var request = table.get(id);
            request.onsuccess = function() {
              results.push(idb.hydrate(request.result));
            };
          });
        }
      }
    };
    
    idb.transact(tableName, results, callback, getEach);
  },

  // Gets objects from the database by their breadcrumb
  // The 'breadcrumbs' argument may be either a single breadcrumb or an array of breadcrumbs (an array of arrays)
  // Breadcrumb format: [1, 2, 3, 4], or [1, 7], or [13, 4, 9], etc.
  // Also accepts string-format breadcrumbs: '1_2_3_4', or '1_7', or '13_4_9', etc.
  // Takes a required callback function that has an array of retrieved objects as its argument
  getBreadcrumb: function(breadcrumbs, callback) {
    var results = [];
    if (typeof breadcrumbs[0] == 'number') { breadcrumbs = new Array(breadcrumbs); }
    if (typeof breadcrumbs == 'string') { breadcrumbs = new Array(Breadcrumb.parse(breadcrumbs)); }
    if (typeof breadcrumbs[0] == 'string') { breadcrumbs = breadcrumbs.map(Breadcrumb.parse); }
    
    var getByBreadcrumb = function(table) {
      breadcrumbs.forEach(function(breadcrumb) {
        var request = table.get(breadcrumb[0]);
        
        request.onsuccess = function() {
          var text = request.result;
          
          Breadcrumb.applyTo(breadcrumb, text, function(obj) {
            results.push(idb.hydrate(obj));
          });
        };
      });
    };
    
    idb.transact('texts', results, callback, getByBreadcrumb);
  },
  
  hydrate: function(obj) {
    var newObj = new models[obj.model](obj);
    if (newObj.id) {
      delete newObj.id;
      Object.defineProperty(newObj, 'id', {
        enumerable: true,
        value: obj.id
      });
    }
    return newObj;
  },
  
  // Opens the database, or creates a new one if it doesn't yet exist
  // Takes an optional callback that has the database object as its argument
  open: function(dbname, callback) {
    var request = indexedDB.open(dbname, 1);
    
    request.onsuccess = function() {
      idb.database = request.result;

      idb.database.onerror = function(ev) { console.log('Database error: ' + ev.target.errorCode); };
      
      idb.onversionchange = function(ev) { ev.target.close(); };
      
      if (typeof callback == 'function') { callback(idb.database); }
    };
    
    request.onupgradeneeded = function() {
      idb.database = request.result;
      
      var deleteTables = function() {
        var tableNames = Array.prototype.slice.call(idb.database.objectStoreNames);
        
        tableNames.forEach(function(tableName) {
          idb.database.deleteObjectStore(tableName);
        });
        
        idb.createTables();
        
        Object.keys(idb.exported).forEach(function(key, i, keys) {
          idb.store(idb.exported[key]);
          
          if (i == keys.length-1) {
            if (typeof callback == 'function') { callback(idb.database); }
          }
        });
      };
      
      idb.export(deleteTables);
    };
  },
  
  // Helper function: Creates a put request and puts the object to the specified table
  // Note that 'table' is an actual reference to an object store, not just a table name
  put: function(item, table, results) {
    var request = table.put(item);
    request.onsuccess = function() {
      Object.defineProperty(item, 'id', {
        enumerable: true,
        value: request.result
      });
      
      results.push(request.result);
    };
  },

  // Removes records with the specified IDs from the specified table
  // The 'ids' argument may be a single numeric ID, an array of IDs, or 'all'
  // Takes an optional callback
  remove: function(ids, tableName, callback) {
    var result;
    
    var removeByID = function(table) {
      if (typeof ids == 'number') {
        ids = new Array(ids);
        ids.forEach(function(id) { table.delete(id); });
      } else if (ids == 'all') {
        table.clear();
      }
    };
    
    idb.transact(tableName, result, callback, removeByID);
  },

  // Removes objects with the specified breadcrumb from the database
  // The 'breadcrumbs' argument may be either a single breadcrumb or an array of breadcrumbs (an array of arrays)
  // Breadcrumb format: [1, 2, 3, 4], or [1, 7], or [13, 4, 9], etc.
  // Also accepts string-format breadcrumbs: '1_2_3_4', or '1_7', or '13_4_9', etc.
  // Takes an optional callback function
  removeBreadcrumb: function(breadcrumbs, callback) {
    if (typeof breadcrumbs[0] == 'number') { breadcrumbs = new Array(breadcrumbs); }
    if (typeof breadcrumbs == 'string') { breadcrumbs = new Array(Breadcrumb.parse(breadcrumbs)); }
    if (typeof breadcrumbs[0] == 'string') { breadcrumbs = breadcrumbs.map(Breadcrumb.parse); }
    
    var removeByBreadcrumb = function(table) {
      breadcrumbs.forEach(function(breadcrumb) {
        if (breadcrumb.length == 1) {
          table.delete(breadcrumb[0])
        } else {
          var request = table.get(breadcrumb[0]);
          
          request.onsuccess = function() {
            var text = request.result;
            
            var removeObj = function(obj, index, arr) {
              arr.splice(index, 1);
            };
            
            Breadcrumb.applyTo(breadcrumb, text, removeObj);
            
            Breadcrumb.reset(text);
            
            table.put(text);
          };
        }
      });
    };
    
    idb.transact('texts', null, callback, removeByBreadcrumb);
  },

  // lingType = the type of linguistic object being searched for (e.g. Phrase, Morpheme)
     // - argument is PascalCase, so that it can be generated automatically using the .model or .constructor.name properties of an object if desired
  // property = a property of the linguistic object to be checked for matches
  // criteria = an expression that will return true whenever property == criteria
  search: function(lingType, criteria) {
    var results = [];
    
    var check = function(table) {
      var request = table.openCursor();
      
      request.onsuccess = function() {
        var cursor = request.result;
        
        if (cursor) {
          var text = cursor.value;
          
          if (lingType != 'Text') {
            text.phrases.forEach(function(phrase) {
              if (lingType != 'Phrase') {
                phrase.words.forEach(function(word) {
                  if (lingType != 'Word') {
                    word.morphemes.forEach(function(morpheme) {
                      if (checkAgainst(criteria, morpheme)) {
                        results.push(idb.hydrate(morpheme));
                      }
                    });
                  } else {
                    if (checkAgainst(criteria, word)) {
                      results.push(idb.hydrate(word));
                    }
                  }
                });
              } else {
                if (checkAgainst(criteria, phrase)) {
                  results.push(idb.hydrate(phrase));
                }
              }
            });
          } else {
            if (checkAgainst(criteria, text)) {
              results.push(idb.hydrate(text));
            }
          }
          
          cursor.continue();
        }
      };
    };
    
    idb.transact('texts', results, callback, check);
  },
  
  // Adds or updates database items
  // Items may either be a single object or an array of objects (objects must have the same model)
  // Accepts an optional callback that has an array of indexes of the added items as its argument
  store: function(items, callback) {
    if (!items.length) { items = new Array(items); }
    
    var results = [];
    var model = items[0].model;
    var tables = idb.tableList.filter(function(table) {
      return table.model == model;
    });
    
    if ( tables.length > 0 ) {
      var tableName = idb.tableList.filter(function(table) {
        return table.model == items[0].model;
      })[0].name;
      
      var storeByID = function(table) {
        items.forEach(function(item) {
          idb.put(item, table, results);
        });
      };
      
      idb.transact(tableName, results, callback, storeByID);
      
    } else {
      var tableName = 'texts';
      
      var storeByBreadcrumb = function(table) {
        items.forEach(function(item) {
          var request = table.get(item.breadcrumb[0]);
          
          request.onsuccess = function() {
            var text = request.result;
            
            Breadcrumb.applyTo(item.breadcrumb, text, function(obj) {
              obj = item;
            });
            
            idb.put(text, table, results);
          }; 
        });
      };
      
      idb.transact(tableName, results, callback, storeByBreadcrumb);
    }
  },

  // The list of tables in the database, and their corresponding models
  tableList: [
    {
      name: 'corpora',
      model: 'Corpus'
    },
    {
      name: 'languages',
      model: 'Language'
    },
    {
      name: 'lexicons',
      model: 'Lexicon'
    },
    {
      name: 'media',
      model: 'Media'
    },
    {
      name: 'texts',
      model: 'Text'
    }
  ],
  
  // Helper function: Creates a transaction, gets the table, and applies an action to it
  // The 'action' argument is a function which has the idb table as its argument
  transact: function(tableName, results, callback, action) {
    var transaction = idb.database.transaction(tableName, 'readwrite');
    
    transaction.oncomplete = function() {
      if (typeof callback == 'function') { callback(results); }
    };
    
    var table = transaction.objectStore(tableName);
    
    action(table);
  },
  
  // Updates the property of the specified records in a table with a new value
  // The IDs argument may be a single ID, an array of IDs, or 'all'
  // Accepts an optional callback function that has an array of the updated records as its result
  update: function(ids, tableName, property, newValue, callback) {
    var results = [];
    
    if (ids == 'all') {
      var updateAll = function(table) {
        var request = table.openCursor();
        
        request.onsuccess = function() {
          var cursor = request.result;
          
          if (cursor) {
            var data = cursor.value;
            
            data[property] = newValue;
            
            var requestUpdate = table.put(data);
            
            requestUpdate.onsuccess = function() {
              results.push(idb.hydrate(data));
            };
            
            cursor.continue();
          }
        };
      };
      
      idb.transact(tableName, results, callback, updateAll);
    } else {
      if (typeof ids == 'number') { ids = new Array(ids); }
      
      var updateEach = function(table) {
      };
      
      idb.transact(tableName, results, callback, updateEach);
    }
  },
  
  // Updates a property of the object at the specified breadcrumb with the new value
  // To replace the entire object at that breadcrumb, use idb.store()
  // Breadcrum may either be array ([1, 2, 3, 4]) or string ('1_2_3_4') format
  // Takes an optional callback function with no arguments
  updateBreadcrumb: function(breadcrumb, property, newValue) {
    if (typeof breadcrumb == 'string') { breadcrumb = Breadcrumb.parse(breadcrumb); }
    
    var update = function(table) {
      var request = table.get(breadcrumb[0]);
      
      request.onsuccess = function() {
        var text = request.result;
        
        var setValue = function(obj) {
          obj[property] = newValue;
        };
        
        Breadcrumb.applyTo(breadcrumb, text, setValue);
        
        var requestUpdate = table.put(text);
      };
    };
    
    idb.transact('texts', null, callback, update);
  }
};
