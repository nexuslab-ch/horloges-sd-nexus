/*
 * Horloges SD · stockage local (localStorage) et exemples.
 * Les deux pages (préparation et salle) lisent la même clé : une modification
 * faite dans la préparation est vue par l'affichage de salle (événement
 * « storage » entre onglets + relecture régulière).
 */
(function (root) {
  "use strict";

  var KEY = "horloges-sd:v1";

  function uid() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function item(title, duration, opts) {
    opts = opts || {};
    return { id: uid(), title: title, detail: opts.detail || "", duration: duration, pause: !!opts.pause };
  }

  /* Exemples tirés des deux SD réelles. Modifiables et supprimables. */
  function examples() {
    return [
      {
        id: uid(),
        title: "SD du 12.10",
        date: "2026-10-12",
        start: "08:30",
        theme: "sombre",
        autoAdvance: false,
        notes: "Session du matin, 08:30 – 11:50.",
        live: null,
        items: [
          item("Ouverture", 10, { detail: "Check-in · Rappel des 24 h client" }),
          item("Bloc 1 · Revue de projet", 40, { detail: "20 min par projet : pitch, indicateurs, objectifs, road map, problématique" }),
          item("Pause", 10, { pause: true }),
          item("Bloc 1 · Revue de projet (suite)", 30, { detail: "20 min par projet" }),
          item("Point Antoine · Profils Leonardo", 15),
          item("Pause", 10, { pause: true }),
          item("Bloc 2 · Projets Rocket Week V2", 40, { detail: "Nexus · Perfume · Échappement alpin" }),
          item("Bloc 3 · Lecture individuelle", 25, { detail: "Pretotype It, Alberto Savoia (Patrick)" }),
          item("Clôture · Présentation V1 Motorola", 10, { detail: "Louis" }),
          item("Divers et check-out", 10)
        ]
      },
      {
        id: uid(),
        title: "SD du 15.10",
        date: "2026-10-15",
        start: "13:30",
        theme: "nexus",
        autoAdvance: false,
        notes: "Début prévu à 13:00 puis déplacé à 13:30. Programme modifié en direct : ajout des invités (coach et apprentis coachs) et de la présentation Motorola de Luc. La LI d'Eliott et Luc a dépassé son temps (fin réelle 16:30) ; les mots de Sarah et Lionel ont eu lieu pendant cette LI.",
        live: null,
        items: [
          item("Ouverture", 10, { detail: "Check-in et intro · Rappel : le fichier 24 h client !" }),
          item("Tour de présentation", 5, { detail: "Vardena se présente, puis les invités" }),
          item("Revue de la charte de Vardena", 5, { detail: "Corrections" }),
          item("Propositions pré-Motorola", 30, { detail: "Mehdi puis Arno · 15 min chacune" }),
          item("Proposition Motorola de Luc", 10),
          item("Pause", 10, { pause: true }),
          item("LI de Samuel", 30, { detail: "Comment se faire des amis, Dale Carnegie" }),
          item("Pause", 10, { pause: true }),
          item("LI d'Eliott et Luc", 30, { detail: "HackVS Innovation : les talents de demain face à l'IA · a dépassé (fin réelle 16:30)" }),
          item("Brief de Yoan et Louis", 10, { detail: "Rocket Week et rôle avec les autres team companies" }),
          item("Arbre de compétences dans Notion", 10, { detail: "Le responsable de chaque compétence prend la mémoire" }),
          item("Gestion des retards", 5, { detail: "Proposition d'Eliott" }),
          item("Point projets", 10, { detail: "État d'avancement des projets" }),
          item("Échange avec les invités", 5, { detail: "Si le temps le permet" }),
          item("Divers et check-out", 10)
        ]
      }
    ];
  }

  function blankSession() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return {
      id: uid(),
      title: "Nouvelle SD",
      date: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()),
      start: "08:30",
      theme: "nexus",
      autoAdvance: false,
      notes: "",
      live: null,
      items: [item("", 10), item("", 10)]
    };
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && Array.isArray(data.sessions)) return data;
      }
    } catch (e) { /* stockage indisponible ou corrompu : on repart des exemples */ }
    var ex = examples();
    var fresh = { version: 1, activeId: ex[1].id, sessions: ex };
    write(fresh); // premier lancement : on enregistre les exemples pour garder des identifiants stables
    return fresh;
  }

  function write(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  root.SDStore = { KEY: KEY, uid: uid, item: item, examples: examples, blankSession: blankSession, read: read, write: write };
})(typeof self !== "undefined" ? self : this);
