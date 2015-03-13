models = {};

// ITEM MODELS (SINGULAR)
models.Document = function(data) {
  Model.call(this, data);
  // Maybe some methods to read the file to an array buffer, etc.
};

models.MediaFile = function MediaFile(data) {
  Model.call(this, data);
  // Maybe some methods to read the file to an array buffer, etc.
};

models.Corpus = function Corpus(data) {
  Model.call(this, data);
  
  if (!this.documents) { this.documents = []; }
  if (!this.languages) { this.languages = []; }
  if (!this.lexicons) { this.lexicons = []; }
  if (!this.media) { this.media = []; }
  if (!this.texts) { this.texts = []; }
  
  Object.defineProperties(this, {
    // Retrieves all the specified type of object in this corpus from IndexedDB
    'get': {
      value: function(type, callback) {
        idb.get(this[type], type, callback);
      }.bind(this)
    },
    
    'setAsCurrent': {
      value: function() {
        app.preferences.currentCorpus = this;
      }.bind(this)
    }
  });
};

// Abbr: lang
models.Language = function Language(data) {
  Model.call(this, data);
};

// Abbr: t
models.Text = function Text(data) {
  Model.call(this, data);
  
  if (this.phrases) {
    this.phrases = this.phrases.map(function(phraseData) {
      return new models.Phrase(phraseData);
    });
    
    this.phrases = new models.Phrases(this.phrases);
  } else {
    this.phrases = new models.Phrase([]);
  }
  
  this.abbreviation = this.abbreviation || '';
  this.type = this.type || '';
  this.genre = this.genre || '';
  this.analyses = this.analyses || [];
  this.media = this.media || [];
  this.persons = this.persons || [];
  this.tags = this.tags || [];
  this.titles = this.titles || { en: '' };
  this.custom = this.custom || {};
  
  Object.defineProperties(this, {
    'addToCorpus': {
      value: function() {
        app.preferences.currentCorpus.texts.push(this.id);
      }.bind(this)
    },
    
    'render': {
      value: function() {
        
      }.bind(this)
    }
  });
};

// Abbr: p
models.Phrase = function Phrase(data) {
  Model.call(this, data);
  
  if (this.words) {
    this.words = this.words.map(function(wordData) {
      return new models.Word(wordData);
    });
    
    this.words = new models.Words(this.words);
  }
};

// Abbr: w
models.Word = function Word(data) {
  Model.call(this, data);
};

// Abbr: lex
models.Lexeme = function Lexeme(data, callback) {
  Model.call(this, data);
  this.store(callback);
};

// Morphemes do not have a model - only lexemes

// Abbr: cxn
models.Construction = function Construction() {
  Model.call(this, data);
};

models.Tag = function Tag() {
  Model.call(this, data);
};


// COLLECTIONS MODELS (PLURAL)
models.Documents = function Documents(data) {
  var coll = data.map(function(documentData) {
    return new models.Document(documentData);
  });
  
  var documents = new Collection(coll);
  
  return documents;
};

models.MediaFiles = function MediaFiles(data) {
  var coll = data.map(function(mediaData) {
    return new models.MediaFile(mediaData);
  });
  
  var media = new Collection(coll);
  
  return media;
};

// Doesn't seem like we need a Corpora collection model

models.Languages = function Languages(data) {
  var coll = data.map(function(languageData) {
    return new models.Language(languageData);
  });
  
  var languages = new Collection(coll);
  
  return languages;
};

models.Texts = function Texts(data) {
  var coll = data.map(function(textData) {
    return new models.Text(textData);
  });
  
  var texts = new Collection(coll);
  
  // Displays a list of all the texts in this collection; each text gets a <li id=[breadcrumb]>
  // populateListItem is a function that has a text and an empty <li> as its arguments; use this to populate the <li> with content from the text
  texts.list = function(wrapper, populateListItem) {
    this.forEach(function(text) {
      var li = createElement('li');
      li.dataset.id = text.id;
      populateListItem(text, li);
      li.classList.add('textsListItem');
      wrapper.appendChild(li);
    });
    
  };
  
  return texts;
};

models.Phrases = function Phrases(data) {
  var coll = data.map(function(phraseData) {
    return new models.Phrase(phraseData);
  });
  
  var phrases = new Collection(coll);
  
  return phrases;
};

models.Words = function Words(data) {
  var coll = data.map(function(wordData) {
    return new models.Word(wordData);
  });
  
  var words = new Collection(coll);
  
  return words;
};

// Morphemes don't have a model - a collection of morphemes is actually a collection of lexemes
models.Morphemes = function Morphemes(data) {
  var coll = data.map(function(lexemeData) {
    return new models.Lexeme(lexemeData);
  });
  
  var morphemes = new Collection(coll);
  
  return morphemes;
};

models.Lexicon = function Lexicon(data) {
  var coll = data.map(function(lexemeData) {
    return new models.Lexeme(lexemeData);
  });
  
  var lexicon = new Collection(coll);
  
  return lexicon;
};