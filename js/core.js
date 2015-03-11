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
        morpheme.breadcrumb = word.breadcrumb + '_' + m;
      });
    };
    
    var resetPhrase = function(phrase) {
      phrase.words.forEach(function(word, w) {
        word.breadcrumb = phrase.breadcrumb + '_' + w;
        resetWord(word);
      });
    };
    
    var resetText = function(text) {
      text.phrases.forEach(function(phrase, p) {
        phrase.breadcrumb = text.id + '_' + p;
        resetPhrase(phrase);
      });
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
function ObserverList() {
  Object.defineProperties(this, {
    'observers': {
      value: [],
      writable: true
    },
    
    'notify': {
      value: function(action, data) {
        var subs = this.observers.filter(function(sub) {
          return sub.action == action;
        });

        this.observers.forEach(function(sub) {
          sub.observer.update(sub.action, data);
        });
      }.bind(this)
    },
    
    'update': {
      value: function(action, data) {
        console.log('No update function has been set for this object yet.');
        // Overwrite this function with an update function specific to the model, view, or collection
      },
      writable: true
    }
  });
  
  Object.defineProperties(this.observers, {
    'add': {
      value: function(observer, action) {
        var sub = {
          action: action,
          observer: observer
        };
        
        this.observers.push(sub);
      }.bind(this)
    },
    
    'remove': {
      value: function(observer, action) {
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
  ObserverList.call(this);
  
  if (data) {
    augment(this, data);
  }
  
  delete this.model;
  
  Object.defineProperties(this, {
    'json': {
      get: function() {
        return JSON.stringify(this);
      }
    },
    
    'model': {
      enumerable: true,
      value: this.constructor.name
    },
    
    // Takes a hash of criteria as its argument
    // Probably going to be replaced by a model search function
    // Might call idb.search(lingType, criteria)
    'search': {
      value: function(criteria) {
        checkAgainst(criteria, this);
      }
    }
  });
};

// BASE COLLECTION
function Collection(data) {
  ObserverList.call(data);
  
  Object.defineProperties(data, {
    'json': {
      get: function() {
        return JSON.stringify(this);
      }
    },
    
    'search': {
      value: function() {
        // Pat's super awesome collection search function goes here
      }
    }
  });
  
  return data;
};

// BASE VIEW
// This view is the prototype for both item and collection views
// Options that can be specified for all views:
// - el: The DOM element associated with this view
// - template: The HTML template associated with this view
function View(model, options) {
  ObserverList.call(this);
  
  this.model = model;
  
  if (options) {
    augment(this, options);
  }
  
  // Displays a DOM element that was previously hidden
  // The optional media argument specifies whether you would only like to display the element on desktop or mobile
  this.display = function(media) {
    if (media !== 'mobile') {
      this.el.classList.remove('hideonDesktop');
    }
    if (media !== 'desktop') {
      this.el.classList.remove('hideonMobile');
    }
  };
  
    // Hides a DOM element, and content reflows to fill that empty space
  // The optional media argument specifies whether you would only like to hide the element on desktop or mobile
  this.hide = function(media) {
    if (media !== 'mobile') {
      this.el.classList.add('hideonDesktop');
    }
    
    if (media !== 'desktop') {
      this.el.classList.add('hideonMobile');
    }
  };

  // Hides the element if it is currently displayed, and displays the element if it is currently hidden
  this.toggleDisplay = function() {
    this.el.classList.toggle('hideonMobile');
    this.el.classList.toggle('hideonDesktop');
  };
};
