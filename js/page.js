// Contains the 'page' functions, which all focus on display, render, and event listeners
// The page object itself is created in script.js, since some of the page functions are site-wide

// There are several types of objects under the page hash, each given its own subclass
// - page.nodes: DOM nodes that get referenced in more than one function
// - page.views: Can be thought of as interfaces, regions, workviews, or workspaces
// - page.popups: Functionality tied to popup windows
// - page.function(): general functions like page.display()

page.views = {};
page.popups = {};
// page.nodes is instantiated in the script.js file

// page.nodes
page.nodes.addMediaFileButton = document.querySelector('#addMediaFileButton');
page.nodes.addNewTextButton = document.querySelector('#addNewTextButton');
page.nodes.addTextMediaButton = document.querySelector('#addTextMediaButton');
page.nodes.audioPlayer = document.querySelector('#audioPlayer');
page.nodes.blankPopup = document.querySelector('#blankPopup');
page.nodes.boxIcon = document.querySelector('#boxIcon');
page.nodes.corpusSelector = document.querySelector('#corpusSelector');
page.nodes.createCorpusButton = document.querySelector('#createCorpusButton');
page.nodes.desktopCSS = document.querySelector('#desktopCSS');
page.nodes.fileUpload = document.querySelector('#fileUpload');
page.nodes.importTextButton = document.querySelector('#importTextButton');
page.nodes.mediaFilesList = document.querySelector('#mediaFilesList');
page.nodes.mobileCSS = document.querySelector('#mobileCSS');
page.nodes.newCorpusForm = document.querySelector('#newCorpusForm');
page.nodes.processFileButton = document.querySelector('#processFileButton');
page.nodes.popups = document.querySelector('#popups');
page.nodes.settingsButton = document.querySelector('#settingsButton');
page.nodes.switchLayoutButton = document.querySelector('#switchLayoutButton');
page.nodes.phraseDisplayArea = document.querySelector('#detailsPane .phrases');
page.nodes.textsList = document.querySelector('#textsList');
page.nodes.textTitles = document.querySelector('.textsModule .titles');

// page.function()
// Renders the entire page, optionally specifying the workview to render
page.render = function(view) {
  if (app.preferences.currentCorpus === null) {
    page.popups.manageCorpora.render();
  }
  
  var navButtons = document.querySelectorAll('#appNav a');
  for (var i=0; i<navButtons.length; i++) {
    navButtons[i].classList.remove('underline');
  }

  var workviews = document.querySelectorAll('.module');
  for (var i=0; i<workviews.length; i++) {
    page.hide(workviews[i]);
  }

  if (page.views[view] !== undefined) {    
    page.views[view].render();
    app.preferences.currentWorkview = view;
    
    for (var i=0; i<navButtons.length; i++) {
      if (navButtons[i].textContent.toLowerCase() === view) {
        navButtons[i].classList.add('underline');
      }
    }
  }
  
  page.views.corpusSelector.render();
};

page.switchLayout = function() {
  var small = '(min-width: 1000px)';
  var large = '(max-width: 1000px)';
  if (page.nodes.desktopCSS.media === small) {
    page.nodes.desktopCSS.media = large;
    page.nodes.mobileCSS.media = small;
  } else {
    page.nodes.desktopCSS.media = small;
    page.nodes.mobileCSS.media = large;
  }
};

// page.views
page.views.corpusSelector = {
  el: page.nodes.corpusSelector,
  
  render: function(callback) {
    page.nodes.corpusSelector.innerHTML = '';
    
    var displayCorpora = function(corpora) {
      corpora.sort(function(a, b) { if (a.name > b.name) { return 1; } });
      
      app.createOption('placeholder', 'Select a corpus', 'placeholder', '#corpusSelector');
      
      corpora.forEach(function(corpus) {
        app.createOption(corpus.id, corpus.name, corpus.id, '#corpusSelector');
      });
      
      app.createOption('manage', 'Manage corpora', 'manage', '#corpusSelector');

      if (app.preferences.currentCorpus !== null) {
        page.nodes.corpusSelector.value = app.preferences.currentCorpus.id;
      }
      
      // Chome automatically sets the selected index to -1, while Firefox sets it to 0
      if (page.nodes.corpusSelector.selectedIndex === -1) {
        page.nodes.corpusSelector.selectedIndex = 0;
      }
      
      if (typeof callback === 'function') {
        callback();
      }
    }
    
    idb.getAll('corpora', displayCorpora);
  }
};

