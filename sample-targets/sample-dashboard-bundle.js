/**
 * @license Production Bundle v3.12.0
 * Webpack Chunk: app-dashboard.min.js
 */
(function(modules) {
  var installedModules = {};
  function __webpack_require__(moduleId) {
    if (installedModules[moduleId]) return installedModules[moduleId].exports;
    var module = installedModules[moduleId] = { i: moduleId, l: false, exports: {} };
    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    module.l = true;
    return module.exports;
  }
  return __webpack_require__(10);
})([
  /* 0: In-Memory Search Engine */
  function(module, exports) {
    function SearchIndex(options) {
      this.options = options || { threshold: 0.4, tokenize: 'forward' };
      this.invertedIndex = new Map();
      this.documentStore = [];
    }
    SearchIndex.prototype.addDocument = function(doc) {
      this.documentStore.push(doc);
      var tokens = doc.title.toLowerCase().split(/\s+/);
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (!this.invertedIndex.has(t)) this.invertedIndex.set(t, []);
        this.invertedIndex.get(t).push(doc.id);
      }
    };
    SearchIndex.prototype.search = function(query) {
      var queryTokens = query.toLowerCase().trim().split(/\s+/);
      var matches = [];
      for (var d = 0; d < this.documentStore.length; d++) {
        var doc = this.documentStore[d];
        var score = 0;
        for (var q = 0; q < queryTokens.length; q++) {
          if (doc.title.toLowerCase().indexOf(queryTokens[q]) !== -1) score += 1.0;
          if (doc.body && doc.body.toLowerCase().indexOf(queryTokens[q]) !== -1) score += 0.4;
        }
        if (score > 0) matches.push({ doc: doc, score: score });
      }
      return matches.sort(function(a, b) { return b.score - a.score; });
    };
    exports.SearchIndex = SearchIndex;
  },
  /* 1: State Store */
  function(module, exports) {
    function createStore(initialState) {
      var state = initialState || { query: '', results: [], isSearching: false };
      var listeners = [];
      return {
        getState: function() { return state; },
        dispatch: function(action) {
          if (action.type === 'SET_QUERY') {
            state.query = action.payload;
            state.isSearching = true;
          } else if (action.type === 'SET_RESULTS') {
            state.results = action.payload;
            state.isSearching = false;
          }
          listeners.forEach(function(l) { l(state); });
        },
        subscribe: function(l) { listeners.push(l); }
      };
    }
    exports.createStore = createStore;
  },
  /* 10: App Entry & Hotkey Hook */
  function(module, exports, __webpack_require__) {
    var Search = __webpack_require__(0);
    var Store = __webpack_require__(1);
    var index = new Search.SearchIndex();
    var store = Store.createStore();
    
    // Web Worker offload
    var searchWorker = new Worker('/workers/search-worker.js');
    searchWorker.onmessage = function(e) {
      store.dispatch({ type: 'SET_RESULTS', payload: e.data });
    };

    window.__APP_SEARCH_ENGINE__ = index;
    console.log('[Bundle] In-memory fuzzy search pipeline mounted.');
  }
]);
//# sourceMappingURL=sample-dashboard-bundle.js.map
