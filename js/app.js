// app.js
var app = {};

// Polyfill for the .startsWith() string method ( String.prototype.startsWith() )
// See MDN for more details:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FString%2FstartsWith
if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function(searchString, position) {
      position = position || 0;
      return this.lastIndexOf(searchString, position) === position;
    }
  });
}

// Constructors for linguistic/database objects
app.constructors = {
  Corpus: function(name, documents, languages, lexicons, mediaFiles, texts) {
    // Populates corpus properties
    this.name = name;
    this.documents = documents;
    this.languages = languages;
    this.lexicons = lexicons;
    this.mediaFiles = mediaFiles;
    this.texts = texts;
    Object.defineProperty(this, 'model', {
      enumerable: true,
      value: 'Corpus'
    });

    // Creates a JSON-only object for storage in IndexedDB (methods will need to be added upon retrieval)
    Object.defineProperty(this, 'toJSON', {
      value: function() {
        var jsonObj = {};
        var keys = Object.keys(this);
        keys.forEach(function(key) {
          jsonObj[key] = this[key];
        }.bind(this));
        return jsonObj;
      }
    });

    // Adds a JSON-only version of this corpus to the database and sets the ID for this corpus based on its database index
    // This function is NOT called automatically - remember to run it when you create a new Corpus
    Object.defineProperty(this, 'addToCorpora', {
      value: function(successCallback) {
        var setID = function(indexes) {
          Object.defineProperty(this, 'id', {
            enumerable: true,
            value: indexes[0]
          });
          if (typeof successCallback === 'function') {
            successCallback();
          }
        }.bind(this);
        idb.add([ this.toJSON() ], 'corpora', setID);
      }
    });

    // Makes this corpus the current corpus
    Object.defineProperty(this, 'setAsCurrent', {
      value: function(callback) {
        app.preferences.currentCorpus = this;
        if (typeof callback === 'function') {
          callback();
        }
      }
    });
  },

  Text: function(mediaFiles, phrases, persons, tags, titles) {
    // Populates text properties
    this.mediaFiles = mediaFiles;
    this.phrases = phrases;
    this.persons = persons;
    this.tags = tags;
    this.titles = titles;
    Object.defineProperty(this, 'model', {
      enumerable: true,
      value: 'Text'
    });

    // Creates a JSON-only object for storage in IndexedDB (methods will need to be added upon retrieval)
    Object.defineProperty(this, 'toJSON', {
      value: function() {
        var jsonObj = {};
        var keys = Object.keys(this);
        keys.forEach(function(key) {
          jsonObj[key] = this[key];
        }.bind(this));
        return jsonObj;
      }
    });

    // Adds this text to the specified corpus in the database and returns the ID of that corpus
    Object.defineProperty(this, 'addToCorpus', {
      value: function(corpusID) {
        idb.pushUpdate(corpusID, 'texts', this.id, 'corpora');
      }
    });

    // Adds a JSON-only version of this text to the database and sets the ID for this text based on its database index
    // This function is NOT run automatically - remember to run it when you create a new text
    Object.defineProperty(this, 'addToTexts', {
      value: function() {
        var setID = function(indexes) {
          Object.defineProperty(this, 'id', {
            enumerable: true,
            value: indexes[0]
          });
        }.bind(this);
        var textID = idb.add([ this.toJSON() ], 'texts', setID);
      }
    });

    Object.defineProperty(this, 'display', {
      value: function() {
        page.nodes.textTitles = document.querySelector('#detailsPane .titles');
        page.nodes.phrases = document.querySelector('#detailsPane .phrases');

        var makePlaceholder = function() {
          var node = document.createElement('input');
          node.dataset.titleIndex = 0;
          node.classList.add('unicode');
          node.classList.add('textTitle');
          node.value = 'Click here to enter a title for this text';
          page.nodes.textTitles.appendChild(node);
        };
        
        page.nodes.textTitles.innerHTML = '';

        if (this.titles.length === 0) {
          makePlaceholder();
        }

        this.titles.forEach(function(title, i) {
          if (title.titleText === '') {
            makePlaceholder(i);
          } else {
            var node = document.createElement('input');
            node.dataset.titleIndex = i;
            node.classList.add('unicode');
            node.classList.add('textTitle');
            node.value = title.titleText;
            page.nodes.textTitles.appendChild(node);
          }
        });
      }
    });

    // Sets this text as the current text - does NOT display it; the .display() method must be called separately
    Object.defineProperty(this, 'setAsCurrent', {
      value: function() {
        app.preferences.currentText = this;
      }
    });
  }
};

app.initialize = function() {
  if (localStorage.wugbotPreferences === 'undefined' || localStorage.wugbotPreferences === undefined) {
    app.preferences = {
      currentCorpus: null,
      currentText: null,
      currentWorkview: 'texts'
    };
  } else {
    app.preferences = JSON.parse(localStorage.wugbotPreferences);
  }
  
  if (app.preferences.currentCorpus !== null) {
    app.preferences.currentCorpus = idb.reconstruct(app.preferences.currentCorpus);
    app.preferences.currentCorpus.setAsCurrent();
  }
  
  if (app.preferences.currentText !== null) {
    app.preferences.currentText = idb.reconstruct(app.preferences.currentText);
    app.preferences.currentText.setAsCurrent();
  }
  
  if (app.preferences.currentWorkview !== null) {
    page.render(app.preferences.currentWorkview);
    
    if (app.preferences.currentCorpus === null) {
      page.popups.manageCorpora.render();
    }
  } else {
    page.render();
  }
};

app.savePreferences = function() {
  localStorage.wugbotPreferences = JSON.stringify(app.preferences, null, 2);
};

// Some of these were breaking while I was working on other things, so I commented them out for now [DWH]
/*
app.p = new Phrase({
  transcription: 'me llamo wugbot',
  translation: 'call me wugbot'
});

app.pv = new PhraseView({
  el: document.querySelector('#phrases'),

  model : app.p,

  render: function(){
    var template = hydrate('#phraseTemplate', this.model);
    this.el.appendChild(template);
    return this;
  }
});

app.pp = new Phrases({
  models: [
    {
      transcription: 'me llamo wugbot',
      translation: 'Call me Wugbot.'
    },
    {
      transcription: 'estoy aqui para cortar árboles',
      translation: 'I’m here to cut down trees.'
    }
  ]
})

app.w = new Word(
  {
    token: 'casa',
    gloss: 'house'
  }
);

app.wv = new WordView({
  el: document.querySelector('#entries'),

  model : app.w,

  render: function(){
    var template = hydrate('#wordTemplate', this.model);
    this.el.appendChild(template);
    return this;
  }
});

app.pv = new PhraseView({
  el: document.querySelector('#phrases'),

  model : app.p,

  render: function(){
    var template = hydrate('#phraseTemplate', this.model);
    this.el.appendChild(template);
    return this;
  }
});

app.ppv = new PhrasesView({
  el: document.querySelector('#phrases'),

  collection : app.pp,
  modelView : PhraseView,

  markup : template('#phraseTemplate', this.model),

  render: function(){
    this.el.appendChild(this.markup);
    return this;
  }
});

app.wv.render();
app.pv.render();
app.ppv.render();
*/