page.views.media = {
  els: document.querySelectorAll('.mediaModule'),
  
  hide: function() {
    for (var i=0; i<this.els.length; i++) {
      page.hide(this.els[i]);
    }
  },

  render: function() {
    var displayMediaList = function(media, keys) {
      page.nodes.mediaFilesList.innerHTML = '';
      media.forEach(function(file, i) {
        var listItem = document.createElement('li');
        listItem.dataset.id = keys[i];
        listItem.textContent = file.name;
        page.nodes.mediaFilesList.appendChild(listItem);
      });
    };
    idb.getAll('media', displayMediaList);
    
    for (var i=0; i<this.els.length; i++) {
      page.display(this.els[i]);
    }
  },
  
  setMedia: function(mediaID) {
    var loadPlayer = function(file) {
      page.nodes.audioPlayer.src = URL.createObjectURL(file);
    };
    idb.get(mediaID, 'media', loadPlayer);
  },
  
  toggleDisplay: function() {
    for (var i=0; i<this.els.length; i++) {
      page.toggleDisplay(this.els[i]);
    }
  }
};

page.views.texts = {
  els: document.querySelectorAll('.textsModule'),
  
  displayTextsList: function() {
    page.nodes.textsList.innerHTML = '';
    
    var display = function(texts, keys) {
      texts.forEach(function(text, i) {
        var listItem = document.createElement('li');
        listItem.dataset.id = keys[i];
        if (text.titles[0].titleText === '') {
          listItem.textContent = '[no title]';
        } else {
          listItem.textContent = text.titles[0].titleText;
        }
        textsList.appendChild(listItem);
      });
    };
    
    idb.getAll('texts', display);
  },
  
  hide: function() {
    for (var i=0; i<this.els.length; i++) {
      page.hide(this.els[i]);
    }
  },
  
  importText: function() {
    var add = function(text) {
      text.addToTexts(page.views.texts.displayTextsList);
      page.notify('Text successfully imported.');
      text.setAsCurrent();
      text.display();
    };
    tools.convert(add);
  },
  
  render: function() {
    var textsList = page.nodes.textsList;
    
    this.displayTextsList();
    
    for (var i=0; i<this.els.length; i++) {
      page.display(this.els[i]);
    }
  },
  
  nextPhrase: function() {
    app.preferences.currentPhrase += 1;
    this.selectPhrase(app.preferences.currentPhrase);
  },
  
  selectPhrase: function(index) {
    var phraseList = document.querySelector('#detailsPane .phrases');
    var phrases = phraseList.children;
    for (var i=0; i<phrases.length; i++) {
      phrases[i].classList.remove('selectedPhrase');
    }
    
    var phrase = document.querySelector('#detailsPane .phrases #phrase_' + index);
    phrase.classList.add('selectedPhrase');
    phrase.focus();
  },
  
  toggleDisplay: function() {
    for (var i=0; i<this.els.length; i++) {
      page.toggleDisplay(this.els[i]);
    }
  }
};

// page.popups
// This popup is blank, and takes as its argument a function that renders content inside the popup
// The function you pass to page.popups.blank() must take a single argument, displayArea,
// which refers to the div where the content will be displayed
page.popups.blank = {
  el: page.nodes.blankPopup,
  
  hide: function() {
    page.hide(this.el);
  },
  
  render: function(renderer) {
    var displayArea = document.querySelector('#blankPopupDisplayArea')
    displayArea.innerHTML = '';
    renderer(displayArea);
    page.display(page.nodes.blankPopup);
  }
};

