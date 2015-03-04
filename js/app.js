// The single controller for all views and models
// The app namespace is initialized in script.js, where it contains a few site-general control functions

// The preferences object stores user preferences like currentCorpus, currentText, etc.
// The preferences object is initialized from within the app.initialize function
// The preferences object is stringified and saved into local storage when the window is closed
// Eventually, the preferences object will be a property of a user object

// Dependencies: script.js, data.js

// A media node for storing information about current media playback
app = {};

app.media = {
  endTime: null
};

// Loads the preferences from local storage and opens a database connection
app.initialize = function() {
  // If no wugbotPreferences exist in local storage, set to defaults
  // This conditional statment matches on a string, because local storage stores undefined as a string
  if (localStorage.wugbotPreferences === 'undefined') {
    app.preferences.currentCorpus = null;
    app.preferences.currentWorkview = 'texts';
    app.preferences.displayState = {
      overviewPane: 'open',
      toolbar: 'open'
    };
  } else {
    var preferences = JSON.parse(localStorage.wugbotPreferences);
    
    // If there's a setting for currentCorpus in local storage, set app.preferences.currentCorpus equal to it
    // Otherwise, leave it as null
    if (!preferences.currentCorpus) {
      app.preferences.currentCorpus = null;
    } else {
      app.preferences.currentCorpus = preferences.currentCorpus;
    }
    
    if (!preferences.currentWorkview) {
      app.preferences.currentWorkview = 'texts';
    } else {
      app.preferences.currentWorkview = preferences.currentWorkview;
    }
    
    if (!preferences.displayState) {
      app.preferences.displayState = {
        overviewPane: 'open',
        toolbar: 'open'
      };
    } else {
      app.preferences.displayState = preferences.displayState;
    }
  }
  
  // Open the database, and once it's open, render the page
  idb.open(idb.currentDatabase, views.page.render);
};


// Handles any events sent from either of the media modules
app.mediaEvent = function(ev) {
  if (ev.target.id === 'addMediaButton') {
    views.popups.fileUpload.promptFile(Media.add);
  }
  
  if (ev.target.tagName === 'LI') {
    views.page.display(views.workviews.media.detailsPane);
    
    var setAudio = function(file) {
      var url = URL.createObjectURL(file);
      views.workviews.media.audioPlayer.src = url;
    };
    
    idb.get(Number(ev.target.dataset.id), 'media', setAudio);
  }
};

app.pageEvent = function(ev) {
  if (ev.type === 'submit') {
    ev.preventDefault();
    var input = views.page.panes.toolbar.searchBox.value;
    // Escapes regex special characters (taken from MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions?redirectlocale=en-US&redirectslug=JavaScript%2FGuide%2FRegular_Expressions#Using_Special_Characters)
    input = input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var searchText = new RegExp(input, "g");
    var tier = views.page.panes.toolbar.selectedTier;
    //Orthography is always null for now, since all orthographies are automatically set to null for the time being
    idb.search(searchText, tier, null, views.page.panes.toolbar.displayResults);
  }
  
  if (ev.target.classList.contains('play')) {
    var textID = Number(ev.target.parentNode.dataset.breadcrumb.match(/text[0-9]+/)[0].replace('text', ''));
    var phraseIndex = Number(ev.target.parentNode.dataset.breadcrumb.match(/phrase[0-9]+/)[0].replace('phrase', ''));
    
    idb.get(textID, 'texts', function(text) {
      text.phrases[phraseIndex].play();
    });
  }
  
  if (ev.target.id === 'collapseLeft') {
    views.page.panes.overviewPane.toggleDisplay();
  }
  
  if (ev.target.id === 'collapseRight') {
    views.page.panes.toolbar.toggleDisplay();
  }
};

