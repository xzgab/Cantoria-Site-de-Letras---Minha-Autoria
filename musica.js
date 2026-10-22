/* ==========================================================================
   Cantoria — Página da música (letra + player)
   ========================================================================== */

(function () {
  "use strict";

  function getId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "";
  }

  function renderSong(song, catalog) {
    const main = document.getElementById("music-content");
    if (!main) return null;

    const genreName = getGenreName(song.genre);
    const favorite = Store.isFavorite(song.id);

    main.innerHTML = [
      '<section class="music-hero">',
      '  <div class="music-cover">',
      UI.coverMarkup(song),
      "  </div>",
      '  <div class="music-info">',
      '    <div class="eyebrow">' + UI.escapeHtml(genreName) + "</div>",
      '    <h1 id="music-title">' + UI.escapeHtml(song.title) + "</h1>",
      '    <p class="music-artist">' + UI.escapeHtml(song.artist) + "</p>",
      '    <div class="music-meta">',
      song.year ? '      <span class="meta-tag">' + song.year + "</span>" : "",
      '      <span class="meta-tag">' + UI.formatNumber(song.views) + " reproduções</span>",
      song.authorName ? '      <span class="meta-tag">Contribuição de ' + UI.escapeHtml(song.authorName) + "</span>" : "",
      "    </div>",
      '    <div class="music-actions">',
      '      <button class="btn btn-primary" id="btn-play">',
      "        <span id=\"btn-play-icon\">▶</span>",
      "        <span id=\"btn-play-label\">Reproduzir</span>",
      "      </button>",
      '      <button class="btn-icon' + (favorite ? " active" : "") + '" id="btn-fav" title="Favoritar" aria-label="Favoritar">' +
      (favorite ? "♥" : "♡") + "</button>",
      '      <button class="btn-icon" id="btn-add-playlist" title="Adicionar à playlist" aria-label="Adicionar à playlist">＋</button>',
      '      <button class="btn-icon" id="btn-copy" title="Copiar link" aria-label="Copiar link">🔗</button>',
      '      <button class="btn-icon" id="btn-copy-lyrics" title="Copiar letra" aria-label="Copiar letra">📋</button>',
      !song.audio ? '      <span class="no-audio-note">Somente leitura — sem áudio disponível</span>' : "",
      "    </div>",
      "  </div>",
      "</section>",

      '<article class="lyrics-card">',
      "  <h2>Letra</h2>",
      '  <div class="lyrics-text" id="lyrics-text">' + UI.escapeHtml(song.lyrics) + "</div>",
      "</article>",

      '<section class="section">',
      '  <div class="section-head">',
      "    <h2>Você também pode gostar</h2>",
      '    <a class="link-more" href="letras.html?genre=' + encodeURIComponent(song.genre) + '">Ver mais de ' + UI.escapeHtml(genreName) + " →</a>",
      "  </div>",
      '  <div class="related-grid card-grid" id="related-grid"></div>',
      "</section>"
    ].join("");

    document.title = song.title + " — " + song.artist + " · Cantoria";

    /* Relacionadas: mesmo gênero primeiro, depois outras populares */
    const related = catalog
      .filter(function (s) { return s.id !== song.id; })
      .sort(function (a, b) {
        const sameGenreA = a.genre === song.genre ? 1 : 0;
        const sameGenreB = b.genre === song.genre ? 1 : 0;
        if (sameGenreA !== sameGenreB) return sameGenreB - sameGenreA;
        return (b.views || 0) - (a.views || 0);
      })
      .slice(0, 6);

    const relatedGrid = document.getElementById("related-grid");
    UI.renderCardList(relatedGrid, related);

    bindActions(song, catalog);
    return main;
  }

  function bindActions(song, catalog) {
    const playBtn = document.getElementById("btn-play");
    const playIcon = document.getElementById("btn-play-icon");
    const playLabel = document.getElementById("btn-play-label");
    const favBtn = document.getElementById("btn-fav");
    const copyBtn = document.getElementById("btn-copy");
    const copyLyricsBtn = document.getElementById("btn-copy-lyrics");
    const addPlaylistBtn = document.getElementById("btn-add-playlist");

    function refreshPlayUi(state) {
      if (!playBtn) return;
      const isCurrent = state.song && state.song.id === song.id;
      const playing = isCurrent && state.playing;
      if (playIcon) playIcon.textContent = playing ? "❚❚" : "▶";
      if (playLabel) playLabel.textContent = playing ? "Pausar" : (isCurrent ? "Continuar" : "Reproduzir");
    }

    if (playBtn) {
      playBtn.addEventListener("click", function () {
        if (!song.audio) {
          UI.toast("Esta letra não tem áudio disponível.", "info");
          return;
        }
        Player.toggleSong(song, catalog);
        refreshPlayUi({ song: Player.currentSong(), playing: false });
      });
    }

    Player.onChange(refreshPlayUi);
    refreshPlayUi({ song: Player.currentSong(), playing: false });

    if (favBtn) {
      favBtn.addEventListener("click", function () {
        const added = Store.toggleFavorite(song.id);
        favBtn.classList.toggle("active", added);
        favBtn.textContent = added ? "♥" : "♡";
        UI.toast(added ? "Adicionada aos favoritos." : "Removida dos favoritos.", added ? "success" : "info", 2000);
      });
    }

    if (addPlaylistBtn) {
      addPlaylistBtn.addEventListener("click", function () {
        UI.openAddToPlaylist(song);
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        copyToClipboard(window.location.href, "Link copiado!");
      });
    }

    if (copyLyricsBtn) {
      copyLyricsBtn.addEventListener("click", function () {
        const text = song.title + " — " + song.artist + "\n\n" + song.lyrics;
        copyToClipboard(text, "Letra copiada!");
      });
    }
  }

  function copyToClipboard(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { UI.toast(successMessage, "success", 2000); })
        .catch(function () { fallbackCopy(text, successMessage); });
    } else {
      fallbackCopy(text, successMessage);
    }
  }

  function fallbackCopy(text, successMessage) {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      UI.toast(successMessage, "success", 2000);
    } catch (err) {
      UI.toast("Não foi possível copiar.", "error");
    }
    area.remove();
  }

  document.addEventListener("DOMContentLoaded", function () {
    const loading = document.getElementById("music-loading");
    const notFound = document.getElementById("music-notfound");
    const content = document.getElementById("music-content");
    const id = getId();
    const catalog = Store.getCatalog();
    const song = id ? Store.findSong(id) : null;

    if (loading) loading.hidden = true;

    if (!song) {
      if (notFound) notFound.hidden = false;
      if (content) content.hidden = true;
      document.title = "Música não encontrada · Cantoria";
      return;
    }

    Store.registerView(song.id);
    song.views = (song.views || 0) + 1;

    renderSong(song, catalog);
    if (content) content.hidden = false;

    window.dispatchEvent(new CustomEvent("cantoria:view", { detail: song.id }));
  });
})();
