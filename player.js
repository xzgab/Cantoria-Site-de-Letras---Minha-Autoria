/* ==========================================================================
   Cantoria — Player de áudio
   Barra fixa compartilhada por todas as páginas.
   ========================================================================== */

const Player = (function () {
  "use strict";

  const audio = new Audio();
  audio.preload = "metadata";

  const state = {
    song: null,
    queue: [],
    queueIndex: -1,
    playing: false,
    seeking: false,
    lastVolume: 0.85
  };

  let bar = null;
  const listeners = [];

  /* ---------- Utilidades ---------- */
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text == null ? "" : text);
    return div.innerHTML;
  }

  function coverMarkup(song, cls) {
    if (song && song.cover) {
      return '<img class="' + cls + '" src="' + escapeHtml(song.cover) + '" alt="Capa de ' + escapeHtml(song.title) + '" onerror="this.style.display=\'none\'" />';
    }
    const grad = (song && song.gradient) || ["#b06cff", "#ff6c9f"];
    return '<div class="' + cls + '" style="background:linear-gradient(135deg,' + grad[0] + ',' + grad[1] + ');display:grid;place-items:center;font-size:1.4rem;color:rgba(255,255,255,.85)">♪</div>';
  }

  /* ---------- Construção da barra ---------- */
  function buildBar() {
    if (bar && document.body.contains(bar)) return bar;
    bar = document.getElementById("player-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "player-bar";
      bar.className = "player-bar";
      document.body.appendChild(bar);
    }
    bar.setAttribute("aria-hidden", "true");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Player de música");
    bar.innerHTML = [
      '<div class="player-inner">',
      '  <div id="player-cover-slot"></div>',
      '  <div class="player-info">',
      '    <div class="player-title" id="player-title">—</div>',
      '    <div class="player-artist" id="player-artist"></div>',
      '  </div>',
      '  <div class="player-center">',
      '    <div class="player-controls">',
      '      <button class="player-btn" id="player-prev" title="Anterior" aria-label="Faixa anterior">⏮</button>',
      '      <button class="player-btn play" id="player-toggle" title="Reproduzir" aria-label="Reproduzir">▶</button>',
      '      <button class="player-btn" id="player-next" title="Próxima" aria-label="Próxima faixa">⏭</button>',
      '    </div>',
      '    <div class="player-progress">',
      '      <span class="time" id="player-current">0:00</span>',
      '      <div class="progress-track" id="player-track" role="slider" tabindex="0" aria-label="Progresso da música" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">',
      '        <div class="progress-fill" id="player-fill"></div>',
      '      </div>',
      '      <span class="time" id="player-duration">0:00</span>',
      '    </div>',
      '  </div>',
      '  <div class="player-extra">',
      '    <div class="player-volume">',
      '      <button class="player-btn" id="player-mute" title="Silenciar" aria-label="Silenciar">🔊</button>',
      '      <input type="range" class="volume-slider" id="player-volume" min="0" max="1" step="0.01" value="0.85" aria-label="Volume" />',
      '    </div>',
      '    <span class="player-queue" id="player-queue"></span>',
      '  </div>',
      '</div>'
    ].join("");

    audio.volume = state.lastVolume;
    bindEvents();
    return bar;
  }

  function bindEvents() {
    const toggle = document.getElementById("player-toggle");
    const prev = document.getElementById("player-prev");
    const next = document.getElementById("player-next");
    const track = document.getElementById("player-track");
    const mute = document.getElementById("player-mute");
    const volume = document.getElementById("player-volume");

    toggle.addEventListener("click", togglePlay);
    prev.addEventListener("click", playPrevious);
    next.addEventListener("click", playNext);
    mute.addEventListener("click", toggleMute);

    volume.addEventListener("input", function (e) {
      const value = Number(e.target.value);
      state.lastVolume = value > 0 ? value : state.lastVolume;
      audio.volume = value;
      audio.muted = value === 0;
      updateMuteIcon();
    });

    track.addEventListener("click", function (e) {
      if (!audio.duration) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      audio.currentTime = ratio * audio.duration;
    });

    track.addEventListener("keydown", function (e) {
      if (!audio.duration) return;
      if (e.key === "ArrowRight") { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); e.preventDefault(); }
      if (e.key === "ArrowLeft") { audio.currentTime = Math.max(0, audio.currentTime - 5); e.preventDefault(); }
    });

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("durationchange", updateProgress);
    audio.addEventListener("play", function () { state.playing = true; syncButtons(); });
    audio.addEventListener("pause", function () { state.playing = false; syncButtons(); });
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("volumechange", updateMuteIcon);
  }

  /* ---------- UI ---------- */
  function syncButtons() {
    const toggle = document.getElementById("player-toggle");
    if (!toggle) return;
    toggle.textContent = state.playing ? "⏸" : "▶";
    toggle.setAttribute("aria-label", state.playing ? "Pausar" : "Reproduzir");
    toggle.title = state.playing ? "Pausar" : "Reproduzir";
    listeners.forEach(function (fn) { fn(state); });
  }

  function updateProgress() {
    const current = document.getElementById("player-current");
    const duration = document.getElementById("player-duration");
    const fill = document.getElementById("player-fill");
    const track = document.getElementById("player-track");
    if (!current || !duration || !fill) return;

    const dur = audio.duration || 0;
    const cur = audio.currentTime || 0;
    current.textContent = formatTime(cur);
    duration.textContent = dur ? formatTime(dur) : "0:00";
    const percent = dur ? (cur / dur) * 100 : 0;
    fill.style.width = percent + "%";
    if (track) track.setAttribute("aria-valuenow", Math.round(percent));
  }

  function updateMuteIcon() {
    const mute = document.getElementById("player-mute");
    if (!mute) return;
    const muted = audio.muted || audio.volume === 0;
    mute.textContent = muted ? "🔇" : "🔊";
  }

  function renderSong() {
    const song = state.song;
    const coverSlot = document.getElementById("player-cover-slot");
    const title = document.getElementById("player-title");
    const artist = document.getElementById("player-artist");
    const queue = document.getElementById("player-queue");
    if (!title) return;

    coverSlot.innerHTML = song ? coverMarkup(song, "player-cover") : "";
    title.textContent = song ? song.title : "—";
    artist.textContent = song ? song.artist : "";
    if (queue) {
      queue.textContent = state.queue.length && state.queueIndex >= 0
        ? (state.queueIndex + 1) + " / " + state.queue.length
        : "";
    }
    document.title = song
      ? (state.playing ? "▶ " : "") + song.title + " — " + song.artist + " · Cantoria"
      : document.title.replace(/^▶ /, "");
  }

  /* ---------- Controles ---------- */
  function showBar() {
    buildBar();
    bar.classList.add("visible");
    bar.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-player");
  }

  function playQueue(queue, startIndex) {
    state.queue = Array.isArray(queue) ? queue.slice() : [];
    state.queueIndex = typeof startIndex === "number" ? startIndex : 0;
    const song = state.queue[state.queueIndex];
    if (!song) return;
    load(song);
    if (song.audio) play();
  }

  function load(song) {
    if (!song) return;
    state.song = song;
    showBar();
    renderSong();
    audio.pause();
    audio.removeAttribute("src");

    if (song.audio) {
      audio.src = song.audio;
      audio.load();
    }
    updateProgress();
    syncButtons();
    listeners.forEach(function (fn) { fn(state); });
  }

  function play() {
    if (!state.song) return;
    if (!state.song.audio) {
      if (window.UI && UI.toast) UI.toast("Esta letra não tem áudio disponível.", "info");
      return;
    }
    const promise = audio.play();
    if (promise && promise.catch) {
      promise.catch(function (err) {
        console.warn("[Player] Não foi possível reproduzir:", err);
        if (window.UI && UI.toast) UI.toast("Não foi possível reproduzir o áudio.", "error");
      });
    }
  }

  function pause() { audio.pause(); }

  function togglePlay() {
    if (!state.song) return;
    if (state.playing) pause();
    else play();
  }

  function playNext() {
    if (!state.queue.length) return;
    if (state.queueIndex >= state.queue.length - 1) {
      state.queueIndex = 0;
    } else {
      state.queueIndex++;
    }
    const song = state.queue[state.queueIndex];
    load(song);
    if (song.audio) play();
  }

  function playPrevious() {
    if (!state.queue.length) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    state.queueIndex = state.queueIndex <= 0 ? state.queue.length - 1 : state.queueIndex - 1;
    const song = state.queue[state.queueIndex];
    load(song);
    if (song.audio) play();
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    updateMuteIcon();
  }

  function onEnded() {
    state.playing = false;
    syncButtons();
    if (state.queue.length > 1) playNext();
  }

  function onError() {
    state.playing = false;
    syncButtons();
  }

  function seek(seconds) {
    if (audio.duration) audio.currentTime = Math.min(audio.duration, Math.max(0, seconds));
  }

  function currentSong() { return state.song; }
  function nextSong() {
    if (!state.queue.length) return null;
    return state.queue[(state.queueIndex + 1) % state.queue.length] || null;
  }

  function isPlaying(songId) {
    return !!state.song && state.song.id === songId && state.playing;
  }

  /* Play/pause em um card: reproduz ou pausa a música indicada */
  function toggleSong(song, queue) {
    if (state.song && state.song.id === song.id) {
      togglePlay();
      return;
    }
    const list = Array.isArray(queue) && queue.length ? queue : [song];
    const index = Math.max(0, list.findIndex(function (s) { return s.id === song.id; }));
    playQueue(list, index);
  }

  function onChange(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      const i = listeners.indexOf(fn);
      if (i > -1) listeners.splice(i, 1);
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildBar);
  } else {
    buildBar();
  }

  return {
    load: load,
    play: play,
    pause: pause,
    playQueue: playQueue,
    playNext: playNext,
    playPrevious: playPrevious,
    toggleSong: toggleSong,
    togglePlay: togglePlay,
    toggleMute: toggleMute,
    seek: seek,
    currentSong: currentSong,
    nextSong: nextSong,
    isPlaying: isPlaying,
    formatTime: formatTime,
    onChange: onChange,
    showBar: showBar
  };
})();
