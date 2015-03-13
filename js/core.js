// CORE
// - Base functions & objects
// - Event system
// - Base model
// - Base view & collection


// HELPER FUNCTIONS
// Adds all the enumerable keys of one object (the source) to another (the destination)
function augment(destination, source) {
  Object.keys(source).forEach(function(key) {
    destination[key] = source[key];
  });
  
  return destination;
};

function checkAgainst(a, b) {
  return Object.keys(a).every(function(key) {
    if (typeof a[key] == 'string' || typeof a[key] == 'number') {
      return a[key] == b[key];
      
    } else if (a[key].length) {
      var c = a[key];
      var d = b[key];
      return c.every(function(obj, i) {
        return checkAgainst(c[i], d[i]);
      });
      
    } else if (typeof a[key] == 'object') {
      var c = a[key];
      var d = b[key];
      return checkAgainst(c, d);
    }
  });
};

function createElement(tagName, attributes) {
  var el = document.createElement(tagName);
  for (var attribute in attributes) {
    el[attribute] = attributes[attribute];
  }
  return el;
};

function hydrate(obj) {
  var newObj = new models[obj.model](obj);
  if (newObj.id) {
    delete newObj.id;
    Object.defineProperty(newObj, 'id', {
      enumerable: true,
      value: obj.id
    });
  }
  return newObj;
};

function toArray(primitive) {
  return [primitive];
};

// A global Breadcrumb object that handles functions relating to breadcrumbs
Breadcrumb = {
  // Finds the given breadcrumb in a given text, and applies the given function to it
  // Action can take optional second and third arguments, which are the index of the object in the array, and the array that the object is in
  applyTo: function(breadcrumb, text, action) {
    if (breadcrumb.length == 1) {
      action(text);
    } else if (breadcrumb.length == 2) {
      action(text.phrases[breadcrumb[1]], breadcrumb[1], text.phrases);
    } else if (breadcrumb.length == 3) {
      action(text.phrases[breadcrumb[1]].words[breadcrumb[2]], breadcrumb[2], text.phrases[breadcrumb[1]].words);
    } else if (breadcrumb.length == 4) {
      action(text.phrases[breadcrumb[1]].words[breadcrumb[2]].morphemes[breadcrumb[3]], breadcrumb[3], text.phrases[breadcrumb[1]].words[breadcrumb[2]].morphemes);
    }
  },
  
  parse: function(breadcrumb) {
    return breadcrumb.split('_');
  },
  
  // Resets the breadcrumbs on every item within an item
  reset: function(item) {
    var resetWord = function(word) {
      word.morphemes.forEach(function(morpheme, m) {
        morpheme.breadcrumb = word.breadcrumb.concat(m);
      });
    };
    
    var resetPhrase = function(phrase) {
      phrase.words.forEach(function(word, w) {
        word.breadcrumb = phrase.breadcrumb.concat(w);
        if (word.morphemes) { resetWord(word); }
      });
    };
    
    var resetText = function(text) {
      text.breadcrumb = [text.id];
      
      if (text.phrases) {
        text.phrases.forEach(function(phrase, p) {
          phrase.breadcrumb = text.breadcrumb.concat(p);
            if (phrase.words) { resetPhrase(phrase); }
        });
      }
    };
    
    if (item.model == 'Word') {
      resetWord(item);
    }
    
    if (item.model == 'Phrase') {
      resetPhrase(item);
    }
    
    if (item.model == 'Text') {
      resetText(item);
    }
  },
  
  stringify: function(breadcrumb) {
    var crumb = breadcrumb.join('_');
    return crumb;
  }
};

