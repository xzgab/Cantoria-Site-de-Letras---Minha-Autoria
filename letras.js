/* ==========================================================================
   Cantoria — Catálogo de letras (filtros, busca e ordenação)
   ========================================================================== */

(function () {
  "use strict";

  const state = {
    q: "",
    genre: "",
    decade: "",
    sort: "recent",
    favoritesOnly: false
  };

  const catalog = [];

  function readParams() {
    const params = new URLSearchParams(window.location.search);
    state.q = params.get("q") || "";
    state.genre = params.get("genre") || "";
    state.decade = params.get("decade") || "";
    state.sort = params.get("sort") || "recent";
    state.favoritesOnly = params.get("fav") === "1";
  }

  function syncParams() {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.genre) params.set("genre", state.genre);
    if (state.decade) params.set("decade", state.decade);
    if (state.sort && state.sort !== "recent") params.set("sort", state.sort);
    if (state.favoritesOnly) params.set("fav", "1");
    const query = params.toString();
    const url = window.location.pathname + (query ? "?" + query : "");
    window.history.replaceState(null, "", url);
  }

  /* Aplica busca, filtros e ordenação */
  function computeResults() {
    const term = UI.normalize(state.q.trim());
    const favorites = Store.getFavorites();

    let results = catalog.filter(function (song) {
      if (state.favoritesOnly && favorites.indexOf(song.id) === -1) return false;
      if (state.genre && song.genre !== state.genre) return false;
      if (state.decade) {
        const songDecade = song.year ? Math.floor(song.year / 10) * 10 : null;
        if (songDecade === null || String(songDecade) !== state.decade) return false;
      }
      if (term) {
        const haystack = UI.normalize(song.title + " " + song.artist + " " + song.lyrics);
        if (haystack.indexOf(term) === -1) return false;
      }
      return true;
    });

    switch (state.sort) {
      case "title":
        results.sort(function (a, b) { return a.title.localeCompare(b.title, "pt-BR"); });
        break;
      case "artist":
        results.sort(function (a, b) { return a.artist.localeCompare(b.artist, "pt-BR"); });
        break;
      case "views":
        results.sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
        break;
      default:
        results.sort(function (a, b) {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }

    return results;
  }

  function render() {
    const grid = document.getElementById("catalog-grid");
    const empty = document.getElementById("catalog-empty");
    const meta = document.getElementById("catalog-meta");
    const results = computeResults();

    if (meta) {
      if (state.favoritesOnly) {
        meta.textContent = results.length === 1
          ? "1 música favorita"
          : results.length + " músicas favoritas";
      } else {
        meta.textContent = results.length === 1
          ? "1 música encontrada"
          : results.length + " músicas encontradas";
      }
      if (state.q) meta.textContent += ' para "' + state.q.trim() + '"';
    }

    if (!results.length) {
      if (grid) grid.innerHTML = "";
      if (empty) {
        const emptyTitle = empty.querySelector("h3");
        const emptyText = empty.querySelector("p");
        if (state.favoritesOnly) {
          if (emptyTitle) emptyTitle.textContent = "Nenhuma favorita ainda";
          if (emptyText) emptyText.textContent = "Toque no coração de uma música para guardá-la aqui.";
        } else {
          if (emptyTitle) emptyTitle.textContent = "Nenhuma música encontrada";
          if (emptyText) emptyText.textContent = "Tente ajustar a busca ou os filtros.";
        }
        empty.hidden = false;
      }
    } else {
      if (empty) empty.hidden = true;
      UI.renderCardList(grid, results);
    }
  }

  function populateGenres() {
    const select = document.getElementById("filter-genre");
    if (!select) return;
    const options = GENRES.map(function (genre) {
      const selected = genre.id === state.genre ? " selected" : "";
      return '<option value="' + genre.id + '"' + selected + ">" + UI.escapeHtml(genre.name) + "</option>";
    }).join("");
    select.innerHTML = '<option value="">Todos os gêneros</option>' + options;
  }

  function bindEvents() {
    const search = document.getElementById("catalog-search");
    const genre = document.getElementById("filter-genre");
    const decade = document.getElementById("filter-decade");
    const sort = document.getElementById("sort-by");

    let debounceTimer;
    if (search) {
      search.value = state.q;
      search.addEventListener("input", function (e) {
        clearTimeout(debounceTimer);
        const value = e.target.value;
        debounceTimer = setTimeout(function () {
          state.q = value;
          syncParams();
          render();
        }, 220);
      });
    }

    if (genre) {
      genre.addEventListener("change", function (e) {
        state.genre = e.target.value;
        syncParams();
        render();
      });
    }

    if (decade) {
      decade.value = state.decade;
      decade.addEventListener("change", function (e) {
        state.decade = e.target.value;
        syncParams();
        render();
      });
    }

    if (sort) {
      sort.value = state.sort;
      sort.addEventListener("change", function (e) {
        state.sort = e.target.value;
        syncParams();
        render();
      });
    }

    document.addEventListener("cantoria:favorites-changed", render);
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.push.apply(catalog, Store.getCatalog());
    readParams();
    populateGenres();
    bindEvents();
    render();

    if (state.favoritesOnly && !Store.isLoggedIn()) {
      UI.toast("Entre na sua conta para ver suas favoritas.", "info");
    }
  });
})();