page.popups.fileUpload = {
  el: document.querySelector('#fileUploadPopup'),
  
  hide: function() {
    page.hide(this.el);
  },
  
  render: function(goButtonCallback) {
    page.nodes.processFileButton.addEventListener('click', goButtonCallback);
    page.nodes.processFileButton.addEventListener('click', function() {
      page.nodes.processFileButton.removeEventListener('click', goButtonCallback);
    });
    page.nodes.processFileButton.addEventListener('click', this.hide.bind(this));
    page.display(this.el);
  },
  
  toggleDisplay: function() {
    page.toggleDisplay(this.el);
  }
};

page.popups.manageCorpora = {
  el: document.querySelector('#manageCorporaPopup'),
  
  selectedTextIDs: function() {
    var textIDs = [];
    var nodes = document.getElementsByName('corpusTextsList');
    for (var i=0; i<nodes.length; i++) {
      if (nodes[i].checked === true) {
        var textID = Number(nodes[i].dataset.id);
        textIDs.push(textID);
      }
    }
    return textIDs;
  },
  
  toggleDisplay: function() {
    page.toggleDisplay(this.el);
  },
  
  render: function(callback) {
    var displayTexts = function(texts) {
      var textsList = document.querySelector('#corpusTextsSelector');
      textsList.innerHTML = '';
      
      var legend = document.createElement('legend');
      legend.textContent = 'Texts';
      textsList.appendChild(legend);
      
      texts.forEach(function(text) {
        var label = document.createElement('label');
        label.htmlFor = 'text_' + text.id;
        
        var input = document.createElement('input');
        input.id = 'text_' + text.id;
        input.dataset.id = text.id;
        input.type = 'checkbox';
        input.name = 'corpusTextsList';
        input.value = text.id;
        
        var item = document.createElement('p');
        item.classList.add('unicode');
        item.textContent = text.titles[0].titleText;
        
        label.appendChild(input);
        label.appendChild(item);
        textsList.appendChild(label);
      });
      
      page.display(this.el);
    }.bind(this);
    
    idb.getAll('texts', displayTexts);
  }
};

page.popups.mediaSelector = {
  render: function() {
    page.popups.blank.render(function(displayArea) {
      var header = document.createElement('h1');
      header.textContent = 'Select a media file to add to this text';
      displayArea.appendChild(header);
      
      var select = document.createElement('select');
      select.id = 'mediaSelector';
      displayArea.appendChild(select);
      
      var listMedia = function(mediaFiles, keys) {
        mediaFiles.forEach(function(mediaFile, i) {
          app.createOption(keys[i], mediaFile.name, keys[i], '#mediaSelector');
        });
      };
      
      idb.getAll('media', listMedia);
      
      var button = document.createElement('button');
      button.textContent = 'Done';
      displayArea.appendChild(button);
            
      button.addEventListener('click', function() {
        app.preferences.currentText.media.push(Number(select.value));
        idb.pushUpdate(app.preferences.currentText.id, 'media', Number(select.value), 'texts');
        page.popups.blank.hide();
      });
    });
  }
};

page.popups.settings = {
  el: document.querySelector('#settingsPopup'),
  
  render: function() {
    page.display(this.el);
  },
  
  toggleDisplay: function() {
    page.toggleDisplay(this.el);
  }
};

// EVENT LISTENERS
page.nodes.addMediaFileButton.addEventListener('click', function() {
  var addMediaFile = function() {
    var files = page.nodes.fileUpload.files;
    idb.add(files, 'media');
  };
  
  page.popups.fileUpload.render(addMediaFile);
});

page.nodes.addNewTextButton.addEventListener('click', function() {
  var text = new app.constructors.Text([], [], [], [], [ { orthography: '', titleText: '' } ]);
  text.addToTexts();
  text.addToCorpus(app.preferences.currentCorpus.id, page.views.texts.displayTextsList);
  text.setAsCurrent();
  text.display();
});

page.nodes.addTextMediaButton.addEventListener('click', function() {
  app.preferences.currentText === null ? page.notify('No text selected.') : page.popups.mediaSelector.render();
});

page.nodes.appNav.addEventListener('click', function(ev) {  
  if (ev.target.tagName === 'A') {
    page.render(ev.target.textContent.toLowerCase());
  }
  
  page.nodes.appNav.classList.add('hideonMobile');
});

