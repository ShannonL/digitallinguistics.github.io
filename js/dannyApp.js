// App UI Javascript for Danny's app

// APP
// The UI, with regions/interfaces and general nav views

var app = {
  initialize: function() {
    var initSequence = function() {
      // Load the preferences
      if (localStorage.wugbotPreferences != 'undefined') { app.preferences = JSON.parse(localStorage.wugbotPreferences); }
      
      // Render and set corpus selector
      if (app.preferences.currentCorpus) {
        idb.hydrate(app.preferences.currentCorpus);
        app.corpusSelector.render(app.preferences.currentCorpus.id);
      } else {
        idb.getAll('corpora', function(corpora) {
          if (corpora.length == 0) {
            popups.manageCorpora.display();
          } else {
            app.corpusSelector.render();
          }
        });
      }
      
      // Set the current workview
      if (app.preferences.currentWorkview) {
        app.router.setWorkview(app.preferences.currentWorkview);
      } else {
        app.router.setWorkview('texts');
      }
    };
    
    idb.open('WugbotDev', initSequence);
  },
  
  // Change this function to use popups.blank instead
  notify: function(text) {
    alert(text);
  },
  
  save: function() {
    localStorage.wugbotPreferences = JSON.stringify(app.preferences, null, 2);
  },
  
  preferences: {}
};


// ROUTER
var Router = function(options) {
  Events.call(this, options);
  
  this.setWorkview = function(workview) {
    app.appNav.buttons.forEach(function(button) {
      button.classList.remove('underline');
      if (button.textContent.toLowerCase() == workview) { button.classList.add('underline'); }
    });
    
    this.notify('setWorkview', workview);
    
    switch (workview) {
      case 'documents':
        idb.get(app.preferences.currentCorpus.documents, 'documents', function(docs) {
          var docs = new models.DocumentsCollection(docs);
          new modules.DocumentsOverview(docs, modules.documentsOverviewDefaults).render();
        });
        break;
      case 'lexicon':
        new modules.LexiconOverview(null, modules.lexiconOverviewDefaults).render();
        break;
      case 'media':
        new modules.MediaOverview(null, modules.mediaOverviewDefaults).render();
        break;
      case 'orthographies':
        new modules.OrthographiesOverview(null, modules.orthographiesOverviewDefaults).render();
        break;
      case 'tags':
        new modules.TagsOverview(null, modules.tagsOverviewDefaults).render();
        break;
      case 'texts':
        new modules.TextsOverview(null, modules.textsOverviewDefaults).render();
        break;
    }
    
    app.preferences.currentWorkview = workview;
  };
  
  this.update = function(action, data) {
    if (action == 'appNavClick') { this.setWorkview(data); }
    
    if (action == 'selectCorpus') {
      if (data == 'manage') {
        popups.manageCorpora.display();
      } else if (data != 'select') {
        idb.get(Number(data), 'corpora', function(results) { results[0].setAsCurrent(); });
      }
    }
  };
};

app.router = new Router();


// APP VIEWS
var Nav = function(options) {
  View.call(this, null, options);  
  delete this.model;
};

var Module = function(model, options) {
  View.call(this, model, options);
  app.router.observers.add(this, 'setWorkview');
};

var Popup = function(options) {
  View.call(this, null, options);
  delete this.model;
};


// MISC
app.corpusSelector = new View(null, {
  el: $('#corpusSelector'),
  
  handlers: [{
    el: this.el,
    evType: 'change',
    functionCall: function(ev) { this.notify('selectCorpus', ev.target.value); }
  }],
  
  observers: [{ action: 'selectCorpus', observer: app.router }],
  
  // Optionally takes a corpus ID to set the value to after rendering
  render: function(corpusID) {    
    idb.getAll('corpora', function(corpora) {
      this.el.innerHTML = '';
      
      var option = createElement('option', { textContent: 'Select a corpus', value: 'select' });
      this.el.appendChild(option);
      option.classList.add('unicode');
      
      corpora.forEach(function(corpus) {
        var option = createElement('option', { textContent: corpus.name, value: corpus.id });
        this.el.appendChild(option);
        option.classList.add('unicode');
      }, this);
      
      var option = createElement('option', { textContent: 'Manage corpora', value: 'manage' });
      this.el.appendChild(option);
      option.classList.add('unicode');

      if (corpusID) {
        this.el.value = corpusID;
      }
    }.bind(this));
  }
});


// NAVS
app.appNav = new Nav({
  el: $('#appNav'),
  buttons: $('#appNav a'),
  
  handlers: [{
    el: this.el,
    evType: 'click',
    functionCall: function(ev) { app.appNav.notify('appNavClick', ev.target.textContent.toLowerCase()); }
  }],
  
  observers: [{ action: 'appNavClick', observer: app.router }],
  
  update: function(action, data) {
    if (data == 'boxIcon') {
      this.toggleDisplay();
      app.mainNav.hide();
    }
  }
});

app.mainNav = new Nav({
  el: $('#mainNav'),
  
  update: function(action, data) {
    if (data == 'menuIcon') {
      this.toggleDisplay();
      app.appNav.hide();
    }
  }
});

