/* ==========================================================================
   Cantoria — Loja de dados (localStorage)
   Simula backend: usuários, sessão, favoritos, contribuições e contagem.
   ========================================================================== */

const Store = (function () {
  "use strict";

  const KEYS = {
    users: "cantoria:users",
    session: "cantoria:session",
    submissions: "cantoria:submissions",
    favorites: "cantoria:favorites",
    views: "cantoria:views",
    playlists: "cantoria:playlists",
    removedSongs: "cantoria:removedSongs",
    seed: "cantoria:seed:v1"
  };

  /* ---------- Utilitários internos ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn("[Store] Falha ao ler " + key, err);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn("[Store] Falha ao salvar " + key, err);
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* Hash simples (não é segurança real — apenas demo local) */
  function hashPassword(password) {
    let hash = 0;
    const salted = "cantoria$" + password;
    for (let i = 0; i < salted.length; i++) {
      hash = (hash << 5) - hash + salted.charCodeAt(i);
      hash |= 0;
    }
    return "h" + Math.abs(hash).toString(36);
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  /* ---------- Seed inicial ---------- */
  function seed() {
    if (localStorage.getItem(KEYS.seed)) return;

    const users = read(KEYS.users, []);
    if (!users.some(function (u) { return u.role === "admin"; })) {
      users.push({
        id: "user_admin",
        name: "Administrador",
        email: "admin@cantoria.com",
        password: hashPassword("admin123"),
        role: "admin",
        createdAt: new Date().toISOString()
      });
    }
    if (!users.some(function (u) { return u.email === "fã@cantoria.com"; })) {
      users.push({
        id: "user_demo",
        name: "Maria Cantora",
        email: "fã@cantoria.com",
        password: hashPassword("123456"),
        role: "user",
        createdAt: new Date().toISOString()
      });
    }
    write(KEYS.users, users);

    /* Contribuições de exemplo para o painel de moderação */
    if (!read(KEYS.submissions, null)) {
      write(KEYS.submissions, [
        {
          id: uid("sub"),
          title: "Ciranda da Bailarina",
          artist: "Chico Buarque & Edu Lobo",
          genre: "mpb",
          year: 1984,
          cover: "",
          audio: "",
          lyrics: "Procurando bem, todo mundo tem pereba\nMarca de bexiga ou vacina\nE tem piriri, tem lombriga, tem ameba\nSó a bailarina que não tem",
          notes: "Fonte: encarte oficial do disco.",
          status: "pending",
          authorId: "user_demo",
          authorName: "Maria Cantora",
          createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: ""
        },
        {
          id: uid("sub"),
          title: "Carinhoso",
          artist: "Pixinguinha",
          genre: "samba",
          year: 1937,
          cover: "",
          audio: "",
          lyrics: "Meu coração, não sei por quê\nBate feliz quando te vê\nE os meus olhos ficam sorrindo\nE pelos seus olhos vou dizendo\nQue é você a minha vida e a razão do meu viver",
          notes: "Letra de João de Barro.",
          status: "pending",
          authorId: "user_demo",
          authorName: "Maria Cantora",
          createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: ""
        }
      ]);
    }

    write(KEYS.seed, true);
  }

  /* ---------- Usuários ---------- */
  function getUsers() {
    return read(KEYS.users, []);
  }

  function publicUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };
  }

  function findUserByEmail(email) {
    const target = normalizeEmail(email);
    return getUsers().find(function (u) { return u.email === target; }) || null;
  }

  function register(data) {
    const name = String(data.name || "").trim();
    const email = normalizeEmail(data.email);
    const password = String(data.password || "");

    if (name.length < 2) return { ok: false, error: "Informe seu nome completo." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: "E-mail inválido." };
    if (password.length < 6) return { ok: false, error: "A senha deve ter pelo menos 6 caracteres." };
    if (findUserByEmail(email)) return { ok: false, error: "Já existe uma conta com este e-mail." };

    const users = getUsers();
    const user = {
      id: uid("user"),
      name: name,
      email: email,
      password: hashPassword(password),
      role: "user",
      createdAt: new Date().toISOString()
    };
    users.push(user);
    write(KEYS.users, users);
    write(KEYS.session, user.id);
    return { ok: true, user: publicUser(user) };
  }

  function login(email, password) {
    const user = findUserByEmail(email);
    if (!user) return { ok: false, error: "E-mail ou senha incorretos." };
    if (user.password !== hashPassword(String(password || ""))) {
      return { ok: false, error: "E-mail ou senha incorretos." };
    }
    write(KEYS.session, user.id);
    return { ok: true, user: publicUser(user) };
  }

  function logout() {
    localStorage.removeItem(KEYS.session);
  }

  function getCurrentUser() {
    const id = read(KEYS.session, null);
    if (!id) return null;
    const user = getUsers().find(function (u) { return u.id === id; });
    return user ? publicUser(user) : (logout(), null);
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  function isAdmin() {
    const user = getCurrentUser();
    return !!user && user.role === "admin";
  }

  function updateRole(userId, role) {
    const users = getUsers();
    const user = users.find(function (u) { return u.id === userId; });
    if (!user) return false;
    user.role = role;
    write(KEYS.users, users);
    return true;
  }

  function removeUser(userId) {
    const users = getUsers().filter(function (u) { return u.id !== userId; });
    write(KEYS.users, users);
    if (read(KEYS.session, null) === userId) logout();
  }

  /* ---------- Favoritos ---------- */
  function getFavorites() {
    return read(KEYS.favorites, []);
  }

  function isFavorite(songId) {
    return getFavorites().indexOf(songId) !== -1;
  }

  function toggleFavorite(songId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(songId);
    if (index === -1) favorites.push(songId);
    else favorites.splice(index, 1);
    write(KEYS.favorites, favorites);
    return index === -1;
  }

  /* ---------- Playlists ----------
     Estrutura: { id, name, description, ownerId, ownerName, songIds[], createdAt, updatedAt }
     ---------------------------------------------------------------- */
  const PLAYLIST_ICONS = ["🎧", "🎸", "🔥", "🌙", "💿", "🌊", "✨", "🎤"];

  function getPlaylists() {
    return read(KEYS.playlists, []);
  }

  function savePlaylists(list) {
    return write(KEYS.playlists, list);
  }

  function getPlaylistsByUser(userId) {
    return getPlaylists()
      .filter(function (pl) { return pl.ownerId === userId; })
      .sort(function (a, b) { return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt); });
  }

  function getPublicPlaylists() {
    return getPlaylists()
      .filter(function (pl) { return pl.songIds && pl.songIds.length; })
      .sort(function (a, b) { return (b.songIds.length || 0) - (a.songIds.length || 0); });
  }

  function findPlaylist(id) {
    return getPlaylists().find(function (pl) { return pl.id === id; }) || null;
  }

  function createPlaylist(data) {
    const user = getCurrentUser();
    if (!user) return { ok: false, error: "Entre na sua conta para criar playlists." };

    const name = String(data.name || "").trim();
    if (name.length < 2) return { ok: false, error: "Dê um nome à sua playlist." };
    if (name.length > 60) return { ok: false, error: "O nome da playlist é longo demais." };

    const list = getPlaylists();
    const duplicate = list.some(function (pl) {
      return pl.ownerId === user.id && pl.name.toLowerCase() === name.toLowerCase();
    });
    if (duplicate) return { ok: false, error: "Você já tem uma playlist com esse nome." };

    const now = new Date().toISOString();
    const playlist = {
      id: uid("pl"),
      name: name,
      description: String(data.description || "").trim().slice(0, 200),
      icon: data.icon || PLAYLIST_ICONS[list.length % PLAYLIST_ICONS.length],
      ownerId: user.id,
      ownerName: user.name,
      songIds: [],
      createdAt: now,
      updatedAt: now
    };

    list.push(playlist);
    savePlaylists(list);
    return { ok: true, playlist: playlist };
  }

  function updatePlaylist(id, changes) {
    const user = getCurrentUser();
    const list = getPlaylists();
    const playlist = list.find(function (pl) { return pl.id === id; });
    if (!playlist) return { ok: false, error: "Playlist não encontrada." };
    if (!user || (playlist.ownerId !== user.id && user.role !== "admin")) {
      return { ok: false, error: "Você não tem permissão para editar esta playlist." };
    }

    if (changes.name !== undefined) {
      const name = String(changes.name).trim();
      if (name.length < 2) return { ok: false, error: "Dê um nome à sua playlist." };
      if (name.length > 60) return { ok: false, error: "O nome da playlist é longo demais." };
      playlist.name = name;
    }
    if (changes.description !== undefined) {
      playlist.description = String(changes.description).trim().slice(0, 200);
    }
    if (changes.icon !== undefined) {
      playlist.icon = String(changes.icon || "🎧").slice(0, 4);
    }

    playlist.updatedAt = new Date().toISOString();
    savePlaylists(list);
    return { ok: true, playlist: playlist };
  }

  function deletePlaylist(id) {
    const user = getCurrentUser();
    const list = getPlaylists();
    const playlist = list.find(function (pl) { return pl.id === id; });
    if (!playlist) return { ok: false, error: "Playlist não encontrada." };
    if (!user || (playlist.ownerId !== user.id && user.role !== "admin")) {
      return { ok: false, error: "Você não tem permissão para excluir esta playlist." };
    }
    savePlaylists(list.filter(function (pl) { return pl.id !== id; }));
    return { ok: true };
  }

  function addSongToPlaylist(playlistId, songId) {
    const user = getCurrentUser();
    if (!user) return { ok: false, error: "Entre na sua conta para usar playlists." };

    const list = getPlaylists();
    const playlist = list.find(function (pl) { return pl.id === playlistId; });
    if (!playlist) return { ok: false, error: "Playlist não encontrada." };
    if (playlist.ownerId !== user.id && user.role !== "admin") {
      return { ok: false, error: "Você não tem permissão para editar esta playlist." };
    }
    if (!findSong(songId)) return { ok: false, error: "Música não encontrada." };
    if (playlist.songIds.indexOf(songId) !== -1) {
      return { ok: false, error: "Esta música já está na playlist.", duplicated: true };
    }

    playlist.songIds.push(songId);
    playlist.updatedAt = new Date().toISOString();
    savePlaylists(list);
    return { ok: true, playlist: playlist };
  }

  function removeSongFromPlaylist(playlistId, songId) {
    const user = getCurrentUser();
    const list = getPlaylists();
    const playlist = list.find(function (pl) { return pl.id === playlistId; });
    if (!playlist) return { ok: false, error: "Playlist não encontrada." };
    if (!user || (playlist.ownerId !== user.id && user.role !== "admin")) {
      return { ok: false, error: "Você não tem permissão para editar esta playlist." };
    }

    playlist.songIds = playlist.songIds.filter(function (id) { return id !== songId; });
    playlist.updatedAt = new Date().toISOString();
    savePlaylists(list);
    return { ok: true, playlist: playlist };
  }

  /* Move uma faixa na ordem (delta -1 sobe, +1 desce) */
  function moveSongInPlaylist(playlistId, fromIndex, toIndex) {
    const list = getPlaylists();
    const playlist = list.find(function (pl) { return pl.id === playlistId; });
    if (!playlist) return false;
    const ids = playlist.songIds;
    if (fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex >= ids.length) return false;
    if (fromIndex === toIndex) return true;

    const moved = ids.splice(fromIndex, 1)[0];
    ids.splice(toIndex, 0, moved);
    playlist.updatedAt = new Date().toISOString();
    savePlaylists(list);
    return true;
  }

  function reorderPlaylist(playlistId, orderedIds) {
    const list = getPlaylists();
    const playlist = list.find(function (pl) { return pl.id === playlistId; });
    if (!playlist) return false;
    playlist.songIds = orderedIds.slice();
    playlist.updatedAt = new Date().toISOString();
    savePlaylists(list);
    return true;
  }

  function getPlaylistsContaining(songId) {
    const user = getCurrentUser();
    return getPlaylists().filter(function (pl) {
      return pl.songIds.indexOf(songId) !== -1 && user && pl.ownerId === user.id;
    });
  }

  /* Resolve os ids da playlist em músicas, ignorando ids órfãos */
  function resolvePlaylistSongs(playlist) {
    if (!playlist) return [];
    const catalog = getCatalog();
    return playlist.songIds
      .map(function (id) { return catalog.find(function (s) { return s.id === id; }); })
      .filter(Boolean);
  }

  /* ---------- Visualizações ---------- */
  function getViewBoost() {
    return read(KEYS.views, {});
  }

  function registerView(songId) {
    const views = getViewBoost();
    views[songId] = (views[songId] || 0) + 1;
    write(KEYS.views, views);
  }

  /* ---------- Contribuições ---------- */
  function getSubmissions() {
    return read(KEYS.submissions, []);
  }

  function saveSubmissions(list) {
    return write(KEYS.submissions, list);
  }

  function addSubmission(data) {
    const user = getCurrentUser();
    if (!user) return { ok: false, error: "Você precisa entrar para enviar uma letra." };

    const title = String(data.title || "").trim();
    const artist = String(data.artist || "").trim();
    const lyrics = String(data.lyrics || "").trim();

    if (title.length < 2) return { ok: false, error: "Informe o título da música." };
    if (artist.length < 2) return { ok: false, error: "Informe o artista ou banda." };
    if (lyrics.length < 30) return { ok: false, error: "A letra parece curta demais (mínimo de 30 caracteres)." };
    if (!data.rights) return { ok: false, error: "É necessário confirmar a declaração de direitos autorais." };

    const duplicate = getSubmissions().some(function (s) {
      return s.status !== "rejected" &&
        s.title.toLowerCase() === title.toLowerCase() &&
        s.artist.toLowerCase() === artist.toLowerCase();
    });
    if (duplicate) return { ok: false, error: "Já existe uma contribuição com este título e artista." };

    const submission = {
      id: uid("sub"),
      title: title,
      artist: artist,
      genre: data.genre || "mpb",
      year: data.year ? Number(data.year) : null,
      cover: String(data.cover || "").trim(),
      audio: String(data.audio || "").trim(),
      lyrics: lyrics,
      notes: String(data.notes || "").trim(),
      status: "pending",
      authorId: user.id,
      authorName: user.name,
      createdAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: ""
    };

    const list = getSubmissions();
    list.push(submission);
    saveSubmissions(list);
    return { ok: true, submission: submission };
  }

  function updateSubmission(id, changes) {
    const list = getSubmissions();
    const item = list.find(function (s) { return s.id === id; });
    if (!item) return false;
    Object.assign(item, changes);
    saveSubmissions(list);
    return true;
  }

  function setSubmissionStatus(id, status, reviewer, reason) {
    return updateSubmission(id, {
      status: status,
      reviewedBy: reviewer ? reviewer.name : "Sistema",
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason || ""
    });
  }

  function deleteSubmission(id) {
    saveSubmissions(getSubmissions().filter(function (s) { return s.id !== id; }));
    removeSongFromAllPlaylists(slugifySongId(id));
  }

  /* Exclusão pelo autor: mantém o registro com status "deleted" para que
     uma música publicada saia do catálogo (o catálogo é derivado das
     contribuições publicadas, então apagar o registro a faria reaparecer). */
  function deleteSubmissionAsOwner(id) {
    const user = getCurrentUser();
    const item = getSubmissions().find(function (s) { return s.id === id; });
    if (!item) return { ok: false, error: "Contribuição não encontrada." };
    if (!user) return { ok: false, error: "Você precisa entrar para excluir uma contribuição." };
    if (item.authorId !== user.id && user.role !== "admin") {
      return { ok: false, error: "Você não tem permissão para excluir esta contribuição." };
    }

    const wasPublished = item.status === "published";
    const songId = slugifySongId(item.id);

    updateSubmission(id, {
      status: "deleted",
      deletedAt: new Date().toISOString(),
      deletedBy: user.name,
      wasPublished: wasPublished
    });

    removeSongFromAllPlaylists(songId);
    return { ok: true, wasPublished: wasPublished, songId: songId };
  }

  /* Remove uma música publicada do catálogo (ação do administrador).
     Só afeta contribuições; as músicas base do site permanecem. */
  function takeDownPublishedSong(submissionId, reviewer, reason) {
    const item = getSubmissions().find(function (s) { return s.id === submissionId; });
    if (!item) return { ok: false, error: "Contribuição não encontrada." };
    if (item.status !== "published") {
      return { ok: false, error: "Esta contribuição não está publicada." };
    }

    const songId = slugify(item.title + "-" + item.artist) || item.id;
    updateSubmission(item.id, {
      status: "deleted",
      deletedAt: new Date().toISOString(),
      deletedBy: reviewer ? reviewer.name : "Sistema",
      rejectionReason: reason || "Removida do catálogo pela administração.",
      wasPublished: true
    });
    removeSongFromAllPlaylists(songId);
    return { ok: true, songId: songId };
  }

  /* Remove uma música de todas as playlists (evita registros órfãos) */
  function removeSongFromAllPlaylists(songId) {
    if (!songId) return;
    const list = getPlaylists();
    let changed = false;
    list.forEach(function (pl) {
      if (pl.songIds && pl.songIds.indexOf(songId) !== -1) {
        pl.songIds = pl.songIds.filter(function (id) { return id !== songId; });
        pl.updatedAt = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) savePlaylists(list);
  }

  /* Id que uma contribuição publicada recebe no catálogo */
  function slugifySongId(submissionId) {
    const item = getSubmissions().find(function (s) { return s.id === submissionId; });
    if (!item) return "";
    return slugify(item.title + "-" + item.artist) || submissionId;
  }

  function getSubmissionsByUser(userId) {
    return getSubmissions()
      .filter(function (s) { return s.authorId === userId; })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  function getSubmissionsByStatus(status) {
    return getSubmissions()
      .filter(function (s) { return s.status === status; })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  /* Contribuições visíveis no histórico do usuário (excluídas somem) */
  function getActiveSubmissionsByUser(userId) {
    return getSubmissionsByUser(userId).filter(function (s) { return s.status !== "deleted"; });
  }

  /* Publicadas que continuam no catálogo */
  function getCatalogSubmissions() {
    return getSubmissionsByStatus("published");
  }

  function slugify(text) {
    return String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /* Publicação transforma a contribuição em música do catálogo */
  function toCatalogSong(submission) {
    const baseId = slugify(submission.title + "-" + submission.artist);
    return {
      id: baseId || submission.id,
      title: submission.title,
      artist: submission.artist,
      genre: submission.genre,
      year: submission.year || null,
      views: 0,
      currentViews: 0,
      featured: false,
      createdAt: (submission.createdAt || new Date().toISOString()).slice(0, 10),
      lyrics: submission.lyrics,
      cover: submission.cover || "",
      audio: submission.audio || "",
      gradient: COVER_GRADIENTS[submission.title.length % COVER_GRADIENTS.length],
      submissionId: submission.id,
      authorName: submission.authorName
    };
  }

  /* ---------- Estatísticas ---------- */
  function getStats() {
    const submissions = getSubmissions();
    return {
      songs: getCatalog().length,
      users: getUsers().length,
      playlists: getPlaylists().length,
      pending: submissions.filter(function (s) { return s.status === "pending"; }).length,
      published: submissions.filter(function (s) { return s.status === "published"; }).length,
      rejected: submissions.filter(function (s) { return s.status === "rejected"; }).length
    };
  }

  /* ---------- Músicas base ocultadas pela administração ---------- */
  function getRemovedBaseSongs() {
    return read(KEYS.removedSongs, {});
  }

  function removeBaseSong(songId, reviewer, reason) {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
      return { ok: false, error: "Apenas administradores podem excluir músicas do catálogo." };
    }
    const song = SONGS.find(function (s) { return s.id === songId; });
    if (!song) return { ok: false, error: "Esta não é uma música base do site." };

    const removed = getRemovedBaseSongs();
    removed[songId] = {
      removedAt: new Date().toISOString(),
      removedBy: reviewer ? reviewer.name : user.name,
      reason: reason || ""
    };
    write(KEYS.removedSongs, removed);
    removeSongFromAllPlaylists(songId);
    return { ok: true, songId: songId };
  }

  function restoreBaseSong(songId) {
    const removed = getRemovedBaseSongs();
    if (!removed[songId]) return false;
    delete removed[songId];
    write(KEYS.removedSongs, removed);
    return true;
  }

  /* ---------- Catálogo combinado ---------- */
  function getCatalog() {
    const published = getSubmissionsByStatus("published").map(toCatalogSong);
    const ids = SONGS.map(function (s) { return s.id; });
    const extra = published.filter(function (s) { return ids.indexOf(s.id) === -1; });
    const boosts = getViewBoost();
    const removed = getRemovedBaseSongs();

    const base = SONGS.filter(function (song) { return !removed[song.id]; });

    return base.concat(extra).map(function (song) {
      return Object.assign({}, song, {
        views: (song.views || 0) + (boosts[song.id] || 0)
      });
    });
  }

  /* Lista base (incluindo as ocultadas) para o painel admin */
  function getBaseSongsWithState() {
    const removed = getRemovedBaseSongs();
    return SONGS.map(function (song) {
      return Object.assign({}, song, {
        isBase: true,
        removed: !!removed[song.id],
        removedInfo: removed[song.id] || null
      });
    });
  }

  function findSong(id) {
    return getCatalog().find(function (s) { return s.id === id; }) || null;
  }

  /* ---------- Init ---------- */
  seed();

  return {
    /* sessão */
    register: register,
    login: login,
    logout: logout,
    getCurrentUser: getCurrentUser,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    /* usuários */
    getUsers: getUsers,
    findUserByEmail: findUserByEmail,
    updateRole: updateRole,
    removeUser: removeUser,
    /* catálogo */
    getCatalog: getCatalog,
    findSong: findSong,
    getBaseSongsWithState: getBaseSongsWithState,
    removeBaseSong: removeBaseSong,
    restoreBaseSong: restoreBaseSong,
    /* favoritos */
    getFavorites: getFavorites,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    /* playlists */
    PLAYLIST_ICONS: PLAYLIST_ICONS,
    getPlaylists: getPlaylists,
    getPlaylistsByUser: getPlaylistsByUser,
    getPublicPlaylists: getPublicPlaylists,
    findPlaylist: findPlaylist,
    createPlaylist: createPlaylist,
    updatePlaylist: updatePlaylist,
    deletePlaylist: deletePlaylist,
    addSongToPlaylist: addSongToPlaylist,
    removeSongFromPlaylist: removeSongFromPlaylist,
    moveSongInPlaylist: moveSongInPlaylist,
    reorderPlaylist: reorderPlaylist,
    getPlaylistsContaining: getPlaylistsContaining,
    resolvePlaylistSongs: resolvePlaylistSongs,
    /* views */
    registerView: registerView,
    /* contribuições */
    getSubmissions: getSubmissions,
    addSubmission: addSubmission,
    updateSubmission: updateSubmission,
    setSubmissionStatus: setSubmissionStatus,
    deleteSubmission: deleteSubmission,
    deleteSubmissionAsOwner: deleteSubmissionAsOwner,
    takeDownPublishedSong: takeDownPublishedSong,
    removeSongFromAllPlaylists: removeSongFromAllPlaylists,
    getSubmissionsByUser: getSubmissionsByUser,
    getActiveSubmissionsByUser: getActiveSubmissionsByUser,
    getSubmissionsByStatus: getSubmissionsByStatus,
    getCatalogSubmissions: getCatalogSubmissions,
    /* utilidades */
    slugify: slugify,
    getStats: getStats
  };
})();
