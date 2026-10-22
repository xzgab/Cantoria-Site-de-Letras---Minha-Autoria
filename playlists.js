/* ==========================================================================
   Cantoria — Listagem de playlists
   ========================================================================== */

(function () {
  "use strict";

  let currentUser = null;

  function fillIcons(select) {
    if (!select) return;
    select.innerHTML = Store.PLAYLIST_ICONS.map(function (icon, i) {
      return '<option value="' + icon + '">' + icon + " opção " + (i + 1) + "</option>";
    }).join("");
  }

  function openCreateModal(onCreated) {
    UI.openModal({
      title: "Nova playlist",
      message: "Dê um nome e, se quiser, escolha um ícone.",
      fields: [
        { name: "name", label: "Nome da playlist", placeholder: "Ex.: Clássicos da MPB", required: true },
        { name: "description", label: "Descrição (opcional)", placeholder: "Do que se trata esta playlist?" }
      ],
      confirmText: "Criar playlist",
      onConfirm: function (values) {
        const result = Store.createPlaylist({
          name: values.name,
          description: values.description
        });
        if (!result.ok) {
          UI.toast(result.error, "error");
          return;
        }
        UI.toast('Playlist "' + result.playlist.name + '" criada.', "success");
        if (typeof onCreated === "function") onCreated(result.playlist);
      }
    });
  }

  function render() {
    if (!currentUser) return;

    const mine = Store.getPlaylistsByUser(currentUser.id);
    const host = document.getElementById("my-playlists");
    const empty = document.getElementById("my-playlists-empty");
    const count = document.getElementById("my-playlists-count");

    if (count) {
      count.textContent = mine.length === 1 ? "1 playlist" : mine.length + " playlists";
    }

    if (!mine.length) {
      host.innerHTML = "";
      if (empty) empty.hidden = false;
    } else {
      if (empty) empty.hidden = true;
      UI.renderPlaylistList(host, mine);
    }

    /* Playlists públicas (de outros usuários) */
    const section = document.getElementById("public-playlists-section");
    const publicHost = document.getElementById("public-playlists");
    if (section && publicHost) {
      const others = Store.getPublicPlaylists().filter(function (pl) {
        return pl.ownerId !== currentUser.id;
      }).slice(0, 6);

      if (!others.length) {
        section.hidden = true;
      } else {
        section.hidden = false;
        UI.renderPlaylistList(publicHost, others);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    currentUser = Store.getCurrentUser();
    const loginState = document.getElementById("playlists-login");
    const content = document.getElementById("playlists-content");
    const newBtn = document.getElementById("new-playlist-btn");

    if (!currentUser) {
      if (loginState) loginState.hidden = false;
      if (content) content.hidden = true;
      return;
    }

    if (loginState) loginState.hidden = true;
    if (content) content.hidden = false;

    if (newBtn) {
      newBtn.hidden = false;
      newBtn.addEventListener("click", function () {
        openCreateModal(function (playlist) {
          window.location.href = "playlist.html?id=" + encodeURIComponent(playlist.id);
        });
      });
    }

    document.querySelectorAll("[data-create-playlist]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openCreateModal(function (playlist) {
          window.location.href = "playlist.html?id=" + encodeURIComponent(playlist.id);
        });
      });
    });

    document.addEventListener("cantoria:playlists-changed", render);

    render();
  });
})();
