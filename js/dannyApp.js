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
    
    Object.keys(modules).forEach(function(key) {
      modules[key].hide();
    });
    
    modules[workview + 'Overview'].render();
    
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

var Module = function(options) {
  View.call(this, null, options);
  delete this.model;
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
    evType: 'click'
    functionCall: function(ev) { this.notify('appNavClick', ev.target.textContent.toLowerCase()); }
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
  
  handlers: [{
    el: this.el,
    evType: 'click',
    functionCall: function(ev) { this.notify('navIconClick', ev.target.id); }
  }],
  
  observers: [
    { action: 'navIconClick', observer: app.appNav },
    { action: 'navIconClick', observer: app.mainNav }
  ],
  
  update: function(action, data) {
    if (data == 'menuIcon') {
      this.toggleDisplay();
      app.appNav.hide();
    }
  }
});

app.navIcons = new Nav({
  el: $('#navIcons')
});


// MODULES
var modules = {};

modules.documentsOverview = new Module({
  el: $('#documentsOverview'),
  
  render: function() {
    this.display();
  }
});

modules.lexiconOverview = new Module({
  el: $('#lexiconOverview'),
  
  render: function() {
    this.display();
  }
});

modules.mediaOverview = new Module({
  el: $('#mediaOverview'),

  render: function() {
    this.display();
  }
});

modules.orthographiesOverview = new Module({
  el: $('#orthographiesOverview'),
  
  render: function() {
    this.display();
  }
});

modules.tagsOverview = new Module({
  el: $('#tagsOverview'),
  
  render: function() {
    this.display();
  }
});

modules.textsOverview = new Module({
  el: $('#textsOverview'),
  importButton: $('#importTextButton'),
  
  render: function() {
    this.display();
  }
});

modules.documentsDetail = new Module({
  el: $('#documentsDetail'),
  
  render: function() {
    this.display();
  }
});

modules.lexiconDetail = new Module({
  el: $('#lexiconDetail'),
  
  render: function() {
    this.display();
  }
});

modules.mediaDetail = new Module({
  el: $('#mediaDetail'),
  
  render: function() {
    this.display();
  }
});

modules.orthographiesDetail = new Module({
  el: $('#orthographiesDetail'),
  
  render: function() {
    this.display();
  }
});

modules.tagsDetail = new Module({
  el: $('#tagsDetail'),
  
  render: function() {
    this.display();
  }
});

modules.textsDetail = new Module({
  el: $('#textsDetail'),
  
  render: function() {
    this.display();
  }
});


// POPUPS
var popups = {};

popups.fileUpload = new Popup({
  el: $('#fileUploadPopup'),
  button: $('#fileUploadButton'),
  input: $('#fileUpload'),
  
  // Applies the callback function to the uploaded file when the 'Go' button is clicked
  render: function(goButtonCallback) {
    var processFile = function() {
      goButtonCallback(this.input.files[0]);
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
    functionCall: popups.settings.toggleDisplay
  }]
});


// EVENT LISTENERS
$('#popups').addEventListener('click', function(ev) {
  if (ev.target.classList.contains('icon')) { popups[ev.target.parentNode.id.replace('Popup', '')].hide(); }
});
window.addEventListener('load', app.initialize);
window.addEventListener('unload', app.save);