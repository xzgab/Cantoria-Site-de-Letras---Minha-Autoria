/* ==========================================================================
   Cantoria — UI compartilhada
   Header, cards, toasts, modais, utilitários e footer.
   ========================================================================== */

const UI = (function () {
  "use strict";

  /* ---------- Utilitários ---------- */
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text == null ? "" : text);
    return div.innerHTML;
  }

  function initials(name) {
    return String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0); })
      .join("")
      .toUpperCase() || "?";
  }

  function formatNumber(value) {
    const n = Number(value) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".0", "") + " mi";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + " mil";
    return String(n);
  }

  function formatDate(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function timeAgo(iso) {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "agora mesmo";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return "há " + minutes + " min";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return "há " + hours + "h";
    const days = Math.floor(hours / 24);
    if (days < 30) return "há " + days + "d";
    return formatDate(iso);
  }

  function normalize(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function coverMarkup(song, size) {
    const style = size ? ' style="width:' + size + "px;height:" + size + 'px"' : "";
    if (song && song.cover) {
      return '<img src="' + escapeHtml(song.cover) + '" alt="Capa de ' + escapeHtml(song.title) +
        '" loading="lazy" onerror="this.parentNode.querySelector(\'.cover-fallback\') && (this.style.display=\'none\')"' + style + " />";
    }
    const grad = (song && song.gradient) || ["#b06cff", "#ff6c9f"];
    return '<div class="cover-fallback" style="background:linear-gradient(135deg,' + grad[0] + "," + grad[1] + ')"' + style + ">♪</div>";
  }

  /* ---------- Toast ---------- */
  function toast(message, type, duration) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const el = document.createElement("div");
    const icons = { success: "✓", error: "!", info: "♪", warning: "⚠" };
    el.className = "toast " + (type || "");
    el.setAttribute("role", "status");
    el.innerHTML = '<span aria-hidden="true">' + (icons[type] || "♪") + "</span><span>" + escapeHtml(message) + "</span>";
    container.appendChild(el);
    setTimeout(function () {
      el.classList.add("leaving");
      setTimeout(function () { el.remove(); }, 240);
    }, duration || 3200);
  }

  /* ---------- Modal ---------- */
  function openModal(options) {
    const root = document.getElementById("modal-root") || document.body;
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const fieldsHtml = (options.fields || []).map(function (field) {
      return '<div class="field"><label for="modal-' + field.name + '">' + escapeHtml(field.label) + "</label>" +
        '<input id="modal-' + field.name + '" name="' + field.name + '" type="' + (field.type || "text") + '" ' +
        'placeholder="' + escapeHtml(field.placeholder || "") + '" value="' + escapeHtml(field.value || "") + '" />' +
        (field.hint ? '<small class="hint">' + escapeHtml(field.hint) + "</small>" : "") + "</div>";
    }).join("");

    backdrop.innerHTML = [
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">',
      '  <h3 id="modal-title">' + escapeHtml(options.title || "") + "</h3>",
      options.message ? "  <p>" + escapeHtml(options.message) + "</p>" : "",
      fieldsHtml,
      '  <p class="form-error" id="modal-error" hidden></p>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-ghost" data-action="cancel">' + escapeHtml(options.cancelText || "Cancelar") + "</button>",
      '    <button type="button" class="btn ' + (options.danger ? "btn-danger" : "btn-primary") + '" data-action="confirm">' + escapeHtml(options.confirmText || "Confirmar") + "</button>",
      "  </div>",
      "</div>"
    ].join("");

    root.appendChild(backdrop);

    function close() {
      backdrop.remove();
      document.removeEventListener("keydown", onKey);
    }

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    function submit() {
      const errorEl = backdrop.querySelector("#modal-error");
      const values = {};
      let invalid = false;
      (options.fields || []).forEach(function (field) {
        const input = backdrop.querySelector("#modal-" + field.name);
        const value = input ? input.value.trim() : "";
        if (field.required && !value) {
          invalid = true;
          if (input) input.classList.add("invalid");
        }
        values[field.name] = value;
      });
      if (invalid) {
        if (errorEl) {
          errorEl.textContent = "Preencha todos os campos obrigatórios.";
          errorEl.hidden = false;
        }
        return;
      }
      close();
      if (typeof options.onConfirm === "function") options.onConfirm(values);
    }

    backdrop.querySelector('[data-action="cancel"]').addEventListener("click", close);
    backdrop.querySelector('[data-action="confirm"]').addEventListener("click", submit);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) close();
    });
    document.addEventListener("keydown", onKey);

    const firstInput = backdrop.querySelector("input");
    if (firstInput) firstInput.focus();

    return { close: close };
  }

  function confirmDialog(message, onConfirm, options) {
    options = options || {};
    return openModal({
      title: options.title || "Confirmar ação",
      message: message,
      confirmText: options.confirmText || "Confirmar",
      cancelText: options.cancelText || "Cancelar",
      danger: options.danger,
      onConfirm: onConfirm
    });
  }

  /* ---------- Header ---------- */
  function renderHeader() {
    const host = document.getElementById("site-header");
    if (!host) return;

    const page = document.body.getAttribute("data-page") || "";
    const user = Store.getCurrentUser();

    const links = [
      { page: "home", href: "index.html", label: "Início" },
      { page: "letras", href: "letras.html", label: "Catálogo" },
      { page: "playlists", href: "playlists.html", label: "Playlists" },
      { page: "enviar", href: "enviar.html", label: "Enviar letra" }
    ];

    if (user && user.role === "admin") {
      links.push({ page: "admin", href: "admin.html", label: "Admin" });
    }

    const navHtml = links.map(function (link) {
      return '<a href="' + link.href + '"' + (page === link.page ? ' class="active"' : "") + ">" + link.label + "</a>";
    }).join("");

    let actionsHtml = "";
    if (user) {
      actionsHtml = [
        '<div class="user-menu">',
        '  <button class="user-btn" id="user-menu-btn" aria-haspopup="true" aria-expanded="false">',
        '    <span class="avatar">' + escapeHtml(initials(user.name)) + "</span>",
        '    <span class="user-name">' + escapeHtml(user.name.split(" ")[0]) + "</span>",
        "  </button>",
        '  <div class="dropdown" id="user-dropdown" role="menu">',
        '    <a href="enviar.html" role="menuitem">📝 Minhas contribuições</a>',
        '    <a href="playlists.html" role="menuitem">🎧 Minhas playlists</a>',
        '    <a href="letras.html?fav=1" role="menuitem">💜 Favoritas</a>',
        (user.role === "admin" ? '    <a href="admin.html" role="menuitem">⚙ Painel admin</a>' : ""),
        '    <hr />',
        '    <button type="button" class="danger" id="logout-btn" role="menuitem">⏻ Sair</button>',
        "  </div>",
        "</div>"
      ].join("");
    } else {
      actionsHtml = [
        '<a class="btn btn-ghost btn-sm" href="login.html"><span class="btn-label">Entrar</span></a>',
        '<a class="btn btn-primary btn-sm" href="login.html?tab=register"><span class="btn-label">Criar conta</span></a>'
      ].join("");
    }

    host.className = "site-header";
    host.innerHTML = [
      '<div class="header-inner">',
      '  <a class="brand" href="index.html"><span class="logo-mark">♪</span><span>Cantoria</span></a>',
      '  <nav class="main-nav" id="main-nav" aria-label="Navegação principal">' + navHtml + "</nav>",
      '  <div class="header-actions">' + actionsHtml + "</div>",
      '  <button class="menu-toggle" id="menu-toggle" aria-label="Abrir menu" aria-expanded="false">☰</button>',
      "</div>"
    ].join("");

    /* Menu mobile */
    const menuToggle = document.getElementById("menu-toggle");
    const mainNav = document.getElementById("main-nav");
    if (menuToggle && mainNav) {
      menuToggle.addEventListener("click", function () {
        const open = mainNav.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(open));
      });
    }

    /* Dropdown do usuário */
    const userBtn = document.getElementById("user-menu-btn");
    const dropdown = document.getElementById("user-dropdown");
    if (userBtn && dropdown) {
      userBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        const open = dropdown.classList.toggle("open");
        userBtn.setAttribute("aria-expanded", String(open));
      });
      document.addEventListener("click", function () {
        dropdown.classList.remove("open");
        userBtn.setAttribute("aria-expanded", "false");
      });
      dropdown.addEventListener("click", function (e) { e.stopPropagation(); });
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        Store.logout();
        toast("Você saiu da sua conta.", "info");
        setTimeout(function () { window.location.reload(); }, 400);
      });
    }
  }

  /* ---------- Footer ---------- */
  function renderFooter() {
    if (document.querySelector(".site-footer")) return;
    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = [
      '<div class="footer-inner">',
      '  <div class="footer-brand">',
      '    <a class="brand" href="index.html"><span class="logo-mark">♪</span><span>Cantoria</span></a>',
      '    <p>Leia, ouça e compartilhe as letras das músicas que você ama. Projeto de demonstração — todo o conteúdo é armazenado localmente no seu navegador.</p>',
      "  </div>",
      '  <div class="footer-links">',
      '    <div class="footer-col">',
      "      <strong>Navegar</strong>",
      '      <a href="index.html">Início</a>',
      '      <a href="letras.html">Catálogo</a>',
      '      <a href="playlists.html">Playlists</a>',
      '      <a href="enviar.html">Enviar letra</a>',
      "    </div>",
      '    <div class="footer-col">',
      "      <strong>Conta</strong>",
      '      <a href="login.html">Entrar</a>',
      '      <a href="login.html?tab=register">Criar conta</a>',
      '      <a href="letras.html?fav=1">Favoritas</a>',
      '      <a href="playlists.html">Playlists</a>',
      "    </div>",
      "  </div>",
      "</div>"
    ].join("");
    document.body.appendChild(footer);
  }

  /* ---------- Card de música ---------- */
  function renderCard(song, options) {
    options = options || {};
    const url = "musica.html?id=" + encodeURIComponent(song.id);
    const favorite = Store.isFavorite(song.id);
    const meta = [];
    if (song.year) meta.push("<span>" + song.year + "</span>");
    meta.push("<span>" + formatNumber(song.views) + " plays</span>");

    return [
      '<article class="card" data-song-id="' + escapeHtml(song.id) + '">',
      '  <div class="card-cover">',
      '    <a href="' + url + '" aria-label="Abrir ' + escapeHtml(song.title) + '">',
      coverMarkup(song),
      "    </a>",
      '    <button class="card-fav' + (favorite ? " active" : "") + '" data-fav="' + escapeHtml(song.id) + '" title="' +
      (favorite ? "Remover dos favoritos" : "Adicionar aos favoritos") + '" aria-label="Favoritar">' +
      (favorite ? "♥" : "♡") + "</button>",
      '    <button class="card-add" data-add-playlist="' + escapeHtml(song.id) + '" title="Adicionar à playlist" aria-label="Adicionar à playlist">+</button>',
      song.year ? '    <span class="card-badge">' + song.year + "</span>" : "",
      '    <button class="cover-play" data-play="' + escapeHtml(song.id) + '" title="Reproduzir" aria-label="Reproduzir ' + escapeHtml(song.title) + '"><span>▶</span></button>',
      "  </div>",
      '  <div class="card-body">',
      '    <h3 class="card-title"><a href="' + url + '">' + escapeHtml(song.title) + "</a></h3>",
      '    <p class="card-artist">' + escapeHtml(song.artist) + "</p>",
      '    <div class="card-meta">' + meta.join("") + "</div>",
      "  </div>",
      "</article>"
    ].join("");
  }

  /* Delega eventos de play/favorito dentro de um container */
  function bindCardEvents(container, queue) {
    if (!container || container.dataset.bound === "1") return;
    container.dataset.bound = "1";

    container.addEventListener("click", function (e) {
      const favBtn = e.target.closest("[data-fav]");
      if (favBtn) {
        e.preventDefault();
        const id = favBtn.getAttribute("data-fav");
        const added = Store.toggleFavorite(id);
        favBtn.classList.toggle("active", added);
        favBtn.textContent = added ? "♥" : "♡";
        favBtn.title = added ? "Remover dos favoritos" : "Adicionar aos favoritos";
        toast(added ? "Adicionada aos favoritos." : "Removida dos favoritos.", added ? "success" : "info", 2000);
        document.dispatchEvent(new CustomEvent("cantoria:favorites-changed"));
        return;
      }

      const playBtn = e.target.closest("[data-play]");
      if (playBtn) {
        e.preventDefault();
        const id = playBtn.getAttribute("data-play");
        const song = (queue || []).find(function (s) { return s.id === id; }) || Store.findSong(id);
        if (song) Player.toggleSong(song, queue);
        return;
      }

      const addBtn = e.target.closest("[data-add-playlist]");
      if (addBtn) {
        e.preventDefault();
        const id = addBtn.getAttribute("data-add-playlist");
        const song = (queue || []).find(function (s) { return s.id === id; }) || Store.findSong(id);
        if (song) openAddToPlaylist(song);
      }
    });

    /* Atualiza ícone de reproduzir conforme o player */
    Player.onChange(function (state) {
      container.querySelectorAll("[data-play]").forEach(function (btn) {
        const id = btn.getAttribute("data-play");
        const playing = state.playing && state.song && state.song.id === id;
        btn.classList.toggle("playing", playing);
        const icon = btn.querySelector("span");
        if (icon) icon.textContent = playing ? "❚❚" : "▶";
      });
    });
  }

  function renderCardList(container, songs, options) {
    if (!container) return;
    container.innerHTML = songs.map(function (song) { return renderCard(song, options); }).join("");
    bindCardEvents(container, songs);
  }

  /* ---------- Adicionar à playlist ---------- */
  function openAddToPlaylist(song) {
    const user = Store.getCurrentUser();
    if (!user) {
      toast("Entre na sua conta para criar playlists.", "info");
      setTimeout(function () {
        window.location.href = "login.html?redirect=" + encodeURIComponent("musica.html?id=" + song.id);
      }, 900);
      return;
    }

    const playlists = Store.getPlaylistsByUser(user.id);
    const containing = Store.getPlaylistsContaining(song.id).map(function (pl) { return pl.id; });

    const listHtml = playlists.length
      ? playlists.map(function (pl) {
        const has = containing.indexOf(pl.id) !== -1;
        return [
          '<button type="button" class="playlist-option' + (has ? " added" : "") + '" data-pl="' + escapeHtml(pl.id) + '"' + (has ? " disabled" : "") + '>',
          '  <span class="playlist-option-icon">' + escapeHtml(pl.icon || "🎧") + "</span>",
          '  <span class="playlist-option-body">',
          '    <strong>' + escapeHtml(pl.name) + "</strong>",
          '    <small>' + pl.songIds.length + (pl.songIds.length === 1 ? " música" : " músicas") + "</small>",
          "  </span>",
          '  <span class="playlist-option-state">' + (has ? "✓" : "+") + "</span>",
          "</button>"
        ].join("");
      }).join("")
      : '<p class="hint" style="margin:0 0 12px">Você ainda não tem playlists. Crie a primeira abaixo.</p>';

    const root = document.getElementById("modal-root") || document.body;
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = [
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="pl-modal-title">',
      '  <h3 id="pl-modal-title">Adicionar à playlist</h3>',
      '  <p>' + escapeHtml(song.title) + " — " + escapeHtml(song.artist) + "</p>",
      '  <div class="playlist-options">' + listHtml + "</div>",
      '  <div class="playlist-create-row">',
      '    <input type="text" id="pl-new-name" maxlength="60" placeholder="Nova playlist..." aria-label="Nome da nova playlist" />',
      '    <button type="button" class="btn btn-primary btn-sm" id="pl-create-btn">Criar</button>',
      "  </div>",
      '  <p class="form-error" id="pl-modal-error" hidden></p>',
      '  <div class="modal-actions">',
      '    <button type="button" class="btn btn-ghost" id="pl-modal-close">Fechar</button>',
      '  </div>',
      "</div>"
    ].join("");

    root.appendChild(backdrop);

    function close() {
      backdrop.remove();
      document.removeEventListener("keydown", onKey);
      document.dispatchEvent(new CustomEvent("cantoria:playlists-changed"));
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    function showError(message) {
      const el = backdrop.querySelector("#pl-modal-error");
      if (!el) return;
      el.textContent = message || "";
      el.hidden = !message;
    }

    backdrop.querySelector("#pl-modal-close").addEventListener("click", close);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", onKey);

    backdrop.querySelectorAll("[data-pl]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const result = Store.addSongToPlaylist(btn.getAttribute("data-pl"), song.id);
        if (!result.ok) {
          showError(result.error);
          return;
        }
        toast('Adicionada a "' + result.playlist.name + '".', "success", 2200);
        close();
      });
    });

    function createAndAdd() {
      const input = backdrop.querySelector("#pl-new-name");
      const name = input.value.trim();
      if (name.length < 2) {
        showError("Dê um nome à sua playlist.");
        input.focus();
        return;
      }
      const created = Store.createPlaylist({ name: name });
      if (!created.ok) {
        showError(created.error);
        return;
      }
      Store.addSongToPlaylist(created.playlist.id, song.id);
      toast('Playlist "' + created.playlist.name + '" criada com esta música.', "success", 2600);
      close();
    }

    backdrop.querySelector("#pl-create-btn").addEventListener("click", createAndAdd);
    backdrop.querySelector("#pl-new-name").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); createAndAdd(); }
    });
  }

  /* ---------- Card de playlist ---------- */
  function renderPlaylistCard(playlist) {
    const songs = Store.resolvePlaylistSongs(playlist);
    const covers = songs.slice(0, 4);
    const url = "playlist.html?id=" + encodeURIComponent(playlist.id);
    const user = Store.getCurrentUser();
    const mine = user && playlist.ownerId === user.id;

    const mosaic = covers.length
      ? '<div class="playlist-mosaic">' + covers.map(function (song) {
        return '<span class="mosaic-tile">' + coverMarkup(song) + "</span>";
      }).join("") + "</div>"
      : '<div class="playlist-mosaic empty"><span>' + escapeHtml(playlist.icon || "🎧") + "</span></div>";

    return [
      '<article class="playlist-card" data-playlist-id="' + escapeHtml(playlist.id) + '">',
      '  <a class="playlist-cover" href="' + url + '" aria-label="Abrir playlist ' + escapeHtml(playlist.name) + '">',
      mosaic,
      "  </a>",
      '  <div class="playlist-body">',
      '    <h3 class="playlist-name"><a href="' + url + '">' + escapeHtml(playlist.name) + "</a></h3>",
      '    <p class="playlist-count">' + songs.length + (songs.length === 1 ? " música" : " músicas") +
      (mine ? "" : " · de " + escapeHtml(playlist.ownerName)) + "</p>",
      '    <div class="playlist-actions">',
      '      <button class="btn btn-primary btn-sm" data-pl-play="' + escapeHtml(playlist.id) + '"' + (songs.length ? "" : " disabled") + ">▶ Reproduzir</button>",
      '      <a class="btn btn-ghost btn-sm" href="' + url + '">Abrir</a>',
      "    </div>",
      "  </div>",
      "</article>"
    ].join("");
  }

  function bindPlaylistEvents(container) {
    if (!container || container.dataset.bound === "1") return;
    container.dataset.bound = "1";
    container.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-pl-play]");
      if (!btn || btn.disabled) return;
      e.preventDefault();
      const playlist = Store.findPlaylist(btn.getAttribute("data-pl-play"));
      const songs = Store.resolvePlaylistSongs(playlist);
      if (!songs.length) return;
      const playable = songs.filter(function (s) { return s.audio; });
      Player.playQueue(songs, 0);
      if (!playable.length) toast("Esta playlist não tem áudios disponíveis.", "info");
    });
  }

  function renderPlaylistList(container, playlists) {
    if (!container) return;
    container.innerHTML = playlists.map(renderPlaylistCard).join("");
    bindPlaylistEvents(container);
  }

  function renderStatusBadge(status) {
    const labels = { pending: "Pendente", published: "Publicada", rejected: "Rejeitada", deleted: "Excluída" };
    return '<span class="badge-status ' + escapeHtml(status) + '">' + (labels[status] || escapeHtml(status)) + "</span>";
  }

  /* ---------- Boot ---------- */
  function boot() {
    renderHeader();
    renderFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  return {
    escapeHtml: escapeHtml,
    initials: initials,
    formatNumber: formatNumber,
    formatDate: formatDate,
    timeAgo: timeAgo,
    normalize: normalize,
    coverMarkup: coverMarkup,
    toast: toast,
    openModal: openModal,
    confirmDialog: confirmDialog,
    renderHeader: renderHeader,
    renderFooter: renderFooter,
    renderCard: renderCard,
    renderCardList: renderCardList,
    bindCardEvents: bindCardEvents,
    openAddToPlaylist: openAddToPlaylist,
    renderPlaylistCard: renderPlaylistCard,
    renderPlaylistList: renderPlaylistList,
    bindPlaylistEvents: bindPlaylistEvents,
    renderStatusBadge: renderStatusBadge
  };
})();

/* Alias global para o player */
window.UI = UI;