// Handles popup events and calls the appropriate method and object functions for that event
// Should be called by the event listener any time an event happens within the #popups div
app.popupEvent = function(ev) {
  if (ev.target.classList.contains('icon')) {
    views.page.hide(ev.target.parentNode);
  } else if (ev.target.id === 'switchLayoutButton') {
    views.page.switchLayout();
    views.popups.settings.close();
  } else if (ev.type === 'submit') {
    ev.preventDefault();
    var corpusName = views.popups.manageCorpora.input.value;
    var setCorpus = function() {
      views.page.corpusSelector.render(corpusName);
    };
    var corpus = new Corpus({ name: corpusName }, setCorpus);
    corpus.addToDatabase(setCorpus);
    corpus.setAsCurrent();
    views.popups.manageCorpora.close();
  }
};

app.preferences = {
  setCorpus: function(index) {
    if (index) {
      var set = function(corpus) {
        app.preferences.currentCorpus = corpus;
      };
      
      idb.get(index, 'corpora', set);
    } else {
       views.page.corpusSelector.el.value = app.preferences.currentCorpus;
    }
  },
  
  toJSON: function() {
    var jsonObj = {};
    for (key in app.preferences) {
      jsonObj[key] = app.preferences[key];
    }
    return jsonObj;
  }
};

app.savePreferences = function() {
  localStorage.wugbotPreferences = JSON.stringify(app.preferences, null, 2);
};

app.textsEvent = function(ev) {
  if (ev.type === 'timeupdate') {
    if (ev.target.currentTime > app.media.endTime) {
      ev.target.pause();
    }
  }
  
  if (ev.type === 'input') {
    if (ev.target.dataset.id.startsWith('title')) {
      var titleIndex = Number(ev.target.dataset.id);
      var text = ev.target.value;
      app.preferences.currentText.titles[titleIndex].text = text;
    };
  }
  
  if (ev.type === 'blur') {
    idb.update(app.preferences.currentText.id, 'titles', app.preferences.currentText.titles, 'texts', views.workviews.texts.render);
  }
  
  if (ev.type === 'keyup') {
    if (ev.keyCode === 13) {
      if (ev.target.classList.contains('title')) {
        var titleIndex = Number(ev.target.dataset.id);
        var text = ev.target.value;
        app.preferences.currentText.titles[titleIndex].text = text;
      }
      
      ev.target.blur();
    } else if (ev.keyCode === 27) {
      if (ev.target.classList.contains('title')) {
        var titleIndex = Number(ev.target.dataset.id);
        var text = ev.target.value;
        app.preferences.currentText.titles[titleIndex].text = text;
      }
      
      ev.target.blur();
    }
  }
  
  if (ev.type === 'click') {
    if (ev.target.tagName === 'LI') {
      var render = function(text) {
        text.setAsCurrent();
        text.display();
      };
      
      idb.get(Number(ev.target.dataset.id), 'texts', render);
    }
    
    switch (ev.target.id) {
      case 'addNewTextButton':
        console.log('Adding a new text!');
        break;
      case 'addTextMediaButton':
        views.popups.blank.render(views.workviews.texts.promptMedia);
        break;
      case 'addMediaToTextButton':
        var mediaID = Number(document.querySelector('#blankPopup select').value);
        if (mediaID) {
          app.preferences.currentText.media.push(mediaID);
        }
        idb.pushUpdate(app.preferences.currentText.id, 'media', mediaID, 'texts');
        views.popups.blank.close();
        views.workviews.texts.render();
        break;
      case 'deleteTextButton':
        var response = confirm('Are you sure you want to delete this text? Have you made a backup first?');
        if (response) {
          var rerender = function() {
            app.preferences.currentText = null;
            views.page.hide(views.workviews.texts.detailsPane);
            views.workviews.texts.render();
          };
          app.preferences.currentText.delete(rerender);
        }
        break;
      case 'importTextButton':
        var convert = function() {
          var add = function(text) {
            text.addToDatabase(views.workviews.texts.render);
          };
          
          tools.convert(add);
        };
        views.popups.fileUpload.promptFile(convert);
        break;
      default:
    }
  }
};