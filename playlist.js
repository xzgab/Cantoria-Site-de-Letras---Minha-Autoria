/* ==========================================================================
   Cantoria — Detalhe da playlist
   Reprodução em ordem, reordenação (arrastar e soltar ou botões),
   remoção de faixas e edição/exclusão da playlist.
   ========================================================================== */

(function () {
  "use strict";

  let playlist = null;
  let currentUser = null;
  let songs = [];
  let dragIndex = -1;

  function getPlaylistId() {
    return new URLSearchParams(window.location.search).get("id") || "";
  }

  function canEdit() {
    if (!playlist || !currentUser) return false;
    return playlist.ownerId === currentUser.id || currentUser.role === "admin";
  }

  function totalDuration() {
    return songs.length + (songs.length === 1 ? " música" : " músicas");
  }

  /* ---------- Cabeçalho da playlist ---------- */
  function renderHeader() {
    const host = document.getElementById("playlist-content");
    if (!host) return;

    const covers = songs.slice(0, 4);
    const mosaic = covers.length
      ? '<div class="playlist-mosaic">' + covers.map(function (song) {
        return '<span class="mosaic-tile">' + UI.coverMarkup(song) + "</span>";
      }).join("") + "</div>"
      : '<div class="playlist-mosaic empty"><span>' + UI.escapeHtml(playlist.icon || "🎧") + "</span></div>";

    host.innerHTML = [
      '<section class="playlist-hero">',
      '  <div class="playlist-hero-cover">' + mosaic + "</div>",
      '  <div class="playlist-hero-info">',
      '    <div class="eyebrow">Playlist</div>',
      '    <h1 id="playlist-title">' + UI.escapeHtml(playlist.name) + "</h1>",
      playlist.description
        ? '    <p class="playlist-description">' + UI.escapeHtml(playlist.description) + "</p>"
        : "",
      '    <div class="music-meta">',
      '      <span class="meta-tag">' + totalDuration() + "</span>",
      '      <span class="meta-tag">de ' + UI.escapeHtml(playlist.ownerName) + "</span>",
      '      <span class="meta-tag">Atualizada ' + UI.timeAgo(playlist.updatedAt || playlist.createdAt) + "</span>",
      "    </div>",
      '    <div class="music-actions">',
      '      <button class="btn btn-primary" id="pl-play-all"' + (songs.length ? "" : " disabled") + ">",
      '        <span id="pl-play-icon">▶</span> <span id="pl-play-label">Reproduzir</span>',
      "      </button>",
      songs.length
        ? '      <button class="btn btn-ghost" id="pl-shuffle">🔀 Aleatório</button>'
        : "",
      canEdit()
        ? '      <button class="btn-icon" id="pl-edit" title="Editar playlist" aria-label="Editar playlist">✎</button>' +
        '      <button class="btn-icon" id="pl-delete" title="Excluir playlist" aria-label="Excluir playlist">🗑</button>'
        : "",
      "    </div>",
      "  </div>",
      "</section>",

      '<section class="section">',
      '  <div class="section-head">',
      "    <h2>Faixas</h2>",
      '    <a class="link-more" href="letras.html">Adicionar mais →</a>',
      "  </div>",
      '  <div id="tracklist" class="tracklist"></div>',
      '  <div id="playlist-empty" class="empty-state" hidden>',
      '    <div class="empty-icon">🎵</div>',
      "    <h3>Playlist vazia</h3>",
      "    <p>Explore o catálogo e toque no <strong>+</strong> de qualquer música para adicioná-la aqui.</p>",
      '    <div class="empty-actions"><a class="btn btn-primary" href="letras.html">Explorar catálogo</a></div>',
      "  </div>",
      "</section>"
    ].join("");

    document.title = playlist.name + " — Playlist · Cantoria";
    renderTracks();
    bindHeaderActions();
  }

  /* ---------- Lista de faixas ---------- */
  function renderTracks() {
    const host = document.getElementById("tracklist");
    const empty = document.getElementById("playlist-empty");
    if (!host) return;

    if (!songs.length) {
      host.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    const editable = canEdit();
    host.innerHTML = songs.map(function (song, index) {
      const current = Player.currentSong() && Player.currentSong().id === song.id;
      return [
        '<div class="track' + (current ? " current" : "") + '" data-index="' + index + '" data-song-id="' + UI.escapeHtml(song.id) + '"' +
        (editable ? ' draggable="true"' : "") + ">",
        '  <div class="track-handle" aria-hidden="true">' + (editable ? "⠿" : "") + "</div>",
        '  <button class="track-play" data-track-play="' + index + '" aria-label="Reproduzir ' + UI.escapeHtml(song.title) + '">▶</button>',
        '  <div class="track-cover">' + UI.coverMarkup(song) + "</div>",
        '  <div class="track-info">',
        '    <a class="track-title" href="musica.html?id=' + encodeURIComponent(song.id) + '">' + UI.escapeHtml(song.title) + "</a>",
        '    <span class="track-artist">' + UI.escapeHtml(song.artist) + "</span>",
        "  </div>",
        '  <span class="track-genre">' + UI.escapeHtml(getGenreName(song.genre)) + "</span>",
        '  <span class="track-time">' + (song.year || "—") + "</span>",
        editable
          ? '  <div class="track-actions">' +
          '<button class="track-btn" data-move-up="' + index + '" title="Mover para cima" aria-label="Mover para cima"' + (index === 0 ? " disabled" : "") + ">↑</button>" +
          '<button class="track-btn" data-move-down="' + index + '" title="Mover para baixo" aria-label="Mover para baixo"' + (index === songs.length - 1 ? " disabled" : "") + ">↓</button>" +
          '<button class="track-btn remove" data-remove="' + index + '" title="Remover da playlist" aria-label="Remover da playlist">✕</button>' +
          "</div>"
          : "",
        "</div>"
      ].join("");
    }).join("");

    bindTrackEvents(host);
    syncPlaybackUI();
  }

  function bindTrackEvents(host) {
    host.addEventListener("click", function (e) {
      const playBtn = e.target.closest("[data-track-play]");
      if (playBtn) {
        e.preventDefault();
        playFrom(Number(playBtn.getAttribute("data-track-play")));
        return;
      }

      const up = e.target.closest("[data-move-up]");
      if (up) {
        const index = Number(up.getAttribute("data-move-up"));
        moveTrack(index, index - 1);
        return;
      }

      const down = e.target.closest("[data-move-down]");
      if (down) {
        const index = Number(down.getAttribute("data-move-down"));
        moveTrack(index, index + 1);
        return;
      }

      const remove = e.target.closest("[data-remove]");
      if (remove) {
        const index = Number(remove.getAttribute("data-remove"));
        removeTrack(index);
      }
    });

    /* Arrastar e soltar */
    host.addEventListener("dragstart", function (e) {
      const track = e.target.closest(".track");
      if (!track || !canEdit()) return;
      dragIndex = Number(track.getAttribute("data-index"));
      track.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(dragIndex));
      }
    });

    host.addEventListener("dragend", function (e) {
      const track = e.target.closest(".track");
      if (track) track.classList.remove("dragging");
      host.querySelectorAll(".track").forEach(function (t) { t.classList.remove("drag-over"); });
      dragIndex = -1;
    });

    host.addEventListener("dragover", function (e) {
      const track = e.target.closest(".track");
      if (!track || dragIndex < 0) return;
      e.preventDefault();
      host.querySelectorAll(".track").forEach(function (t) { t.classList.remove("drag-over"); });
      track.classList.add("drag-over");
    });

    host.addEventListener("drop", function (e) {
      const track = e.target.closest(".track");
      if (!track || dragIndex < 0) return;
      e.preventDefault();
      const targetIndex = Number(track.getAttribute("data-index"));
      moveTrack(dragIndex, targetIndex);
    });
  }

  /* ---------- Ações sobre faixas ---------- */
  function moveTrack(from, to) {
    if (!canEdit()) return;
    if (to < 0 || to >= songs.length || from === to) return;
    if (!Store.moveSongInPlaylist(playlist.id, from, to)) return;
    playlist = Store.findPlaylist(playlist.id);
    songs = Store.resolvePlaylistSongs(playlist);
    renderTracks();
  }

  function removeTrack(index) {
    if (!canEdit()) return;
    const song = songs[index];
    if (!song) return;

    const result = Store.removeSongFromPlaylist(playlist.id, song.id);
    if (!result.ok) {
      UI.toast(result.error, "error");
      return;
    }

    playlist = Store.findPlaylist(playlist.id);
    songs = Store.resolvePlaylistSongs(playlist);
    UI.toast('"' + song.title + '" removida da playlist.', "info", 2200);

    /* Se a playlist ficou vazia, atualiza o cabeçalho inteiro (estado vazio) */
    if (!songs.length) renderHeader();
    else {
      renderTracks();
      updateCounts();
    }
  }

  function updateCounts() {
    const tag = document.querySelector(".playlist-hero-info .meta-tag");
    if (tag) tag.textContent = totalDuration();
    const playAll = document.getElementById("pl-play-all");
    if (playAll) playAll.disabled = !songs.length;
    const shuffle = document.getElementById("pl-shuffle");
    if (shuffle) shuffle.hidden = !songs.length;
  }

  /* ---------- Reprodução ---------- */
  function playFrom(index) {
    if (!songs.length) return;
    Player.playQueue(songs, index);
    if (!songs[index].audio) {
      UI.toast("Esta música não tem áudio; use a página da letra.", "info");
    }
    syncPlaybackUI();
  }

  function playAll() {
    if (!songs.length) return;
    const firstWithAudio = songs.findIndex(function (s) { return s.audio; });
    if (firstWithAudio === -1) {
      UI.toast("As músicas desta playlist não têm áudio disponível.", "info");
    }
    Player.playQueue(songs, firstWithAudio === -1 ? 0 : firstWithAudio);
    syncPlaybackUI();
  }

  function shufflePlay() {
    if (!songs.length) return;
    const copy = songs.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    Player.playQueue(copy, 0);
    UI.toast("Reproduzindo em ordem aleatória.", "info", 2000);
    syncPlaybackUI();
  }

  function syncPlaybackUI() {
    const currentSong = Player.currentSong();
    document.querySelectorAll(".track").forEach(function (track) {
      const isCurrent = currentSong && track.getAttribute("data-song-id") === currentSong.id;
      track.classList.toggle("current", !!isCurrent);
    });

    const playIcon = document.getElementById("pl-play-icon");
    const playLabel = document.getElementById("pl-play-label");
    if (playIcon && playLabel) {
      const inPlaylist = currentSong && songs.some(function (s) { return s.id === currentSong.id; });
      const playing = inPlaylist && Player.isPlaying(currentSong.id);
      playIcon.textContent = playing ? "❚❚" : "▶";
      playLabel.textContent = playing ? "Pausar" : (inPlaylist ? "Continuar" : "Reproduzir");
    }
  }

  /* ---------- Cabeçalho: botões ---------- */
  function bindHeaderActions() {
    const playBtn = document.getElementById("pl-play-all");
    if (playBtn) {
      playBtn.addEventListener("click", function () {
        const currentSong = Player.currentSong();
        const inPlaylist = currentSong && songs.some(function (s) { return s.id === currentSong.id; });
        if (inPlaylist) {
          Player.togglePlay();
          return;
        }
        playAll();
      });
    }

    const shuffle = document.getElementById("pl-shuffle");
    if (shuffle) shuffle.addEventListener("click", shufflePlay);

    const editBtn = document.getElementById("pl-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        UI.openModal({
          title: "Editar playlist",
          fields: [
            { name: "name", label: "Nome", value: playlist.name, required: true },
            { name: "description", label: "Descrição", value: playlist.description || "" },
            { name: "icon", label: "Ícone (emoji)", value: playlist.icon || "🎧", hint: "Ex.: 🎸 🔥 🌙 💿" }
          ],
          confirmText: "Salvar",
          onConfirm: function (values) {
            const result = Store.updatePlaylist(playlist.id, values);
            if (!result.ok) {
              UI.toast(result.error, "error");
              return;
            }
            playlist = Store.findPlaylist(playlist.id);
            renderHeader();
            UI.toast("Playlist atualizada.", "success");
          }
        });
      });
    }

    const deleteBtn = document.getElementById("pl-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        UI.confirmDialog(
          'Excluir a playlist "' + playlist.name + '"? As músicas continuam no catálogo.',
          function () {
            const result = Store.deletePlaylist(playlist.id);
            if (!result.ok) {
              UI.toast(result.error, "error");
              return;
            }
            UI.toast("Playlist excluída.", "info");
            setTimeout(function () { window.location.href = "playlists.html"; }, 500);
          },
          { title: "Excluir playlist", confirmText: "Excluir", danger: true }
        );
      });
    }

    Player.onChange(syncPlaybackUI);
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    const loading = document.getElementById("playlist-loading");
    const notFound = document.getElementById("playlist-notfound");
    const content = document.getElementById("playlist-content");

    currentUser = Store.getCurrentUser();
    const id = getPlaylistId();
    playlist = id ? Store.findPlaylist(id) : null;

    if (loading) loading.hidden = true;

    if (!playlist) {
      if (notFound) notFound.hidden = false;
      if (content) content.hidden = true;
      document.title = "Playlist não encontrada · Cantoria";
      return;
    }

    songs = Store.resolvePlaylistSongs(playlist);
    renderHeader();
    if (content) content.hidden = false;
  });
})();
