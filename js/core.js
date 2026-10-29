/*
 * Horloges SD · logique métier (aucune dépendance au DOM).
 * Chargé dans le navigateur (window.SDCore) et dans Node pour les tests.
 *
 * Deux modes :
 *  - « plan »  : le chronomètre n'est pas démarré. L'affichage suit l'horaire
 *                prévu (date + heure de début + durées).
 *  - « live »  : le facilitateur a démarré. Chaque point démarre quand on passe
 *                au suivant (ou automatiquement si l'avance auto est activée).
 *                Les horaires à venir sont recalculés à partir du réel.
 *
 * Tous les temps sont des timestamps en millisecondes. Les durées des points
 * sont en minutes. Les changements d'heure (été / hiver) sont gérés car l'heure
 * de début est construite en heure locale (new Date(a, m, j, h, min)) puis on
 * additionne des durées réelles en millisecondes.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SDCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MIN = 60 * 1000;

  function parseHM(value) {
    var m = /^(\d{1,2})[:h](\d{2})$/.exec(String(value == null ? "" : value).trim());
    if (!m) return null;
    var h = Number(m[1]), mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }

  function plannedStart(session) {
    if (!session || !session.date) return null;
    var parts = String(session.date).split("-").map(Number);
    var hm = parseHM(session.start);
    if (parts.length !== 3 || parts.some(isNaN) || hm == null) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], Math.floor(hm / 60), hm % 60, 0, 0).getTime();
  }

  function durationMs(item) {
    var n = Number(item && item.duration);
    return Number.isFinite(n) && n > 0 ? Math.round(n * MIN) : 0;
  }

  /** Horaire prévu : début / fin de chaque point à partir de l'heure de début. */
  function plannedSchedule(session) {
    var t = plannedStart(session);
    var items = (session && session.items) || [];
    if (t == null) return items.map(function (it) { return { id: it.id, start: null, end: null }; });
    return items.map(function (it) {
      var s = t;
      t += durationMs(it);
      return { id: it.id, start: s, end: t };
    });
  }

  /** Index du point en cours en mode live, robuste aux suppressions / déplacements. */
  function currentIndex(session) {
    var items = session.items || [];
    var live = session.live;
    if (!live || !items.length) return -1;
    var idx = items.findIndex(function (it) { return it.id === live.currentId; });
    if (idx === -1) {
      var hint = Number(live.indexHint) || 0;
      idx = Math.max(0, Math.min(items.length - 1, hint));
    }
    return idx;
  }

  /** Recale currentId si le point en cours a été supprimé. Retourne la session (mutée). */
  function normalize(session) {
    if (!session.live || session.live.finishedAt != null) return session;
    var items = session.items || [];
    if (!items.length) { session.live = null; return session; }
    var idx = currentIndex(session);
    session.live.currentId = items[idx].id;
    session.live.indexHint = idx;
    return session;
  }

  function logFor(live, id) {
    if (!live || !live.log) return null;
    for (var i = live.log.length - 1; i >= 0; i--) if (live.log[i].id === id) return live.log[i];
    return null;
  }

  /**
   * Calcule tout ce que l'affichage doit montrer à l'instant `now`.
   */
  function computeView(session, now) {
    var items = (session && session.items) || [];
    var start = plannedStart(session);
    var plan = plannedSchedule(session);
    var base = { mode: "plan", status: "empty", rows: [], current: null, next: null, currentIndex: -1,
      remainingMs: 0, elapsedMs: 0, progress: 0, overrunMs: 0, startsAt: start, endsAt: null };

    if (!items.length || start == null) return base;

    var live = session.live;

    // ---------- Mode « plan » : on suit l'horaire prévu ----------
    if (!live) {
      var rows = items.map(function (it, i) {
        var p = plan[i];
        var state = now >= p.end ? "done" : now >= p.start ? "current" : "upcoming";
        return Object.assign({}, it, { start: p.start, end: p.end, state: state, overrunMs: 0 });
      });
      var endsAt = plan[plan.length - 1].end;
      var ci = rows.findIndex(function (r) { return r.state === "current"; });
      var status = now < start ? "before" : now >= endsAt ? "finished" : "running";
      var view = Object.assign(base, { mode: "plan", status: status, rows: rows, endsAt: endsAt, currentIndex: ci });
      if (ci !== -1) {
        var c = rows[ci];
        var d = c.end - c.start;
        view.current = c;
        view.elapsedMs = now - c.start;
        view.remainingMs = c.end - now;
        view.progress = d > 0 ? view.elapsedMs / d : 1;
        view.next = rows[ci + 1] || null;
      } else if (status === "before") {
        view.next = rows[0];
      }
      return view;
    }

    // ---------- Mode « live » ----------
    if (live.finishedAt != null) {
      var doneRows = items.map(function (it, i) {
        var l = logFor(live, it.id);
        return Object.assign({}, it, { start: l ? l.start : plan[i].start, end: l ? l.end : plan[i].end, state: "done", overrunMs: 0 });
      });
      return Object.assign(base, { mode: "live", status: "finished", rows: doneRows, endsAt: live.finishedAt });
    }

    var idx = currentIndex(session);
    var cur = items[idx];
    var d2 = durationMs(cur);
    var paused = live.pausedAt != null;
    var ref = paused ? live.pausedAt : now;
    var elapsed = Math.max(0, ref - live.itemStartedAt);
    var remaining = d2 - elapsed;
    var overrun = remaining < 0 ? -remaining : 0;
    var curEnd = now + Math.max(remaining, 0);

    var t = curEnd;
    var liveRows = items.map(function (it, i) {
      if (i < idx) {
        var l2 = logFor(live, it.id);
        return Object.assign({}, it, { start: l2 ? l2.start : plan[i].start, end: l2 ? l2.end : plan[i].end, state: "done", overrunMs: 0 });
      }
      if (i === idx) {
        return Object.assign({}, it, { start: live.itemStartedAt, end: curEnd, state: "current", overrunMs: overrun });
      }
      var s = t;
      t += durationMs(it);
      return Object.assign({}, it, { start: s, end: t, state: "upcoming", overrunMs: 0 });
    });

    return Object.assign(base, {
      mode: "live",
      status: paused ? "paused" : "running",
      rows: liveRows,
      currentIndex: idx,
      current: liveRows[idx],
      next: liveRows[idx + 1] || null,
      elapsedMs: elapsed,
      remainingMs: remaining,
      overrunMs: overrun,
      progress: d2 > 0 ? Math.min(elapsed / d2, 1) : 1,
      endsAt: liveRows[liveRows.length - 1].end
    });
  }

  // ---------- Actions du facilitateur (modifient session.live) ----------

  function start(session, now, atIndex) {
    var items = session.items || [];
    if (!items.length) return session;
    var i = Math.max(0, Math.min(items.length - 1, atIndex || 0));
    session.live = { startedAt: now, currentId: items[i].id, indexHint: i, itemStartedAt: now, pausedAt: null, log: [], finishedAt: null };
    return session;
  }

  function pause(session, now) {
    if (session.live && session.live.finishedAt == null && session.live.pausedAt == null) session.live.pausedAt = now;
    return session;
  }

  function resume(session, now) {
    var live = session.live;
    if (live && live.pausedAt != null) {
      live.itemStartedAt += now - live.pausedAt;
      live.pausedAt = null;
    }
    return session;
  }

  function closeCurrent(session, now) {
    var live = session.live;
    var idx = currentIndex(session);
    var end = live.pausedAt != null ? live.pausedAt : now;
    live.log = (live.log || []).filter(function (l) { return l.id !== live.currentId; });
    live.log.push({ id: session.items[idx].id, start: live.itemStartedAt, end: end });
    live.pausedAt = null;
    return idx;
  }

  function goTo(session, index, now) {
    var live = session.live;
    var items = session.items || [];
    if (!live || live.finishedAt != null) return session;
    closeCurrent(session, now);
    if (index >= items.length) { live.finishedAt = now; return session; }
    var i = Math.max(0, index);
    live.currentId = items[i].id;
    live.indexHint = i;
    live.itemStartedAt = now;
    return session;
  }

  function next(session, now) {
    if (!session.live) return session;
    return goTo(session, currentIndex(session) + 1, now);
  }

  function previous(session, now) {
    var live = session.live;
    if (!live) return session;
    var items = session.items || [];
    var idx = live.finishedAt != null ? items.length : currentIndex(session);
    if (idx <= 0) return session;
    var prev = items[idx - 1];
    var l = logFor(live, prev.id);
    live.log = (live.log || []).filter(function (x) { return x.id !== prev.id; });
    live.finishedAt = null;
    live.pausedAt = null;
    live.currentId = prev.id;
    live.indexHint = idx - 1;
    live.itemStartedAt = l ? l.start : now;
    return session;
  }

  function reset(session) {
    session.live = null;
    return session;
  }

  /** Avance automatique : passe au point suivant à l'heure exacte où le précédent se termine. */
  function autoAdvance(session, now) {
    var live = session.live;
    if (!session.autoAdvance || !live || live.finishedAt != null || live.pausedAt != null) return false;
    var items = session.items || [];
    var changed = false;
    var guard = 0;
    while (guard++ < 500) {
      var idx = currentIndex(session);
      var endAt = live.itemStartedAt + durationMs(items[idx]);
      if (now < endAt) break;
      live.log = (live.log || []).filter(function (l) { return l.id !== items[idx].id; });
      live.log.push({ id: items[idx].id, start: live.itemStartedAt, end: endAt });
      changed = true;
      if (idx + 1 >= items.length) { live.finishedAt = endAt; break; }
      live.currentId = items[idx + 1].id;
      live.indexHint = idx + 1;
      live.itemStartedAt = endAt;
    }
    return changed;
  }

  // ---------- Formatage ----------

  function pad(n) { return String(n).padStart(2, "0"); }

  function fmtClock(ts) {
    if (ts == null) return "--:--";
    var d = new Date(ts);
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  /** 754000 → "12:34" ; 3 900 000 → "1:05:00" */
  function fmtTimer(ms) {
    var s = Math.max(0, Math.floor(Math.abs(ms) / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h ? h + ":" + pad(m) + ":" + pad(sec) : pad(m) + ":" + pad(sec);
  }

  function fmtMinutes(min) {
    var n = Math.round(Number(min) || 0);
    if (n < 60) return n + " min";
    return Math.floor(n / 60) + " h" + (n % 60 ? " " + pad(n % 60) : "");
  }

  function totalMinutes(session) {
    return (session.items || []).reduce(function (a, it) { return a + (Number(it.duration) > 0 ? Number(it.duration) : 0); }, 0);
  }

  return {
    MIN: MIN, parseHM: parseHM, plannedStart: plannedStart, durationMs: durationMs,
    plannedSchedule: plannedSchedule, computeView: computeView, currentIndex: currentIndex,
    normalize: normalize, start: start, pause: pause, resume: resume, next: next,
    previous: previous, goTo: goTo, reset: reset, autoAdvance: autoAdvance,
    fmtClock: fmtClock, fmtTimer: fmtTimer, fmtMinutes: fmtMinutes, totalMinutes: totalMinutes
  };
});