// IDB MIX-Infinity
function IDBObj() {
  Object.defineProperties(this, {
    // Deletes the object from IndexedDB
    // Accepts an optional callback function that fires when the database transaction is complete
    'delete': {
      value: function(callback) {
        if (this.id) {
          var tableName = idb.tableList.filter(function(table) {
            return table.model == this.model;
          })[0];
          idb.remove(id, tableName, callback);
        }
      }.bind(this)
    },

    // Stores the object in IndexedDB
    // Optional callback function has an array of a single index (the index of the stored object) as its argument
    'store': {
      value: function(callback) {
        idb.store(this, callback);
      }.bind(this)
    }
  });
};


// EVENT SYSTEM
// Handlers is an array of settings for event handlers that will be added to the object
// - Each handler has 3 attributes: el (what the listener attaches to; this is a string representing the attribute of the object the Events mixin is being called on), evType (e.g. 'click', 'onload'), and functionCall (the function to execute when the event fires)
function Events() {
  if (this.handlers) {
    this.handlers.forEach(function(handler) {
      this[handler.el].addEventListener(handler.evType, handler.functionCall);
    }, this);
  }
  
  if (!this.observers) {
    Object.defineProperty(this, 'observers', {
      value: [],
      writable: true
    });
  }
  
  if (!this.update) {
    Object.defineProperty(this, 'update', {
      configurable: true,
      writable: true,
      value: function(action, data) {
        console.log('No update function has been set for this object yet.');
        // Overwrite this function with an update function specific to the model, view, or collection
      }
    });
  }
  
  Object.defineProperty(this, 'notify', {
    value: function(action, data) {
      var subs = this.observers.filter(function(sub) {
        return sub.action == action;
      });
      
      this.observers.forEach(function(sub) {
        sub.observer.update(sub.action, data);
      });
    }.bind(this)
  });

  Object.defineProperties(this.observers, {
    'add': {
      value: function(action, observer) {
        var sub = {
          action: action,
          observer: observer
        };
        
        this.observers.push(sub);
      }.bind(this)
    },
    
    'remove': {
      value: function(action, observer) {
        this.observers.forEach(function(sub, i, arr) {
          if (sub.observer == observer && sub.action == action) {
            arr.splice(i, 1);
          }
        });
      }.bind(this)
    }
  });
};


// BASE MODEL
function Model(data) {
  IDBObj.call(this);
  Events.call(this);
  
  if (data) {
    augment(this, data);
  }
  
  delete this.model;
  
  Object.defineProperties(this, {
    'json': {
      get: function() {
        return JSON.stringify(this);
      }.bind(this)
    },
    
    'model': {
      enumerable: true,
      value: this.constructor.name
    },
    
    // Takes a hash of search criteria as its argument
    'search': {
      configurable: true,
      
      value: function(criteria) {
        checkAgainst(criteria, this);
      }.bind(this),
      
      writable: true,
    }
  });
};


// BASE COLLECTION
function Collection(data) {
  Events.call(data);
  
  delete data.model;
  
  Object.defineProperties(data, {
    'json': {
      get: function() {
        return JSON.stringify(this);
      }
    },
    
    'model': {
      enumerable: true,
      value: this.constructor.name
    },
    
    'search': {
      value: function() {
        // A search function for collections
      }
    }
  });
  
  return data;
};


// BASE VIEW
function View(model, options) {
  if (model) { this.model = model; }
  if (options) { augment(this, options); }
  
  // The optional media elements specifies whether you would only like to display the element on one media type (desktop/mobile)
  this.display = function(media) {
    if (media != 'mobile') { this.el.classList.remove('hideonDesktop'); }
    if (media != 'desktop') { this.el.classList.remove('hideonMobile'); }
  }.bind(this);
  
  this.hide = function(media) {
    if (media != 'mobile') { this.el.classList.add('hideonDesktop'); }
    if (media != 'desktop') { this.el.classList.add('hideonMobile'); }
  }.bind(this);
  
  this.toggleDisplay = function(media) {
    this.el.classList.toggle('hideonMobile');
    this.el.classList.toggle('hideonDesktop');    
  }.bind(this);
  
  Events.call(this);
};