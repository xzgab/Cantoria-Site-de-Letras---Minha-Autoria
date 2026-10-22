/* ==========================================================================
   Cantoria — Página inicial
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const catalog = Store.getCatalog();

    /* ---------- Estatísticas do hero ---------- */
    const statsHost = document.getElementById("hero-stats");
    if (statsHost) {
      const totalViews = catalog.reduce(function (sum, s) { return sum + (s.views || 0); }, 0);
      statsHost.innerHTML = [
        '<span class="stat-pill"><strong>' + catalog.length + "</strong> letras</span>",
        '<span class="stat-pill"><strong>' + GENRES.length + "</strong> gêneros</span>",
        '<span class="stat-pill"><strong>' + UI.formatNumber(totalViews) + "</strong> reproduções</span>"
      ].join("");
    }

    /* ---------- Busca do hero ---------- */
    const heroSearch = document.getElementById("hero-search");
    if (heroSearch) {
      heroSearch.addEventListener("submit", function (e) {
        e.preventDefault();
        const input = document.getElementById("hero-search-input");
        const term = input ? input.value.trim() : "";
        window.location.href = "letras.html" + (term ? "?q=" + encodeURIComponent(term) : "");
      });
    }

    /* ---------- Chips de gênero ---------- */
    const chipsHost = document.getElementById("genre-chips");
    if (chipsHost) {
      chipsHost.innerHTML = GENRES.map(function (genre) {
        const count = catalog.filter(function (song) { return song.genre === genre.id; }).length;
        return '<a class="chip" href="letras.html?genre=' + encodeURIComponent(genre.id) + '">' +
          UI.escapeHtml(genre.name) + ' <span style="opacity:.6">(' + count + ")</span></a>";
      }).join("");
    }

    /* ---------- Playlists do usuário ---------- */
    const plHost = document.getElementById("home-playlists");
    const plCta = document.getElementById("home-playlists-cta");
    if (plHost) {
      const user = Store.getCurrentUser();
      const playlists = user ? Store.getPlaylistsByUser(user.id).slice(0, 4) : [];
      if (playlists.length) {
        if (plCta) plCta.hidden = true;
        UI.renderPlaylistList(plHost, playlists);
      } else {
        plHost.innerHTML = "";
        if (plCta) plCta.hidden = false;
      }
    }

    /* ---------- Destaques ---------- */
    const grid = document.getElementById("featured-grid");
    if (grid) {
      let featured = catalog.filter(function (song) { return song.featured; });
      if (featured.length < 4) {
        const others = catalog.filter(function (song) { return !song.featured; })
          .sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
        featured = featured.concat(others).slice(0, 8);
      }
      UI.renderCardList(grid, featured.slice(0, 8));
    }
  });
})();
