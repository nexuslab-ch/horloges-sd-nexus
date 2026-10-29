/* Horloges SD · page de préparation */
(function () {
  "use strict";
  var C = window.SDCore, S = window.SDStore;
  var $ = function (id) { return document.getElementById(id); };
  var data = S.read();
  var saveTimer = null;

  function session() {
    var s = data.sessions.find(function (x) { return x.id === data.activeId; });
    if (!s) { s = data.sessions[0] || null; data.activeId = s ? s.id : null; }
    return s;
  }

  // ---------- Enregistrement ----------
  function saveNow() {
    var s = session();
    if (s) C.normalize(s);
    var ok = S.write(data);
    var t = new Date();
    $("saved").textContent = ok
      ? "Enregistré à " + String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0")
      : "Impossible d'enregistrer (stockage du navigateur bloqué)";
  }
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }

  // ---------- Liste des sessions ----------
  function renderSessions() {
    var ul = $("sessionList");
    ul.innerHTML = "";
    data.sessions.forEach(function (s) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.id = s.id;
      if (s.id === data.activeId) b.setAttribute("aria-current", "true");
      var t = document.createElement("span"); t.className = "s-title"; t.textContent = s.title || "Sans titre";
      var m = document.createElement("span"); m.className = "s-meta";
      var dd = s.date ? s.date.split("-").reverse().join(".") : "date ?";
      m.textContent = dd + " · " + (s.start || "--:--") + (s.live && s.live.finishedAt == null ? " · en cours" : "");
      b.append(t, m);
      li.appendChild(b);
      ul.appendChild(li);
    });
  }
  $("sessionList").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-id]");
    if (!b) return;
    data.activeId = b.dataset.id;
    saveNow();
    renderAll();
  });

  // ---------- Formulaire ----------
  function renderForm() {
    var s = session();
    $("fTitle").value = s.title || "";
    $("fDate").value = s.date || "";
    $("fStart").value = s.start || "";
    $("fTheme").value = s.theme === "sombre" ? "sombre" : "nexus";
    $("fNotes").value = s.notes || "";
    $("fAuto").checked = !!s.autoAdvance;
    applyTheme();
  }
  function applyTheme() {
    var s = session();
    var th = s && s.theme === "sombre" ? "sombre" : "nexus";
    document.documentElement.setAttribute("data-theme", th);
    $("themeBtn").textContent = "Thème : " + (th === "sombre" ? "Sombre" : "Nexus");
  }
  function bindField(id, key, after) {
    $(id).addEventListener("input", function () {
      var s = session();
      s[key] = this.type === "checkbox" ? this.checked : this.value;
      if (after) after();
      save();
      updateLive();
      renderSessions();
    });
  }
  bindField("fTitle", "title");
  bindField("fDate", "date");
  bindField("fStart", "start");
  bindField("fTheme", "theme", applyTheme);
  bindField("fNotes", "notes");
  bindField("fAuto", "autoAdvance");
  $("fAuto").addEventListener("change", function () { session().autoAdvance = this.checked; save(); });

  $("themeBtn").addEventListener("click", function () {
    var s = session();
    s.theme = s.theme === "sombre" ? "nexus" : "sombre";
    $("fTheme").value = s.theme;
    applyTheme();
    saveNow();
  });

  // ---------- Ordre du jour ----------
  function iconBtn(label, text, action, id, extra) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-ghost btn-icon" + (extra ? " " + extra : "");
    b.setAttribute("aria-label", label);
    b.title = label;
    b.textContent = text;
    b.dataset.action = action;
    b.dataset.id = id;
    return b;
  }

  function renderRows() {
    var s = session();
    var tb = $("rows");
    tb.innerHTML = "";
    s.items.forEach(function (it, i) {
      var tr = document.createElement("tr");
      tr.className = "row" + (it.pause ? " is-pause" : "");
      tr.dataset.id = it.id;

      var tdO = document.createElement("td");
      var ord = document.createElement("div"); ord.className = "order";
      var up = iconBtn("Monter « " + (it.title || "point") + " »", "↑", "up", it.id);
      var down = iconBtn("Descendre « " + (it.title || "point") + " »", "↓", "down", it.id);
      up.disabled = i === 0;
      down.disabled = i === s.items.length - 1;
      ord.append(up, down);
      tdO.appendChild(ord);

      var tdT = document.createElement("td");
      var time = document.createElement("div"); time.className = "time"; time.dataset.time = it.id;
      tdT.appendChild(time);

      var tdP = document.createElement("td");
      var cell = document.createElement("div"); cell.className = "cell-point";
      var title = document.createElement("input");
      title.type = "text"; title.value = it.title || ""; title.placeholder = "Titre du point (à compléter)";
      title.dataset.field = "title"; title.dataset.id = it.id;
      title.setAttribute("aria-label", "Titre du point " + (i + 1));
      var detail = document.createElement("input");
      detail.type = "text"; detail.value = it.detail || ""; detail.placeholder = "Détail (facultatif)";
      detail.className = "detail"; detail.dataset.field = "detail"; detail.dataset.id = it.id;
      detail.setAttribute("aria-label", "Détail du point " + (i + 1));
      cell.append(title, detail);
      tdP.appendChild(cell);

      var tdD = document.createElement("td");
      var dur = document.createElement("input");
      dur.type = "number"; dur.min = "0"; dur.step = "1"; dur.inputMode = "numeric";
      dur.value = it.duration; dur.dataset.field = "duration"; dur.dataset.id = it.id;
      dur.setAttribute("aria-label", "Durée en minutes du point " + (i + 1));
      tdD.appendChild(dur);

      var tdPa = document.createElement("td");
      var pb = document.createElement("div"); pb.className = "pause-box";
      var pc = document.createElement("input");
      pc.type = "checkbox"; pc.checked = !!it.pause; pc.dataset.field = "pause"; pc.dataset.id = it.id;
      pc.setAttribute("aria-label", "Ce point est une pause");
      pb.appendChild(pc);
      tdPa.appendChild(pb);

      var tdA = document.createElement("td");
      var acts = document.createElement("div"); acts.className = "acts";
      acts.append(
        iconBtn("Démarrer / reprendre à ce point", "▶", "here", it.id),
        iconBtn("Supprimer ce point", "✕", "del", it.id, "btn-danger")
      );
      tdA.appendChild(acts);

      tr.append(tdO, tdT, tdP, tdD, tdPa, tdA);
      tb.appendChild(tr);
    });
    updateLive();
  }

  $("rows").addEventListener("input", function (e) {
    var el = e.target;
    if (!el.dataset.field) return;
    var s = session();
    var it = s.items.find(function (x) { return x.id === el.dataset.id; });
    if (!it) return;
    if (el.dataset.field === "pause") {
      it.pause = el.checked;
      el.closest("tr").classList.toggle("is-pause", it.pause);
    } else if (el.dataset.field === "duration") {
      var n = Number(el.value);
      it.duration = Number.isFinite(n) && n >= 0 ? n : 0;
    } else {
      it[el.dataset.field] = el.value;
    }
    save();
    updateLive();
  });

  $("rows").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-action]");
    if (!b) return;
    var s = session();
    var i = s.items.findIndex(function (x) { return x.id === b.dataset.id; });
    if (i === -1) return;
    var now = Date.now();
    var a = b.dataset.action;
    if (a === "up" && i > 0) { var t = s.items[i - 1]; s.items[i - 1] = s.items[i]; s.items[i] = t; }
    else if (a === "down" && i < s.items.length - 1) { var t2 = s.items[i + 1]; s.items[i + 1] = s.items[i]; s.items[i] = t2; }
    else if (a === "del") { s.items.splice(i, 1); }
    else if (a === "here") {
      if (!s.live || s.live.finishedAt != null) C.start(s, now, i);
      else C.goTo(s, i, now);
    }
    C.normalize(s);
    saveNow();
    renderRows();
    var focusBtn = document.querySelector('button[data-action="' + a + '"][data-id="' + b.dataset.id + '"]');
    if (focusBtn && !focusBtn.disabled) focusBtn.focus();
  });

  $("addItem").addEventListener("click", function () {
    var s = session();
    var it = S.item("", 10);
    s.items.push(it);
    saveNow();
    renderRows();
    var inp = document.querySelector('input[data-field="title"][data-id="' + it.id + '"]');
    if (inp) inp.focus();
  });

  // ---------- Chronomètre ----------
  function live(fn) {
    var s = session();
    fn(s, Date.now());
    C.normalize(s);
    saveNow();
    updateLive();
    renderSessions();
  }
  $("startBtn").addEventListener("click", function () { live(function (s, now) { C.start(s, now, 0); }); });
  $("pauseBtn").addEventListener("click", function () {
    live(function (s, now) { if (s.live && s.live.pausedAt != null) C.resume(s, now); else C.pause(s, now); });
  });
  $("nextBtn").addEventListener("click", function () { live(function (s, now) { C.next(s, now); }); });
  $("prevBtn").addEventListener("click", function () { live(function (s, now) { C.previous(s, now); }); });
  $("resetBtn").addEventListener("click", function () {
    if (window.confirm("Réinitialiser le chronomètre ? L'affichage repassera sur l'horaire prévu.")) live(function (s) { C.reset(s); });
  });

  function updateLive() {
    var s = session();
    if (!s) return;
    var now = Date.now();
    if (C.autoAdvance(s, now)) saveNow();
    var view = C.computeView(s, now);

    view.rows.forEach(function (r) {
      var el = document.querySelector('[data-time="' + r.id + '"]');
      if (!el) return;
      el.textContent = C.fmtClock(r.start) + " – " + C.fmtClock(r.end);
      el.classList.toggle("over", r.overrunMs > 0);
      var tr = el.closest("tr");
      tr.classList.toggle("current", r.state === "current");
      tr.classList.toggle("done", r.state === "done");
    });
    if (!view.rows.length) {
      document.querySelectorAll("[data-time]").forEach(function (el) { el.textContent = "--:--"; });
    }

    var tm = C.totalMinutes(s);
    $("total").textContent = s.items.length + " points · " + C.fmtMinutes(tm) +
      (view.startsAt != null ? " · " + C.fmtClock(view.startsAt) + " → " + C.fmtClock(view.endsAt) : "");

    var st = $("liveStatus");
    st.textContent = "";
    var running = view.mode === "live" && (view.status === "running" || view.status === "paused");
    if (view.status === "empty") st.textContent = "Ajoutez des points, une date et une heure de début.";
    else if (view.mode === "plan") {
      st.append("Non démarré : l'affichage suit l'horaire prévu");
      if (view.current) { st.append(" (actuellement : "); var b0 = document.createElement("b"); b0.textContent = view.current.title || "point à compléter"; st.append(b0, ")"); }
      st.append(".");
    } else if (view.status === "finished") st.textContent = "Session terminée à " + C.fmtClock(view.endsAt) + ".";
    else {
      var b = document.createElement("b");
      b.textContent = view.current.title || "point à compléter";
      st.append(view.status === "paused" ? "En pause sur " : "En cours : ", b, " · ");
      if (view.overrunMs > 0) {
        var o = document.createElement("span"); o.className = "over";
        o.textContent = "+" + C.fmtTimer(view.overrunMs) + " de dépassement";
        st.appendChild(o);
      } else st.append("reste " + C.fmtTimer(view.remainingMs));
      st.append(" · fin prévue " + C.fmtClock(view.endsAt));
    }

    $("startBtn").textContent = view.mode === "live" ? "↺ Redémarrer au début" : "▶ Démarrer";
    $("startBtn").disabled = !s.items.length;
    $("pauseBtn").disabled = !running;
    $("pauseBtn").textContent = view.status === "paused" ? "▶ Reprendre" : "⏸ Pause";
    $("nextBtn").disabled = !running;
    $("prevBtn").disabled = !(view.mode === "live" && (view.currentIndex > 0 || view.status === "finished"));
    $("resetBtn").disabled = view.mode !== "live";
  }

  // ---------- Sessions : créer, dupliquer, supprimer, sauvegarder ----------
  $("newSession").addEventListener("click", function () {
    var s = S.blankSession();
    data.sessions.unshift(s);
    data.activeId = s.id;
    saveNow();
    renderAll();
    $("fTitle").focus();
    $("fTitle").select();
  });
  $("dupSession").addEventListener("click", function () {
    var src = session();
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = S.uid();
    copy.title = (src.title || "Session") + " (copie)";
    copy.live = null;
    copy.items.forEach(function (it) { it.id = S.uid(); });
    data.sessions.unshift(copy);
    data.activeId = copy.id;
    saveNow();
    renderAll();
  });
  $("delSession").addEventListener("click", function () {
    var s = session();
    if (!window.confirm("Supprimer « " + (s.title || "cette session") + " » ?")) return;
    data.sessions = data.sessions.filter(function (x) { return x.id !== s.id; });
    if (!data.sessions.length) data.sessions.push(S.blankSession());
    data.activeId = data.sessions[0].id;
    saveNow();
    renderAll();
  });
  $("restoreBtn").addEventListener("click", function () {
    var ex = S.examples();
    data.sessions = ex.concat(data.sessions);
    data.activeId = ex[0].id;
    saveNow();
    renderAll();
  });
  $("exportBtn").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "horloges-sd-sauvegarde.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });
  $("importFile").addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var imported = JSON.parse(r.result);
        var list = Array.isArray(imported.sessions) ? imported.sessions : Array.isArray(imported) ? imported : [imported];
        list.forEach(function (s) {
          if (!s || !Array.isArray(s.items)) return;
          s.id = S.uid();
          s.items.forEach(function (it) { it.id = it.id || S.uid(); });
          data.sessions.unshift(s);
          data.activeId = s.id;
        });
        saveNow();
        renderAll();
        $("saved").textContent = list.length + " session(s) importée(s)";
      } catch (e) {
        $("saved").textContent = "Fichier invalide : choisissez un export JSON d'Horloges SD.";
      }
    };
    r.readAsText(f);
    this.value = "";
  });

  // ---------- Affichage de salle ----------
  $("openRoom").addEventListener("click", function () {
    saveNow();
    window.open("salle.html?id=" + encodeURIComponent(data.activeId), "horloges-sd-salle");
  });

  // Changements faits depuis l'affichage de salle (raccourcis clavier)
  window.addEventListener("storage", function (e) {
    if (e.key !== S.KEY) return;
    var before = JSON.stringify(session() && session().items.map(function (i) { return i.id; }));
    data = S.read();
    renderSessions();
    var after = JSON.stringify(session() && session().items.map(function (i) { return i.id; }));
    if (before !== after) renderAll(); else updateLive();
  });

  function renderAll() {
    renderSessions();
    renderForm();
    renderRows();
  }

  renderAll();
  saveNow();
  setInterval(updateLive, 1000);
})();
