/* Horloges SD · affichage de salle */
(function () {
  "use strict";
  var C = window.SDCore, S = window.SDStore;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var data = S.read();
  var lastAgendaKey = "";

  function session() {
    var id = params.get("id") || data.activeId;
    return data.sessions.find(function (s) { return s.id === id; }) || data.sessions[0] || null;
  }

  function setText(el, value) { if (el.textContent !== value) el.textContent = value; }

  function longDate(ts) {
    var d = new Date(ts);
    var wd = d.toLocaleDateString("fr-CH", { weekday: "long" });
    var rest = d.toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });
    return wd.charAt(0).toUpperCase() + wd.slice(1) + " " + rest;
  }

  function sameDay(a, b) {
    var x = new Date(a), y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  }

  function renderAgenda(view) {
    var key = JSON.stringify(view.rows.map(function (r) {
      return [r.id, r.title, r.detail, r.pause, r.state, C.fmtClock(r.start), C.fmtClock(r.end), r.overrunMs > 0];
    }));
    if (key === lastAgendaKey) return;
    lastAgendaKey = key;
    var ol = $("agenda");
    ol.innerHTML = "";
    if (!view.rows.length) {
      var li0 = document.createElement("li");
      li0.className = "empty";
      li0.textContent = "Aucun point dans l'ordre du jour.";
      ol.appendChild(li0);
      return;
    }
    view.rows.forEach(function (r) {
      var li = document.createElement("li");
      li.className = [r.state, r.pause ? "pause" : "", r.overrunMs > 0 ? "over" : ""].join(" ").trim();
      if (r.state === "current") li.setAttribute("aria-current", "step");
      var time = document.createElement("time");
      time.textContent = C.fmtClock(r.start) + "–" + C.fmtClock(r.end);
      var box = document.createElement("div");
      var t = document.createElement("span");
      t.className = "t";
      t.textContent = r.pause ? "Pause ☕" : (r.title || "Point à compléter");
      box.appendChild(t);
      if (r.detail) {
        var d = document.createElement("span");
        d.className = "d";
        d.textContent = r.detail;
        box.appendChild(d);
      }
      li.append(time, box);
      ol.appendChild(li);
    });
    var curLi = ol.querySelector("li.current");
    if (curLi) curLi.scrollIntoView({ block: "nearest" });
  }

  function render() {
    var now = Date.now();
    var s = session();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var d = new Date(now);
    $("clock").innerHTML = pad(d.getHours()) + ":" + pad(d.getMinutes()) + '<span class="sec">' + pad(d.getSeconds()) + "</span>";

    if (!s) {
      setText($("nowTitle"), "Aucune session");
      return;
    }

    document.documentElement.setAttribute("data-theme", s.theme === "sombre" ? "sombre" : "nexus");
    setText($("sessionTitle"), s.title || "Session de dialogue");
    document.title = (s.title || "Session") + " · Horloges SD";

    if (C.autoAdvance(s, now)) S.write(data);
    var view = C.computeView(s, now);

    setText($("date"), view.startsAt != null
      ? longDate(view.startsAt) + " · " + C.fmtClock(view.startsAt) + " – " + C.fmtClock(view.endsAt)
      : "Date ou heure de début à compléter");

    var box = $("now");
    var cur = view.current;
    box.classList.toggle("is-pause", !!(cur && cur.pause));
    box.classList.toggle("is-paused", view.status === "paused");
    box.classList.toggle("is-over", view.overrunMs > 0);

    var label = "", title = "", detail = "", range = "", left = "", pct = 0;

    if (view.status === "empty") {
      label = "À préparer";
      title = "Ajoutez des points à l'ordre du jour";
    } else if (view.status === "before") {
      label = "Bientôt";
      var startsToday = sameDay(view.startsAt, now);
      title = startsToday
        ? "La SD commence à " + C.fmtClock(view.startsAt)
        : "La SD commence le " + new Date(view.startsAt).toLocaleDateString("fr-CH", { weekday: "long", day: "2-digit", month: "2-digit" }) + " à " + C.fmtClock(view.startsAt);
      detail = view.next ? "On démarre par : " + (view.next.title || "premier point") : "";
      range = "";
      left = startsToday ? "Dans " + C.fmtTimer(view.startsAt - now) : "";
    } else if (view.status === "finished") {
      label = "Terminé";
      title = "Fin de la SD, merci à tous";
    } else if (cur) {
      label = view.overrunMs > 0 ? "Dépassement" : view.status === "paused" ? "Chronomètre en pause" : cur.pause ? "Pause" : "En cours";
      title = cur.pause ? "Pause ☕" : (cur.title || "Point à compléter");
      detail = cur.detail || "";
      range = C.fmtClock(cur.start) + " – " + C.fmtClock(cur.start + C.durationMs(cur)) + " prévu";
      left = view.overrunMs > 0 ? "+" + C.fmtTimer(view.overrunMs) + " de dépassement" : "Reste " + C.fmtTimer(view.remainingMs);
      pct = Math.max(0, Math.min(1, view.progress)) * 100;
    } else {
      label = "Entre deux points";
      title = view.next ? view.next.title : "—";
    }

    setText($("nowLabel"), label);
    setText($("nowTitle"), title);
    setText($("nowDetail"), detail);
    setText($("nowRange"), range);
    setText($("nowLeft"), left);
    $("bar").style.width = pct + "%";
    $("barWrap").setAttribute("aria-valuenow", String(Math.round(pct)));

    var nx = (view.status === "running" || view.status === "paused") ? view.next : null;
    var nextEl = $("next");
    var nextText = nx ? "Ensuite à " + C.fmtClock(nx.start) + " : " + (nx.pause ? "Pause" : (nx.title || "point à compléter")) : "";
    if (nextEl.dataset.v !== nextText) {
      nextEl.dataset.v = nextText;
      nextEl.textContent = "";
      if (nx) {
        nextEl.append("Ensuite à " + C.fmtClock(nx.start) + " : ");
        var b = document.createElement("b");
        b.textContent = nx.pause ? "Pause" : (nx.title || "point à compléter");
        nextEl.appendChild(b);
      }
    }

    renderAgenda(view);
  }

  // Synchronisation avec la page de préparation (autre onglet ou fenêtre)
  window.addEventListener("storage", function (e) {
    if (e.key === S.KEY) { data = S.read(); lastAgendaKey = ""; render(); }
  });
  // Relecture de secours (certains navigateurs n'envoient pas l'événement en file://)
  setInterval(function () { data = S.read(); }, 2000);

  // Raccourcis clavier du facilitateur
  function act(fn) {
    var s = session();
    if (!s) return;
    fn(s, Date.now());
    C.normalize(s);
    S.write(data);
    lastAgendaKey = "";
    render();
  }
  document.addEventListener("keydown", function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === "f" || e.key === "F") { toggleFullscreen(); }
    else if (e.key === "ArrowRight") { act(function (s, now) { if (!s.live) C.start(s, now, 0); else C.next(s, now); }); }
    else if (e.key === "ArrowLeft") { act(function (s, now) { C.previous(s, now); }); }
    else if (e.key === " ") {
      e.preventDefault();
      act(function (s, now) {
        if (!s.live) C.start(s, now, 0);
        else if (s.live.pausedAt != null) C.resume(s, now);
        else C.pause(s, now);
      });
    }
  });

  // Plein écran
  function toggleFullscreen() {
    var p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    if (p && p.catch) p.catch(function () { $("fs").textContent = "Plein écran indisponible"; });
  }
  $("fs").addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", function () {
    $("fs").textContent = document.fullscreenElement ? "Quitter le plein écran" : "Plein écran";
  });

  // Empêcher la mise en veille (API Wake Lock) avec message de repli
  var wakeEl = $("wake");
  var lock = null;
  function wakeStatus(ok, msg) { wakeEl.className = "wake " + (ok ? "ok" : "warn"); wakeEl.textContent = msg; }
  async function keepAwake() {
    if (!("wakeLock" in navigator)) {
      wakeStatus(false, "Veille non bloquée par ce navigateur : désactivez la mise en veille dans les réglages de l'ordinateur.");
      return;
    }
    if (document.visibilityState !== "visible") return;
    try {
      lock = await navigator.wakeLock.request("screen");
      wakeStatus(true, "Écran maintenu allumé");
      lock.addEventListener("release", function () {
        if (document.visibilityState === "visible") wakeStatus(false, "Veille réactivée : cliquez sur la page pour la bloquer à nouveau.");
      });
    } catch (err) {
      wakeStatus(false, "Veille non bloquée : cliquez une fois sur la page, ou désactivez la mise en veille dans les réglages.");
    }
  }
  keepAwake();
  document.addEventListener("visibilitychange", keepAwake);
  document.addEventListener("click", function () { if (!lock || lock.released) keepAwake(); });

  render();
  setInterval(render, 500);
})();
