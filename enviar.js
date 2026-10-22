/* ==========================================================================
   Cantoria — Envio de letras e acompanhamento das contribuições
   ========================================================================== */

(function () {
  "use strict";

  function populateGenres() {
    const select = document.getElementById("f-genre");
    if (!select) return;
    select.innerHTML = GENRES.map(function (genre) {
      return '<option value="' + genre.id + '">' + UI.escapeHtml(genre.name) + "</option>";
    }).join("");
  }

  function renderSubmissions(user) {
    const section = document.getElementById("my-submissions-section");
    const list = document.getElementById("my-submissions");
    if (!section || !list) return;

    const submissions = Store.getActiveSubmissionsByUser(user.id);
    section.hidden = false;

    const counter = document.getElementById("my-submissions-count");
    if (counter) {
      counter.textContent = submissions.length
        ? submissions.length + (submissions.length === 1 ? " envio" : " envios")
        : "";
    }

    if (!submissions.length) {
      list.innerHTML = '<p class="hint" style="margin:0">Você ainda não enviou nenhuma letra. Suas contribuições aparecerão aqui.</p>';
      return;
    }

    list.innerHTML = submissions.map(function (sub) {
      const reason = sub.status === "rejected" && sub.rejectionReason
        ? '<p style="color:var(--danger)">Motivo: ' + UI.escapeHtml(sub.rejectionReason) + "</p>"
        : "";
      const published = sub.status === "published";
      const viewLink = published
        ? '<a class="btn btn-ghost btn-sm" href="musica.html?id=' +
        encodeURIComponent(Store.slugify(sub.title + "-" + sub.artist)) + '">Ver no site</a>'
        : "";
      return [
        '<div class="submission-item" data-sub-id="' + UI.escapeHtml(sub.id) + '">',
        '  <div class="submission-main">',
        "    <h4>" + UI.escapeHtml(sub.title) + "</h4>",
        "    <p>" + UI.escapeHtml(sub.artist) + " · " + UI.timeAgo(sub.createdAt) + "" +
        (published ? ' · <span style="color:var(--success)">no catálogo</span>' : "") + "</p>",
        reason,
        "  </div>",
        '  <div class="submission-actions">',
        UI.renderStatusBadge(sub.status),
        viewLink,
        '    <button class="btn btn-ghost btn-sm danger-ghost" data-delete-sub="' + UI.escapeHtml(sub.id) + '" title="Excluir contribuição">🗑 Excluir</button>',
        "  </div>",
        "</div>"
      ].join("");
    }).join("");
  }

  /* Exclusão feita pelo próprio autor */
  function bindSubmissionActions(user) {
    const list = document.getElementById("my-submissions");
    if (!list) return;

    list.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-delete-sub]");
      if (!btn) return;

      const id = btn.getAttribute("data-delete-sub");
      const sub = Store.getSubmissions().find(function (s) { return s.id === id; });
      if (!sub) return;

      const message = sub.status === "published"
        ? '"' + sub.title + '" já está publicada. Ao excluir, ela sairá do catálogo e de todas as playlists que a contenham. Deseja continuar?'
        : '"Excluir sua contribuição ' + sub.title + '"? Esta ação não pode ser desfeita.';

      UI.confirmDialog(message, function () {
        const result = Store.deleteSubmissionAsOwner(id);
        if (!result.ok) {
          UI.toast(result.error, "error");
          return;
        }
        UI.toast(result.wasPublished
          ? "Contribuição excluída e removida do catálogo."
          : "Contribuição excluída.", "info", 3000);
        renderSubmissions(user);
      }, {
        title: sub.status === "published" ? "Excluir música publicada" : "Excluir contribuição",
        confirmText: "Excluir",
        danger: true
      });
    });
  }

  function setError(el, message) {
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.hidden = false;
    } else {
      el.textContent = "";
      el.hidden = true;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const user = Store.getCurrentUser();
    const loginRequired = document.getElementById("login-required");
    const form = document.getElementById("submit-form");

    if (!user) {
      if (loginRequired) loginRequired.hidden = false;
      if (form) form.hidden = true;
      const section = document.getElementById("my-submissions-section");
      if (section) section.hidden = true;
      return;
    }

    if (loginRequired) loginRequired.hidden = true;
    if (form) form.hidden = false;

    populateGenres();
    renderSubmissions(user);
    bindSubmissionActions(user);

    /* Contador de caracteres */
    const lyrics = document.getElementById("f-lyrics");
    const counter = document.getElementById("lyrics-counter");
    if (lyrics && counter) {
      const updateCounter = function () {
        counter.textContent = lyrics.value.length + " caracteres";
      };
      lyrics.addEventListener("input", updateCounter);
      updateCounter();
    }

    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const errorEl = document.getElementById("form-error");
      const submitBtn = document.getElementById("submit-btn");
      setError(errorEl, "");

      const data = {
        title: document.getElementById("f-title").value,
        artist: document.getElementById("f-artist").value,
        genre: document.getElementById("f-genre").value,
        year: document.getElementById("f-year").value,
        cover: document.getElementById("f-cover").value,
        audio: document.getElementById("f-audio").value,
        lyrics: document.getElementById("f-lyrics").value,
        notes: document.getElementById("f-notes").value,
        rights: document.getElementById("f-rights").checked
      };

      if (!data.rights) {
        setError(errorEl, "É necessário confirmar a declaração de direitos autorais.");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Enviando...";
      }

      const result = Store.addSubmission(data);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar para revisão";
      }

      if (!result.ok) {
        setError(errorEl, result.error);
        return;
      }

      form.reset();
      if (counter) counter.textContent = "0 caracteres";
      renderSubmissions(user);
      UI.toast("Letra enviada para revisão! Obrigado pela contribuição.", "success", 4000);

      const section = document.getElementById("my-submissions-section");
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });    });

    form.addEventListener("reset", function () {
      setError(document.getElementById("form-error"), "");
      if (counter) counter.textContent = "0 caracteres";
    });
  });
})();
