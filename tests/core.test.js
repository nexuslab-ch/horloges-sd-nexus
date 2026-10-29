// Vérifications des fonctions essentielles. Lancer : npm test  (ou : node --test tests/)
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../js/core.js");

const MIN = 60 * 1000;

function session(items, opts = {}) {
  return Object.assign({
    id: "s1", title: "Test", date: "2026-10-12", start: "08:30", autoAdvance: false, live: null,
    items: items.map((it, i) => Object.assign({ id: "i" + i, title: "Point " + i, detail: "", pause: false }, it))
  }, opts);
}
const at = (h, m, day = 12) => new Date(2026, 9, day, h, m, 0, 0).getTime();

test("parseHM accepte HH:MM et refuse les valeurs invalides", () => {
  assert.equal(C.parseHM("08:30"), 510);
  assert.equal(C.parseHM("13h30"), 810);
  assert.equal(C.parseHM("24:00"), null);
  assert.equal(C.parseHM(""), null);
});

test("horaire prévu : la SD du 12.10 va de 08:30 à 11:50", () => {
  const s = session([10, 40, 10, 30, 15, 10, 40, 25, 10, 10].map((d) => ({ duration: d })));
  const plan = C.plannedSchedule(s);
  assert.equal(C.fmtClock(plan[0].start), "08:30");
  assert.equal(C.fmtClock(plan[plan.length - 1].end), "11:50");
  assert.equal(C.totalMinutes(s), 200);
});

test("mode plan : avant, pendant et après la session", () => {
  const s = session([{ duration: 10 }, { duration: 20, pause: true }, { duration: 30 }]);
  assert.equal(C.computeView(s, at(8, 0)).status, "before");
  const v = C.computeView(s, at(8, 45));
  assert.equal(v.status, "running");
  assert.equal(v.current.id, "i1");
  assert.equal(v.current.pause, true);
  assert.equal(v.remainingMs, 15 * MIN);
  assert.equal(v.next.id, "i2");
  assert.equal(v.rows[0].state, "done");
  assert.equal(C.computeView(s, at(9, 31)).status, "finished");
});

test("chronomètre : la pause fige le temps restant, la reprise le décale", () => {
  const s = session([{ duration: 10 }, { duration: 10 }]);
  C.start(s, at(9, 0));
  C.pause(s, at(9, 4));
  let v = C.computeView(s, at(9, 20));
  assert.equal(v.status, "paused");
  assert.equal(v.remainingMs, 6 * MIN);
  C.resume(s, at(9, 20));
  v = C.computeView(s, at(9, 21));
  assert.equal(v.remainingMs, 5 * MIN);
  // les points à venir sont recalculés à partir du réel
  assert.equal(C.fmtClock(v.rows[1].start), "09:26");
});

test("dépassement : signalé quand un point dure plus que prévu", () => {
  const s = session([{ duration: 30 }, { duration: 10 }]);
  C.start(s, at(14, 0));
  const v = C.computeView(s, at(14, 42));
  assert.equal(v.overrunMs, 12 * MIN);
  assert.equal(v.progress, 1);
  // le point suivant glisse : il commencera maintenant
  assert.equal(C.fmtClock(v.rows[1].start), "14:42");
});

test("point suivant / précédent et fin de session", () => {
  const s = session([{ duration: 10 }, { duration: 10 }]);
  C.start(s, at(9, 0));
  C.next(s, at(9, 12));
  let v = C.computeView(s, at(9, 13));
  assert.equal(v.current.id, "i1");
  assert.equal(C.fmtClock(v.rows[0].end), "09:12");
  C.previous(s, at(9, 14));
  assert.equal(C.computeView(s, at(9, 14)).current.id, "i0");
  C.next(s, at(9, 15));
  C.next(s, at(9, 20));
  v = C.computeView(s, at(9, 21));
  assert.equal(v.status, "finished");
});

test("avance automatique : enchaîne les points à l'heure exacte", () => {
  const s = session([{ duration: 10 }, { duration: 5 }, { duration: 5 }], { autoAdvance: true });
  C.start(s, at(9, 0));
  assert.equal(C.autoAdvance(s, at(9, 12)), true);
  const v = C.computeView(s, at(9, 12));
  assert.equal(v.current.id, "i1");
  assert.equal(v.remainingMs, 3 * MIN);
  C.autoAdvance(s, at(9, 30));
  assert.equal(C.computeView(s, at(9, 30)).status, "finished");
});

test("modification en direct : ajout, réordonnancement et suppression du point en cours", () => {
  const s = session([{ duration: 10 }, { duration: 10 }, { duration: 10 }]);
  C.start(s, at(9, 0));
  C.next(s, at(9, 10)); // en cours : i1
  s.items.push({ id: "new", title: "Invités", duration: 5, pause: false });
  let v = C.computeView(s, at(9, 12));
  assert.equal(v.rows[3].id, "new");
  assert.equal(C.fmtClock(v.rows[3].start), "09:30");
  // suppression du point en cours : on bascule sur le point à la même position
  s.items.splice(1, 1);
  C.normalize(s);
  v = C.computeView(s, at(9, 12));
  assert.equal(v.current.id, "i2");
});

test("changement d'heure : les durées restent des durées réelles", () => {
  // Nuit du 25.10.2026 (passage à l'heure d'hiver en Europe)
  const s = session([{ duration: 60 }, { duration: 60 }], { date: "2026-10-25", start: "01:30" });
  const plan = C.plannedSchedule(s);
  assert.equal(plan[1].end - plan[0].start, 120 * MIN);
});

test("formatage", () => {
  assert.equal(C.fmtTimer(754000), "12:34");
  assert.equal(C.fmtTimer(3900000), "1:05:00");
  assert.equal(C.fmtMinutes(95), "1 h 35");
});