app.navIcons = new Nav({
  el: $('#navIcons'),
  
  handlers: [{
    el: this.el,
    evType: 'click',
    functionCall: function(ev) { app.navIcons.notify('navIconClick', ev.target.id); }
  }],
  
  observers: [
    { action: 'navIconClick', observer: app.appNav },
    { action: 'navIconClick', observer: app.mainNav }
  ]
});


// MODULES
var modules = {};

modules.DocumentsOverview = function(collection, options) {
  Module.call(this, collection, options);
};

modules.documentsOverviewDefaults = {
  el: $('#documentsOverview'),
  workview: 'documents',
  
  render: function() {
    this.display();
  },
  
  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.LexiconOverview = function(collection, options) {
  Module.call(this, collection, options);
};

modules.lexiconOverviewDefaults = {
  el: $('#lexiconOverview'),
  workview: 'lexicon',
  
  render: function() {
    this.display();
  },

  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.MediaOverview = function(collection, options) {
  Module.call(this, collection, options);
};

modules.mediaOverviewDefaults = {
  el: $('#mediaOverview'),
  workview: 'media',

  render: function() {
    this.display();
  },
  
  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.OrthographiesOverview = function(collection, options) {
  Module.call(this, collection, options);
};

modules.orthographiesOverviewDefaults = {
  el: $('#orthographiesOverview'),
  workview: 'orthographies',
  
  render: function() {
    this.display();
  },

  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.TagsOverview = function(collection, options) {
  Module.call(this, collection, options);
};

modules.tagsOverviewDefaults = {
  el: $('#tagsOverview'),
  workview: 'tags',
  
  render: function() {
    this.display();
  },

  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.TextsOverview = function(collection, options) {
  Module.call(this, collection, options);
};

modules.textsOverviewDefaults = {
  el: $('#textsOverview'),
  importButton: $('#importTextButton'),
  workview: 'texts',
  
  handlers: [{
    el: this.importButton,
    evType: 'click',
    functionCall: function() {
      popups.fileUpload.render(function(file) {
        tools.elan2json(file, ekegusiiColumns, this.render);
      });
    }
  }],
  
  render: function() {
    this.display();
  },
  
  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.DocumentsDetail = function(model, options) {
  Module.call(this, collection, options);
};

modules.documentsDetailDefaults = {
  el: $('#documentsDetail'),
  workview: 'documents',
  
  render: function() {
    this.display();
  },

  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.LexiconDetail = function(model, options) {
  Module.call(this, collection, options);
};

modules.lexiconDetailDefaults = {
  el: $('#lexiconDetail'),
  workview: 'lexicon',
  
  render: function() {
    this.display();
  },
  
  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.MediaDetail = function(model, options) {
  Module.call(this, collection, options);
};

modules.mediaDetailDefaults = {
  el: $('#mediaDetail'),
  workview: 'media',
  
  render: function() {
    this.display();
  },
  
  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.OrthographiesDetail = function(model, options) {
  Module.call(this, collection, options);
};

modules.orthographiesDetailDefaults = {
  el: $('#orthographiesDetail'),
  workview: 'orthographies',
  
  render: function() {
    this.display();
  },

  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.TagsDetail = function(model, options) {
  Module.call(this, collection, options);
};

modules.tagsDetailDefaults = {
  el: $('#tagsDetail'),
  workview: 'tags',
  
  render: function() {
    this.display();
  },

  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};

modules.TextsDetail = function(model, options) {
  Module.call(this, collection, options);
};

modules.textsDetailDefaults = {
  el: $('#textsDetail'),
  workview: 'texts',
  
  render: function() {
    this.display();
  },

  update: function(action, data) {
    if (data != this.workview) { this.hide(); }
    app.router.observers.remove(this);
  }
};


// POPUPS
var popups = {};

popups.fileUpload = new Popup({
  el: $('#fileUploadPopup'),
  button: $('#fileUploadButton'),
  input: $('#fileUpload'),
  
  // Applies the callback function to the uploaded file when the 'Go' button is clicked
  render: function(goButtonCallback) {
    var processFile = function() {
      if (typeof goButtonCallback != 'function') {
        console.log('Define a function to run when the Go button is clicked.');
      } else {
        goButtonCallback(this.input.files[0]);
      }
      
      this.hide();
      
      this.button.removeEventListener('click', processFile);
    }.bind(this);
    
    this.button.addEventListener('click', processFile);
    
    this.display();
  }
});

popups.manageCorpora = new Popup({
  el: $('#manageCorporaPopup'),
  button: $('#createCorpusButton'),
  input: $('#corpusNameBox')
});

popups.manageCorpora.button.addEventListener('click', function(ev) {
  ev.preventDefault();
  var data = { name: popups.manageCorpora.input.value };
  var setCorpus = function() {
    app.corpusSelector.render(corpus.id);
    corpus.setAsCurrent();
  };
  var corpus = new models.Corpus(data, setCorpus);
  popups.manageCorpora.hide();
});

popups.settings = new Popup({
  el: $('#settingsPopup'),
  icon: $('#settingsIcon'),
  
  handlers: [{
    el: this.icon,
    evType: 'click',
    functionCall: this.toggleDisplay
  }]
});


// EVENT LISTENERS
$('#popups').addEventListener('click', function(ev) {
  if (ev.target.classList.contains('icon')) { popups[ev.target.parentNode.id.replace('Popup', '')].hide(); }
});
window.addEventListener('load', app.initialize);
window.addEventListener('unload', app.save);