page.nodes.boxIcon.addEventListener('click', function() {
  page.toggleDisplay(page.nodes.appNav);
  page.hide(page.nodes.mainNav);
});

page.nodes.importTextButton.addEventListener('click', function(ev) {
  page.popups.fileUpload.render(page.views.texts.importText);
});

page.nodes.mediaFilesList.addEventListener('click', function(ev) {
  if (ev.target.tagName === 'LI') {
    page.views.media.setMedia(Number(ev.target.dataset.id));
  }
});

page.nodes.newCorpusForm.addEventListener('submit', function(ev) {
  ev.preventDefault();
  var corpus = new app.constructors.Corpus(document.querySelector('#corpusNameBox').value, [], [], [], [], page.popups.manageCorpora.selectedTextIDs());
  corpus.setAsCurrent();
  corpus.addToCorpora(page.views.corpusSelector.render);
  page.popups.manageCorpora.toggleDisplay();
});

page.nodes.phraseDisplayArea.addEventListener('click', function(ev) {
  if (ev.target.tagName === 'IMG') {
    app.audio.playSegment(Number(ev.target.dataset.startTime), Number(ev.target.dataset.endTime));
    app.preferences.currentPhrase = Number(ev.target.parentNode.dataset.index);
    page.views.texts.selectPhrase(app.preferences.currentPhrase);
  }
  
  if (ev.target.tagName === 'LI') {
    app.preferences.currentPhrase = Number(ev.target.dataset.index);
    page.views.texts.selectPhrase(app.preferences.currentPhrase);
  }
  
  if (ev.target.tagName === 'P') {
    app.preferences.currentPhrase = Number(ev.target.parentNode.parentNode.dataset.index);
    page.views.texts.selectPhrase(app.preferences.currentPhrase);
  }
});

page.nodes.popups.addEventListener('click', function(ev) {
  if (ev.target.className === 'icon') {
    page.toggleDisplay(ev.target.parentNode);
  }
});

page.nodes.settingsButton.addEventListener('click', function() {
  page.toggleDisplay(settingsPopup);
  page.popups.settings.render();
});

page.nodes.switchLayoutButton.addEventListener('click', function() {
  page.switchLayout();
  page.popups.settings.toggleDisplay();
});

page.nodes.textsList.addEventListener('click', function(ev) {
  if (ev.target.tagName === 'LI') {
    var displayText = function(text) {
      text.setAsCurrent();
      text.display();
    };
    
    idb.get(Number(ev.target.dataset.id), 'texts', displayText);
  }
});

page.nodes.textTitles.addEventListener('input', function(ev) {
  if (ev.target.classList.contains('textTitle')) {
    var title = app.preferences.currentText.titles[parseInt(ev.target.dataset.titleIndex)];
    title.titleText = ev.target.value;
  }
});

page.nodes.textTitles.addEventListener('keyup', function(ev) {
  if (ev.keyCode === 13) {
    idb.update(app.preferences.currentText.id, 'titles', app.preferences.currentText.titles, 'texts');
    ev.target.blur();
  }
  if (ev.keyCode === 27) {
    ev.target.value = app.preferences.currentText.titles[parseInt(ev.target.dataset.titleIndex)].titleText;
    ev.target.blur();
    page.views.texts.displayTextsList();
  }
});

page.views.corpusSelector.el.addEventListener('change', function(ev){
  switch (ev.target.value) {
    case 'manage':
      page.popups.manageCorpora.render();
      page.views.corpusSelector.selectedIndex = 0;
      break;
    case 'placeholder':
      break;
    default:
      var selectedIndex = page.views.corpusSelector.el.selectedIndex;
      var option = page.views.corpusSelector.el.options[selectedIndex];
      var corpusID = Number(option.dataset.id);
      var setCorpus = function(corpus) {
        corpus.setAsCurrent();
        app.savePreferences();
      };
      idb.get(corpusID, 'corpora', setCorpus);
      break;
  }
});

window.addEventListener('load', function() {
  idb.open(idb.currentDatabase, app.initialize);
});

window.addEventListener('unload', app.savePreferences);