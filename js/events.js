// This page consists of 2 parts:
//   1. A list of nodes, under the app.nodes namespace
//   2. The events registry for the app (i.e. a list of event listeners)
// The app.nodes namespace is initialized in script.js, and contains a few site-general node references there

// Dependencies: script.js, app.js

// DOM NODES (if any need to be defined in the global namespace - most are properties of specific views)

// EVENT LISTENERS
app.nodes.appNav.addEventListener('click', function(ev) {
  if (ev.target.tagName === 'A') {
    views.workviews.setWorkview(ev.target.textContent.toLowerCase());
  }
  
  views.page.hide(app.nodes.appNav, 'mobile');
});

views.page.boxIcon.addEventListener('click', views.page.toggleMenu);

views.page.corpusSelector.el.addEventListener('change', views.page.corpusSelector.menuEvent);

views.page.settingsIcon.addEventListener('click', views.popups.settings.toggleDisplay);

views.popups.el.addEventListener('click', app.popupEvent);

views.popups.el.addEventListener('submit', app.popupEvent);

views.workviews.media.overviewPane.addEventListener('click', app.mediaEvent);

views.workviews.texts.overviewPane.addEventListener('click', app.textsEvent);

views.workviews.texts.detailsPane.addEventListener('click', app.textsEvent);

window.addEventListener('load', app.initialize);

window.addEventListener('unload', app.savePreferences);