/* ==========================================================================
   Cantoria — Painel de administrador
   Moderação de contribuições, catálogo e usuários.
   ========================================================================== */

(function () {
  "use strict";

  let currentUser = null;
  let activePanel = "pending";

  /* ---------- Utilidades ---------- */
  function coverOf(sub) {
    if (sub.cover) {
      return '<img src="' + UI.escapeHtml(sub.cover) + '" alt="" onerror="this.style.display=\'none\'" />';
    }
    const grad = COVER_GRADIENTS[(sub.title || "").length % COVER_GRADIENTS.length];
    return '<div style="width:64px;height:64px;border-radius:8px;background:linear-gradient(135deg,' +
      grad[0] + "," + grad[1] + ');display:grid;place-items:center;font-size:1.4rem;flex-shrink:0">♪</div>';
  }

  function refreshAll() {
    renderStats();
    renderPending();
    renderPublished();
    renderCatalog();
    renderRejected();
    renderUsers();
    updateBadge();
  }

  function updateBadge() {
    const badge = document.getElementById("badge-pending");
    if (!badge) return;
    const count = Store.getSubmissionsByStatus("pending").length;
    badge.textContent = count;
    badge.style.display = count ? "inline-block" : "none";
  }

  /* ---------- Estatísticas ---------- */
  function renderStats() {
    const host = document.getElementById("admin-stats");
    if (!host) return;
    const stats = Store.getStats();
    const cards = [
      { value: stats.songs, label: "Músicas no catálogo" },
      { value: stats.pending, label: "Aguardando revisão" },
      { value: stats.published, label: "Contribuições publicadas" },
      { value: stats.users, label: "Usuários cadastrados" },
      { value: stats.playlists, label: "Playlists criadas" }
    ];
    host.innerHTML = cards.map(function (card) {
      return [
        '<div class="stat-card">',
        '  <div class="stat-value">' + UI.formatNumber(card.value) + "</div>",
        '  <div class="stat-label">' + card.label + "</div>",
        "</div>"
      ].join("");
    }).join("");
  }

  /* ---------- Itens de moderação ---------- */
  function moderationItem(sub, actionsHtml) {
    const genreName = getGenreName(sub.genre);
    return [
      '<article class="mod-item" data-id="' + UI.escapeHtml(sub.id) + '">',
      '  <div class="mod-head">',
      coverOf(sub),
      '    <div class="mod-title">',
      "      <h4>" + UI.escapeHtml(sub.title) + "</h4>",
      "      <p>" + UI.escapeHtml(sub.artist) + " · " + UI.escapeHtml(genreName) +
      (sub.year ? " · " + sub.year : "") + "</p>",
      "      <p>Enviada por " + UI.escapeHtml(sub.authorName) + " " + UI.timeAgo(sub.createdAt) + "</p>",
      "    </div>",
      "  </div>",
      sub.notes ? '  <div class="mod-notes"><strong>Observação do autor:</strong> ' + UI.escapeHtml(sub.notes) + "</div>" : "",
      sub.status === "rejected" && sub.rejectionReason
        ? '  <div class="mod-notes" style="border-color:var(--danger)"><strong>Motivo da rejeição:</strong> ' +
        UI.escapeHtml(sub.rejectionReason) + "</div>"
        : "",
      '  <div class="mod-lyrics" data-lyrics>' + UI.escapeHtml(sub.lyrics) + "</div>",
      '  <div class="mod-actions">',
      '    <button class="btn btn-ghost btn-sm" data-toggle-lyrics>Ver letra completa</button>',
      '    <span class="spacer"></span>',
      actionsHtml,
      "  </div>",
      "</article>"
    ].join("");
  }

  function bindModerationEvents(container) {
    if (!container) return;
    container.querySelectorAll("[data-toggle-lyrics]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const lyrics = btn.closest(".mod-item").querySelector("[data-lyrics]");
        const expanded = lyrics.classList.toggle("expanded");
        btn.textContent = expanded ? "Recolher letra" : "Ver letra completa";
      });
    });

    container.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.closest(".mod-item").getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        handleAction(action, id);
      });
    });
  }

  /* ---------- Ações de moderação ---------- */
  function handleAction(action, id) {
    const submission = Store.getSubmissions().find(function (s) { return s.id === id; });
    if (!submission) return;

    if (action === "approve") {
      UI.confirmDialog(
        'Publicar "' + submission.title + '" no catálogo? A letra ficará visível para todos.',
        function () {
          Store.setSubmissionStatus(id, "published", currentUser);
          refreshAll();
          UI.toast("Letra publicada no catálogo.", "success");
        },
        { title: "Aprovar contribuição", confirmText: "Publicar" }
      );
      return;
    }

    if (action === "reject") {
      UI.openModal({
        title: "Rejeitar contribuição",
        message: 'Explique ao autor por que "' + submission.title + '" não será publicada.',
        fields: [
          {
            name: "reason",
            label: "Motivo da rejeição",
            placeholder: "Ex.: letra incompleta, direitos autorais não confirmados...",
            required: true
          }
        ],
        confirmText: "Rejeitar",
        danger: true,
        onConfirm: function (values) {
          Store.setSubmissionStatus(id, "rejected", currentUser, values.reason);
          refreshAll();
          UI.toast("Contribuição rejeitada.", "info");
        }
      });
      return;
    }

    if (action === "unpublish") {
      UI.confirmDialog(
        'Remover "' + submission.title + '" do catálogo público?',
        function () {
          Store.setSubmissionStatus(id, "pending", currentUser);
          refreshAll();
          UI.toast("Letra removida do catálogo e devolvida à fila.", "info");
        },
        { title: "Despublicar", confirmText: "Remover", danger: true }
      );
      return;
    }

    if (action === "delete") {
      UI.confirmDialog(
        'Excluir permanentemente "' + submission.title + '"? Esta ação não pode ser desfeita.',
        function () {
          Store.deleteSubmission(id);
          refreshAll();
          UI.toast("Contribuição excluída.", "info");
        },
        { title: "Excluir contribuição", confirmText: "Excluir", danger: true }
      );
      return;
    }

    if (action === "takdown") {
      UI.openModal({
        title: "Excluir música do catálogo",
        message: 'A música "' + submission.title + '" sairá do catálogo e de todas as playlists. Informe o motivo.',
        fields: [
          {
            name: "reason",
            label: "Motivo da remoção",
            placeholder: "Ex.: denúncia de direitos autorais, letra incorreta...",
            required: true
          }
        ],
        confirmText: "Excluir do catálogo",
        danger: true,
        onConfirm: function (values) {
          const result = Store.takeDownPublishedSong(id, currentUser, values.reason);
          if (!result.ok) {
            UI.toast(result.error, "error");
            return;
          }
          refreshAll();
          UI.toast("Música removida do catálogo.", "info");
        }
      });
      return;
    }

    if (action === "edit") {
      UI.openModal({
        title: "Editar contribuição",
        message: "Corrija os dados antes de publicar.",
        fields: [
          { name: "title", label: "Título", value: submission.title, required: true },
          { name: "artist", label: "Artista", value: submission.artist, required: true },
          { name: "year", label: "Ano", value: submission.year || "", type: "number" }
        ],
        confirmText: "Salvar",
        onConfirm: function (values) {
          Store.updateSubmission(id, {
            title: values.title.trim(),
            artist: values.artist.trim(),
            year: values.year ? Number(values.year) : null
          });
          refreshAll();
          UI.toast("Contribuição atualizada.", "success");
        }
      });
    }
  }

  /* ---------- Painéis ---------- */
  function renderPending() {
    const host = document.getElementById("panel-pending");
    if (!host) return;
    const items = Store.getSubmissionsByStatus("pending");

    if (!items.length) {
      host.innerHTML = [
        '<div class="empty-state">',
        '  <div class="empty-icon">✓</div>',
        "  <h3>Nada pendente</h3>",
        "  <p>Todas as contribuições foram revisadas.</p>",
        "</div>"
      ].join("");
      return;
    }

    host.innerHTML = items.map(function (sub) {
      return moderationItem(sub, [
        '<button class="btn btn-success btn-sm" data-action="approve">✓ Aprovar</button>',
        '<button class="btn btn-ghost btn-sm" data-action="edit">✎ Editar</button>',
        '<button class="btn btn-danger btn-sm" data-action="reject">✕ Rejeitar</button>'
      ].join(""));
    }).join("");
    bindModerationEvents(host);
  }

  function renderPublished() {
    const host = document.getElementById("panel-published");
    if (!host) return;
    const items = Store.getSubmissionsByStatus("published");

    if (!items.length) {
      host.innerHTML = '<div class="empty-state"><div class="empty-icon">🎵</div><h3>Nenhuma contribuição publicada</h3><p>Aprove uma contribuição pendente para vê-la aqui.</p></div>';
      return;
    }

    host.innerHTML = items.map(function (sub) {
      return moderationItem(sub, [
        '<button class="btn btn-ghost btn-sm" data-action="unpublish">↩ Despublicar</button>',
        '<button class="btn btn-ghost btn-sm" data-action="edit">✎ Editar</button>',
        '<button class="btn btn-danger btn-sm" data-action="delete">🗑 Excluir</button>'
      ].join(""));
    }).join("");
    bindModerationEvents(host);
  }

  /* ---------- Músicas publicadas no catálogo ---------- */
  function renderCatalog() {
    const host = document.getElementById("panel-catalog");
    if (!host) return;

    const baseSongs = Store.getBaseSongsWithState();
    const submissions = Store.getCatalogSubmissions();
    const removedCount = baseSongs.filter(function (s) { return s.removed; }).length;

    const intro = '<p class="hint" style="margin:0 0 10px">' +
      baseSongs.length + " música(s) base do site + " + submissions.length +
      " contribuição(ões) publicada(s)" +
      (removedCount ? " · " + removedCount + " base(s) excluída(s)" : "") +
      ". Todas podem ser excluídas do catálogo." +
      (removedCount ? ' <button class="btn btn-ghost btn-sm" data-restore-all style="margin-left:8px">↩ Restaurar excluídas</button>' : "") +
      "</p>";

    /* --- Músicas base --- */
    const baseHtml = baseSongs.map(function (song) {
      const links = song.removed
        ? '<span class="badge-status deleted">Excluída</span>' +
        '<button class="btn btn-ghost btn-sm" data-restore-base="' + UI.escapeHtml(song.id) + '">↩ Restaurar</button>'
        : '<a class="btn btn-ghost btn-sm" href="musica.html?id=' + encodeURIComponent(song.id) + '" target="_blank" rel="noopener">👁 Ver no site</a>' +
        '<button class="btn btn-danger btn-sm" data-remove-base="' + UI.escapeHtml(song.id) + '">🗑 Excluir do catálogo</button>';

      return [
        '<article class="mod-item' + (song.removed ? " is-removed" : "") + '" data-base-id="' + UI.escapeHtml(song.id) + '">',
        '  <div class="mod-head">',
        song.cover
          ? '<img src="' + UI.escapeHtml(song.cover) + '" alt="" />'
          : '<div style="width:64px;height:64px;border-radius:8px;background:linear-gradient(135deg,' +
          song.gradient[0] + "," + song.gradient[1] + ');display:grid;place-items:center;font-size:1.4rem;flex-shrink:0">♪</div>',
        '    <div class="mod-title">',
        "      <h4>" + UI.escapeHtml(song.title) + '</h4>',
        "      <p>" + UI.escapeHtml(song.artist) + " · " + UI.escapeHtml(getGenreName(song.genre)) +
        (song.year ? " · " + song.year : "") + "</p>",
        '      <p><span class="badge">Música base</span> ' +
        (song.removed && song.removedInfo
          ? 'excluída por ' + UI.escapeHtml(song.removedInfo.removedBy || "admin") + " " + UI.timeAgo(song.removedInfo.removedAt)
          : UI.formatNumber(song.views) + " reproduções") + "</p>",
        "    </div>",
        "  </div>",
        song.removed && song.removedInfo && song.removedInfo.reason
          ? '  <div class="mod-notes" style="border-color:var(--danger)"><strong>Motivo:</strong> ' + UI.escapeHtml(song.removedInfo.reason) + "</div>"
          : "",
        '  <div class="mod-actions">',
        '    <span class="spacer"></span>',
        links,
        "  </div>",
        "</article>"
      ].join("");
    }).join("");

    /* --- Contribuições publicadas --- */
    const subHtml = submissions.map(function (sub) {
      return moderationItem(sub, [
        '<a class="btn btn-ghost btn-sm" href="musica.html?id=' +
        encodeURIComponent(Store.slugify(sub.title + "-" + sub.artist)) + '" target="_blank" rel="noopener">👁 Ver no site</a>',
        '<button class="btn btn-ghost btn-sm" data-action="unpublish">↩ Tirar do ar</button>',
        '<button class="btn btn-danger btn-sm" data-action="takdown">🗑 Excluir do catálogo</button>'
      ].join(""));
    }).join("");

    const subTitle = submissions.length
      ? '<h3 class="mod-group-title">Contribuições publicadas <span class="badge">' + submissions.length + "</span></h3>" + subHtml
      : '<h3 class="mod-group-title">Contribuições publicadas <span class="badge">0</span></h3>' +
      '<p class="hint" style="margin:0 0 6px">Nenhuma contribuição publicada ainda. Aprove uma contribuição na aba "Pendentes".</p>';

    host.innerHTML = intro +
      '<h3 class="mod-group-title">Músicas base do site <span class="badge">' + baseSongs.length + "</span></h3>" +
      baseHtml + subTitle;

    bindModerationEvents(host);
    bindCatalogEvents(host);
  }

  function bindCatalogEvents(host) {
    host.querySelectorAll("[data-remove-base]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const songId = btn.getAttribute("data-remove-base");
        const song = Store.findSong(songId);
        const title = song ? song.title : songId;

        UI.openModal({
          title: "Excluir do catálogo",
          message: '"' + title + '" sairá do catálogo, da página da letra e de todas as playlists. Informe o motivo.',
          fields: [
            { name: "reason", label: "Motivo da exclusão", placeholder: "Ex.: solicitação judicial, conteúdo incorreto...", required: true }
          ],
          confirmText: "Excluir",
          danger: true,
          onConfirm: function (values) {
            const result = Store.removeBaseSong(songId, currentUser, values.reason);
            if (!result.ok) {
              UI.toast(result.error, "error");
              return;
            }
            refreshAll();
            UI.toast('"' + title + '" excluída do catálogo.', "info", 3000);
          }
        });
      });
    });

    host.querySelectorAll("[data-restore-base]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const songId = btn.getAttribute("data-restore-base");
        Store.restoreBaseSong(songId);
        refreshAll();
        UI.toast("Música restaurada no catálogo.", "success");
      });
    });

    const restoreAll = host.querySelector("[data-restore-all]");
    if (restoreAll) {
      restoreAll.addEventListener("click", function () {
        Store.getBaseSongsWithState().forEach(function (song) {
          if (song.removed) Store.restoreBaseSong(song.id);
        });
        refreshAll();
        UI.toast("Todas as músicas base foram restauradas.", "success");
      });
    }
  }

  function renderRejected() {
    const host = document.getElementById("panel-rejected");
    if (!host) return;
    const items = Store.getSubmissionsByStatus("rejected");

    if (!items.length) {
      host.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><h3>Nenhuma rejeição</h3><p>Contribuições rejeitadas ficam arquivadas aqui.</p></div>';
      return;
    }

    host.innerHTML = items.map(function (sub) {
      return moderationItem(sub, [
        '<button class="btn btn-success btn-sm" data-action="approve">✓ Publicar mesmo assim</button>',
        '<button class="btn btn-danger btn-sm" data-action="delete">🗑 Excluir</button>'
      ].join(""));
    }).join("");
    bindModerationEvents(host);
  }

  function renderUsers() {
    const host = document.getElementById("panel-users");
    if (!host) return;
    const users = Store.getUsers();

    const rows = users.map(function (user) {
      const submissions = Store.getSubmissions().filter(function (s) { return s.authorId === user.id; }).length;
      const self = user.id === currentUser.id;
      const roleAction = self
        ? '<span class="hint">você</span>'
        : (user.role === "admin"
          ? '<button class="btn btn-ghost btn-sm" data-user-action="demote" data-user-id="' + UI.escapeHtml(user.id) + '">Tornar usuário</button>'
          : '<button class="btn btn-ghost btn-sm" data-user-action="promote" data-user-id="' + UI.escapeHtml(user.id) + '">Tornar admin</button>');

      return [
        "<tr>",
        '  <td><div style="display:flex;align-items:center;gap:10px"><span class="avatar">' +
        UI.escapeHtml(UI.initials(user.name)) + "</span>" + UI.escapeHtml(user.name) + "</div></td>",
        "  <td>" + UI.escapeHtml(user.email) + "</td>",
        "  <td>" + (user.role === "admin" ? '<span class="badge">Admin</span>' : "Usuário") + "</td>",
        "  <td>" + submissions + "</td>",
        "  <td>" + UI.formatDate(user.createdAt) + "</td>",
        '  <td><div style="display:flex;gap:8px;justify-content:flex-end">' + roleAction +
        (self ? "" : ' <button class="btn btn-danger btn-sm" data-user-action="delete" data-user-id="' +
          UI.escapeHtml(user.id) + '">Excluir</button>') + "</div></td>",
        "</tr>"
      ].join("");
    }).join("");

    host.innerHTML = [
      '<div class="table-wrap">',
      '  <table class="data-table">',
      "    <thead><tr><th>Nome</th><th>E-mail</th><th>Função</th><th>Contribuições</th><th>Cadastro</th><th></th></tr></thead>",
      "    <tbody>" + rows + "</tbody>",
      "  </table>",
      "</div>"
    ].join("");

    host.querySelectorAll("[data-user-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const userId = btn.getAttribute("data-user-id");
        const action = btn.getAttribute("data-user-action");
        const target = Store.getUsers().find(function (u) { return u.id === userId; });
        if (!target) return;

        if (action === "delete") {
          UI.confirmDialog(
            'Excluir a conta de "' + target.name + '"? As contribuições permanecem no histórico.',
            function () {
              Store.removeUser(userId);
              refreshAll();
              UI.toast("Usuário excluído.", "info");
            },
            { title: "Excluir usuário", confirmText: "Excluir", danger: true }
          );
          return;
        }

        Store.updateRole(userId, action === "promote" ? "admin" : "user");
        refreshAll();
        UI.toast("Permissões atualizadas.", "success");
      });
    });
  }

  /* ---------- Abas ---------- */
  function bindTabs() {
    document.querySelectorAll(".admin-tabs .tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        activePanel = tab.getAttribute("data-panel");
        document.querySelectorAll(".admin-tabs .tab").forEach(function (t) {
          t.classList.toggle("active", t === tab);
        });
        ["pending", "published", "catalog", "rejected", "users"].forEach(function (name) {
          const panel = document.getElementById("panel-" + name);
          if (panel) panel.hidden = name !== activePanel;
        });
      });
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    const denied = document.getElementById("admin-denied");
    const panel = document.getElementById("admin-panel");
    currentUser = Store.getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
      if (denied) denied.hidden = false;
      if (panel) panel.hidden = true;
      return;
    }

    if (denied) denied.hidden = true;
    if (panel) panel.hidden = false;

    bindTabs();
    refreshAll();
  });
})();
