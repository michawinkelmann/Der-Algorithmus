# Konzept B: „Redaktionsraum 2028" — Bauanleitung für Claude Code

> **Zweck dieser Datei:** Vollständiges Briefing für die Entwicklung eines interaktiven, webbasierten Lernspiels zum Thema **Desinformation, Deepfakes, Plattformmanipulation und investigativer Journalismus**. Zielgruppe: Schülerinnen und Schüler der 12. Klasse eines Gymnasiums. Einsatz: 3-tägige Projektwoche „Demokratiebildung — Reden, Posten, Mitmischen", Unterthema „Gaming und Social Media". Lehrkraft betreut, liefert aber keinen Input.

---

## 1. Pitch in einem Satz

Die SuS spielen in 2er- oder 3er-Teams ein Recherche-Team der fiktiven Online-Redaktion **„FAKT.news"** im Jahr 2028 und müssen in drei Tagen drei investigative Fälle rund um Desinformation, Deepfakes und Gaming-Plattformen aufklären, Beweise prüfen, Zeug:innen befragen und am Ende jedes Falls einen Artikel veröffentlichen.

## 2. Lernziele

Nach der Projektwoche können die SuS:

- Deepfakes und manipulierte Medien an typischen Artefakten und Kontextindizien erkennen
- Quellen systematisch prüfen (Metadaten, Querverweise, Plausibilität)
- Funktionsweise von Desinformations-Kampagnen beschreiben (Seeding, Verstärker, Narrative)
- Radikalisierungs-Dynamiken in Gaming-/Chat-Communities identifizieren
- verdeckte politische Werbung und Influencer-Manipulation erkennen
- journalistisch sauber formulieren (Trennung Fakt/Meinung, Quellenangabe, Präsumption)
- im Team argumentieren und Entscheidungen mit Quellen begründen

## 3. Rahmen & Setting

- **Modus:** Koop-Singleplayer in **2er- oder 3er-Teams** an einem Gerät. Rollen werden vom Spiel zugewiesen (Recherche, Analyse, Text), lassen sich aber tauschen.
- **Plattform:** Lokale Web-App, läuft per Doppelklick auf `index.html` in Chrome/Safari/Firefox
- **Zielgeräte:** Windows-PCs (Schulrechner) **und** iPads (Safari). Touch- und Maus-Bedienung müssen beide sauber funktionieren.
- **Dauer:** 3 Schultage à ca. 6 Zeitstunden. Pro Tag ein Fall.
- **Leistungsnachweis:** Keiner — rein formativ. Motivation durch Thriller-Atmosphäre und den Stolz, einen veröffentlichungsfähigen Artikel zu produzieren.
- **Sprache:** Deutsch
- **Inhaltliche Schärfe:** Realistisch und direkt. Deepfakes einer fiktiven Politikerin, Radikalisierung in einer fiktiven Gaming-Gilde, verdeckte Wahlkampfbeeinflussung. Heikle Passagen mit Inhaltswarnungen.
- **Setting:** Nahe Zukunft 2028, fiktive deutsche Großstadt **Greifshafen**, fiktive Plattformen (`Streem`, `ChatterNet`, Gaming-Plattform `Arenyx`), fiktive Parteien, fiktive Personen.

## 4. Tagesstruktur

### Tag 1 — Fall 1: „Die manipulierte Rede"
**Aufhänger:** Ein Video kursiert, in dem die fiktive Ministerpräsidentin Claudia Brandt angeblich rechtsextreme Äußerungen macht. Das Video hat in 24 h 8 Mio. Views auf ChatterNet. Das Team soll prüfen: echt oder Deepfake? Wer steckt dahinter?

**Phasen:**
- **Briefing (30 min):** animierte Intro-Cutscene, Redaktionsleiter Ercan Demir erklärt den Fall. Einführung in die Werkzeuge.
- **Ermittlung (3 h):** Video-Analyse-Tool (Frame für Frame, Lippensync, Artefakt-Detektor), Metadaten-Prüfung, Kontext-Check (wurde so etwas je gesagt?), Vergleich mit anderen Reden.
- **Interviews (1,5 h):** 3 Zeug:innen-Dialoge (Social-Media-Expertin, KI-Forscher, anonyme Quelle). Dialogsystem mit Fragenauswahl.
- **Redaktionskonferenz (30 min):** Im Spiel simuliertes Meeting. Team muss Position beziehen (Multiple-Choice-Meeting).
- **Artikel schreiben (1 h):** Editor mit Quellen-Pins. Das Team schreibt einen Artikel mit Einbindung der gefundenen Beweise.
- **Veröffentlichung + Peer-Feedback:** KI-Redakteurin „Dr. Meier" gibt strukturiertes Feedback im Spiel (keine echte KI — vorgefertigte Bewertungs-Logik basierend auf eingebundenen Quellen).

### Tag 2 — Fall 2: „Die Gilde"
**Aufhänger:** Ein Leak aus der Gaming-Plattform Arenyx: Tausende Chat-Nachrichten aus der Gilde „Nordwacht" sind im Netz. Vorwürfe: Rekrutierung Jugendlicher in rechtsextreme Netzwerke, Koordination einer Hate-Kampagne gegen eine Lokalpolitikerin. Das Team soll prüfen, was dran ist.

**Phasen:**
- **Briefing** — Einstieg in die Gaming-Welt, neue Werkzeuge.
- **Chat-Analyse (2,5 h):** ~500 fiktive Chat-Messages müssen durchgearbeitet werden. Tool zum Filtern, Markieren, Verlinken. Einzelne Accounts haben Verbindungen zu bekannten (fiktiven) Extremist:innen-Accounts — muss selbst entdeckt werden.
- **Undercover-Mission (1,5 h):** Ein:e im Team erstellt einen Fake-Account, betritt die Gilde, beobachtet live die Kommunikation. Dialogsystem mit Risiko: zu auffällig → enttarnt, zu passiv → nichts erfahren.
- **Kontext-Recherche (1 h):** Zusammenhänge zur echten (fiktiven) Lokalpolitikerin, die attackiert wird. Opfer-Perspektive über Interview.
- **Redaktionskonferenz + Artikel.**
- **Ethische Abwägung (15 min):** „Welche Chat-Zitate druckt ihr ab? Welche nicht? Nennt ihr Accountnamen?"

**Inhaltswarnung:** Dieser Fall enthält die direkteste Darstellung von Extremismus, frauenverachtender Sprache und organisiertem Hass. **Pflicht-Warnung** zu Beginn, Opt-Out möglich (alternative, abgemilderte Version des Falls freischaltbar).

### Tag 3 — Fall 3: „Der unsichtbare Wahlkampf"
**Aufhänger:** Die Influencerin Nina Vega (4 Mio. Follower) macht subtile politische Aussagen. Das Team erhält einen Tipp: Ihre Agentur wird aus dem Ausland finanziert, mit dem Ziel, die anstehende Landtagswahl in Greifshafen zu beeinflussen. Das Team muss das Netzwerk aufdecken.

**Phasen:**
- **Briefing.**
- **Follow-the-Money (2 h):** Mini-Tool mit Firmenverflechtungen. Graph-Editor, in dem das Team Verbindungen dokumentiert. Daten aus simulierten Transparenzregistern und Leaks.
- **Post-Analyse (1,5 h):** ~80 Instagram-ähnliche Posts von Nina Vega. Das Team soll unmarkierte politische Werbung finden (Unterschiede zwischen deklarierten und nicht-deklarierten Sponsored-Posts erkennen).
- **Konfrontation (1 h):** Interview mit Nina Vega — sie wird defensiv, emotional, teilweise manipulativ. Der Dialog ist anspruchsvoll. Zeigt, dass Journalismus Menschen gegenübertreten muss.
- **Redaktionskonferenz + großer Abschluss-Artikel** (länger, mit den gefundenen Firmenverflechtungen als eingebettetes Diagramm).
- **Finale Cutscene:** Je nach journalistischer Qualität unterschiedliche Endings (Artikel wird aufgegriffen / wird angegriffen / wird ignoriert).

## 5. Projektstruktur

```
redaktionsraum-2028/
├── index.html                  # Einstieg, Hauptmenü
├── README.md
├── css/
│   ├── main.css
│   ├── ui.css                  # Redaktions-UI, Buttons, Dialoge
│   ├── tools.css               # Video-, Chat-, Graph-Analyse-Tools
│   ├── article.css             # Artikel-Editor
│   └── cutscenes.css
├── js/
│   ├── main.js                 # Router, Fall-Auswahl
│   ├── state.js                # Team-State, Fortschritt, Notizen
│   ├── dialog.js               # Dialogsystem für Interviews
│   ├── tools/
│   │   ├── video_analyzer.js   # Frame-für-Frame, Deepfake-Detektor
│   │   ├── metadata_viewer.js
│   │   ├── chat_analyzer.js    # Fall 2
│   │   ├── graph_editor.js     # Fall 3 Firmennetzwerk
│   │   └── post_inspector.js   # Fall 3 Influencer-Posts
│   ├── article_editor.js       # Artikel schreiben + Quellen pinnen
│   ├── feedback_engine.js      # „KI-Redakteurin"-Bewertung
│   ├── cases/
│   │   ├── case1.js
│   │   ├── case2.js
│   │   └── case3.js
│   └── cutscenes.js
├── data/
│   ├── case1/
│   │   ├── briefing.json
│   │   ├── video_evidence.json # Deepfake-Metadaten, Artefakte
│   │   ├── interviews.json     # Dialog-Bäume
│   │   ├── sources.json
│   │   └── story.json
│   ├── case2/
│   │   ├── briefing.json
│   │   ├── chatlog.json        # ~500 Chat-Nachrichten
│   │   ├── profiles.json       # Gilde-Mitglieder
│   │   ├── interviews.json
│   │   └── story.json
│   ├── case3/
│   │   ├── briefing.json
│   │   ├── companies.json      # Firmenverflechtungen
│   │   ├── posts.json          # Influencer-Posts
│   │   ├── interviews.json
│   │   └── story.json
│   └── rubric.json             # Bewertungskriterien für Feedback-Engine
├── assets/
│   ├── img/                    # SVG-Avatare, Logos (fiktiv), Cutscene-Frames
│   ├── audio/                  # kurze Soundeffekte (optional)
│   └── animations/
└── tools/
    └── editor.html             # Debug-Werkzeug für die Lehrkraft
```

## 6. Technologie-Stack

- **Pures HTML + CSS + Vanilla JavaScript (ES-Modules).** Kein Build, kein npm.
- **Keine CDNs zur Laufzeit.** Alles lokal.
- **localStorage** für Team-Fortschritt. Hinweis Safari/iPad wie in Konzept A.
- **SVG-Grafiken und SVG-Animationen** für Cutscenes und Avatare.
- **„Videos" simuliert** als SVG-Animationen mit künstlicher Mund-Bewegung — passt perfekt zum Thema Deepfakes, die SuS sollen die Fake-Mechanik direkt sehen.
- **Audio optional:** kurze Atmo-Sounds (Redaktions-Rauschen, UI-Sounds). Als lokale .mp3 oder .ogg.
- **Touch + Maus** Pflicht. Drag-and-Drop für Graph-Editor und Quellen-Pins muss auf Touch funktionieren.
- **Print-Stylesheet** für Artikel (optionaler Druck/Export als HTML).

## 7. Kern-Mechaniken im Detail

### 7.1 Das Notizbuch (fallübergreifend)

Persistentes „Notizbuch"-Panel am rechten Bildschirmrand. Die SuS können Textschnipsel, Screenshots von Beweisen, Chatzitate und Personen-Profile hineinziehen. Jeder Eintrag bekommt einen Tag und kann später beim Artikel-Schreiben per Drag-and-Drop als Quelle eingebunden werden.

Struktur:
```javascript
notebook = {
  items: [
    { id, caseId, type: "quote|image|metadata|link|fact", 
      content, source: "...", timestamp, tags: [...], reliability: 0.8 }
  ]
}
```

**Didaktisch wichtig:** Die SuS müssen aktiv entscheiden, was ins Notizbuch kommt. Nicht alles ist automatisch drin.

### 7.2 Video-Analyse-Tool (Fall 1)

Ein Mini-Werkzeug, das ein animiertes SVG-Video (fiktive Rede) abspielt mit:
- **Frame-Stepper** (vor/zurück, Pause)
- **Zoom-Box** zum Vergrößern einzelner Bereiche
- **Artefakt-Overlay** — beim Aktivieren werden manipulierte Bereiche per Heatmap hervorgehoben
- **Lippensync-Check** — spielt Audio und Video getrennt ab, zeigt Offset
- **Metadaten-Fenster** — EXIF/XMP-ähnliche Info mit verdächtigen Feldern

Das „Video" ist ein vorab gefertigtes SVG mit kontrollierten, sichtbaren Artefakten (verzerrter Mundbereich, Anschluss-Sprung bei Sekunde 0:14, unpassendes Licht). Die SuS müssen diese Hinweise aktiv finden. Gibt es eine festgelegte Liste von „findbaren Hinweisen" — alle gefunden = Video als Fake klassifiziert, Artikel kann fundiert geschrieben werden.

### 7.3 Chat-Analyzer (Fall 2)

~500 Chat-Nachrichten in einem Interface ähnlich Discord. Features:
- **Filtern** nach Keyword, Account, Zeitraum, Tag
- **Markieren** von Nachrichten (farbige Highlights, eigene Kommentare)
- **Verbinden:** per Klick zwei Nachrichten/Accounts verknüpfen → Graph baut sich auf
- **Account-Profile:** Klick auf Nutzernamen öffnet Profil mit Postverlauf, Verbindungen, Alter des Accounts
- **Rechtliche Hinweise:** Einzelne Nachrichten enthalten Symbole/Codes, die in der rechten Randspalte erklärt werden (Zahlencodes, Dogwhistles — mit Kontextualisierung). **Wichtig:** nur als Lernmoment, nicht als Glossar für die Nutzung.

### 7.4 Graph-Editor (Fall 3)

Node-Graph-Editor für Firmenverflechtungen. Knoten = Personen/Firmen, Kanten = Beziehungen (besitzt, berät, finanziert, verheiratet mit, …). Die SuS bauen den Graph aus gelesenen Dokumenten auf und entdecken so die Struktur.

Features: Drag-and-Drop-Knoten, Kanten-Typen mit Farbcodierung, Export als PNG oder in Artikel einbetten.

### 7.5 Dialogsystem für Interviews

Klassisches Branching-Dialogsystem mit ~3–5 Gesprächsrunden pro Interview. Jede Option hat:
- sichtbare Frage
- hidden Metadaten (aggressiv/einfühlsam/sachlich)
- Einfluss auf den Gesprächsverlauf (NPCs haben „Vertrauen"-Wert)
- ggf. freigeschaltete Folgefragen

Dialog-JSON-Struktur:
```javascript
{
  npc: "nina_vega",
  trust: 0.5,
  nodes: [
    { id: "start", text: "...", options: [
        { text: "...", style: "direkt", trustChange: -0.1, goto: "node_17" },
        { text: "...", style: "einfühlsam", trustChange: +0.1, goto: "node_18" }
    ]},
    ...
  ]
}
```

### 7.6 Artikel-Editor

Einfacher WYSIWYG-Editor (kein contenteditable-Chaos — eigene textarea-basierte Lösung oder Block-Editor). Features:
- **Quellen pinnen:** Drag aus dem Notizbuch ans Ende eines Absatzes → wird als Fußnote gerendert
- **Strukturblöcke:** Überschrift, Lead, Absatz, Zitat, eingebettete Grafik, Infobox
- **Live-Wortzähler**
- **Veröffentlichungs-Checkliste:** Lead da? Mindestens 3 Quellen? Namensschreibung konsistent? Zitate korrekt attribuiert?
- **Live-Preview** im Nachrichtenportal-Look
- **Export** als HTML-Datei zum Speichern/Drucken

### 7.7 Feedback-Engine (`feedback_engine.js`)

**Keine echte KI.** Regelbasiertes Scoring-System, das den Artikel analysiert:

- Enthält er die „Schlüssel-Facts" aus dem Fall? (Liste in `rubric.json`)
- Sind Zitate korrekt attribuiert? (Match gegen `sources.json`)
- Ist die Richtigkeit der Hauptaussage gegeben? (Deepfake-Fall: behauptet Artikel, das Video sei Fake? Wenn nein → roter Bereich im Feedback)
- Gibt es unbelegte Behauptungen? (Sätze ohne Quellen-Pin, die mit klaren Aussage-Mustern beginnen, werden angemahnt)
- Ton: zu reißerisch? Zu zurückhaltend? (Keyword-basierte Prüfung)

Das Feedback wird von einer fiktiven Chefredakteurin „Dr. Helena Meier" gesprochen (Text, ggf. stumm oder mit synthetischem Audio). Es ist konstruktiv, weist auf Lücken hin, lobt Gefundenes. **Keine Zensur-Logik, keine „Note".**

## 8. State-Schema (localStorage)

Ein Key `redaktion_save_v1`:

```javascript
{
  meta: { version: 1, team: { members: [...], role: "...", device: "..." }, ... },
  currentCase: 2,
  caseProgress: {
    case1: { started, completed, phase, ... },
    case2: { ... },
    case3: { ... }
  },
  notebook: { items: [...] },
  articles: { case1: {...}, case2: {...}, case3: {...} },
  dialogHistory: {...},
  npcState: {...},
  feedback: {...},
  settings: { difficulty: "normal|sanft", contentWarningsAck: {...} }
}
```

Autosave nach jeder Aktion. „Team-Wechsel"-Funktion: Es kann mehrere Savegames pro Browser geben.

## 9. UI-Design & Ton

- **Look:** Redaktions-Newsroom-Ästhetik. Dunkles Haupttheme, Akzente in Signalfarben (Rot für Breaking, Gelb für Warnungen). Typografie seriös (Serif für Artikel, Sans-Serif für UI). Wirkt wie ein Arbeitswerkzeug, nicht wie ein Spiel.
- **Atmo:** Dezente Hintergrund-Sounds (Tastatur-Klicken, Telefon-Klingeln weit entfernt, Keyboard-Rauschen). Optional, abschaltbar.
- **Ton der Texte:** Erwachsen, realistisch, kein Duz-Ton zur Lehrkraft oder SuS. Das Spiel spricht sie als Journalist:innen an.
- **Cutscenes:** SVG-Vektor-Animationen mit wenigen Frames, eher wie Graphic-Novel-Panels. Inspiration: „Papers, Please" oder „A Case of Distrust".
- **Typografie:** System-Fonts. Serif-Fallback für Artikel, Sans-Serif für UI.

## 10. Inhaltswarnungen & Leitplanken

- **Pflicht-Warnung** vor Fall 2 (Radikalisierung) und vor bestimmten Passagen in Fall 1 und 3.
- **Sanfte Variante** jedes Falls freischaltbar: abgemildert, aber inhaltlich gleichwertig. Z.B. weniger explizite Zitate, weniger aggressive Dialog-Aussagen.
- **Opt-out jederzeit** aus jedem Fall — SuS können einzelne Passagen überspringen, verlieren aber evtl. Beweise für den Artikel. Das Spiel bleibt spielbar.
- **Kein Hate-Speech als spielbare Option für die SuS.** Sie können niemals selbst Hassrede schreiben/absetzen. Sie können nur beobachten, zitieren, kontextualisieren.
- **Beratungsangebote** am Ende jedes Tages und im Hauptmenü verlinkt: bpb.de, klicksafe.de, HateAid, Beratungsnetzwerk gegen Rechtsextremismus, Telefonseelsorge.

## 11. Team-Modus-Details

Das Spiel erkennt zu Beginn: **2er oder 3er Team?** Einstellung im Menü. Je nach Größe:

- **2er:** Rollen „Recherche" und „Redaktion". Einige Tasks müssen zusammen gelöst werden (Dialog-Entscheidungen).
- **3er:** Zusätzlich „Analyse" — bekommt beim Chat-Analyzer und Graph-Editor Hauptverantwortung.

**Rollen-Tipps** erscheinen als UI-Hinweise („Lasst die Recherche-Person kurz die Metadaten prüfen, bevor ihr weiterklickt"). Keine zwingende Rollenaufteilung — das Spiel funktioniert auch, wenn alles eine Person macht, aber die Tipps fördern Arbeitsteilung.

**Wichtige Designentscheidung:** Nur EIN Gerät pro Team. Das Spiel synchronisiert sich nicht zwischen Geräten — Teamwork findet am Bildschirm statt. Das ist didaktisch bewusst: Diskussion vor dem Gerät ist das Lernziel.

## 12. Story-Details & Besetzung

**Wiederkehrende Figuren:**
- **Ercan Demir** — Chefredakteur, pragmatisch, gibt die Briefings.
- **Dr. Helena Meier** — Deskchefin, gibt Artikel-Feedback, streng aber fair.
- **Ayla Koçak** — IT-Forensikerin der Redaktion, hilft bei technischen Fragen.
- **Sebastian Trepte** — Justitiar, warnt vor presserechtlichen Problemen.

**Wichtige NPCs pro Fall:**
- Fall 1: Claudia Brandt (Ministerpräsidentin, Opfer), Prof. Dr. Tobias Werth (KI-Forscher), anonyme Whistleblower-Quelle „Lux".
- Fall 2: Greta Holm (Lokalpolitikerin, Opfer der Hasskampagne), „Drachenlord_88" (Gilden-Admin), „shadow_07" (Aussteiger:in).
- Fall 3: Nina Vega (Influencerin), ihre Managerin Frida Jansen, anonymer Ex-Mitarbeiter.

**Alle Namen fiktiv**, Ähnlichkeiten mit echten Personen sind zu vermeiden. Claude Code soll die Namen prüfen und ggf. anpassen.

## 13. Entwicklungs-Phasen für Claude Code

**Phase 1 — Gerüst:** Projektstruktur, Haupt-UI (Redaktionsansicht, Notizbuch, Navigation), State-Management. Ein vereinfachter Durchstich von Fall 1 (Briefing → ein Interview → Artikel → Feedback).

**Phase 2 — Tools bauen:** Video-Analyzer, Chat-Analyzer, Graph-Editor. Das sind die technisch anspruchsvollsten Komponenten und sollten einzeln entwickelt und getestet werden.

**Phase 3 — Content Fall 1:** Komplette Ausarbeitung Fall 1 (Deepfake): Cutscene, Video-Asset mit Artefakten, 3 Interviews, Quellen, Rubric.

**Phase 4 — Content Fall 2:** Chat-Log (~500 Nachrichten), Gilde-Profile, Undercover-Mission, Opfer-Interview. **Mit besonderer Sorgfalt bei Inhaltswarnungen.**

**Phase 5 — Content Fall 3:** Firmengraph-Daten, Influencer-Posts, Konfrontations-Interview.

**Phase 6 — Artikel-Editor & Feedback-Engine:** Das Herz des pädagogischen Outputs. Viel Zeit investieren.

**Phase 7 — Polish:** iPad-Test, Touch-Drag-and-Drop, Atmo-Sounds, README, Barrierefreiheit.

## 14. README für die Lehrkraft

- Installations-Anleitung
- Team-Größen-Hinweis
- Zeitplan pro Tag
- Vorschläge für Zwischenimpulse der Lehrkraft (z.B. „Nach dem Chat-Analyzer lohnt sich ein kurzer Austausch in der Klasse: Welche Muster habt ihr entdeckt?")
- iPad-Spezifika
- Troubleshooting
- Inhaltswarnungs-Übersicht: welche Szenen, wann, welche Alternativen.
- Beratungsangebote auch für die Lehrkraft (falls SuS Gesprächsbedarf haben)

## 15. Abnahmekriterien

- [ ] 3 Teams unabhängig 3 Tage ohne Lehrer-Input durchspielbar
- [ ] iPad (Safari) und PC (Chrome/Firefox) gleichwertig spielbar
- [ ] Drag-and-Drop (Notizbuch, Graph, Artikel-Quellen) funktioniert auf Touch
- [ ] Alle Inhaltswarnungen greifen, Opt-outs funktionieren
- [ ] Feedback-Engine gibt in allen 3 Fällen fundiertes, differenziertes Feedback
- [ ] Spielstand überlebt Browser-Neustart, mehrere Teams pro Browser möglich
- [ ] Artikel als HTML exportierbar (druckbar)
- [ ] Keine echten Markennamen, keine echten Personen
- [ ] Keine externen Ressourcen zur Laufzeit
- [ ] README vollständig

## 16. Besondere Design-Hinweise

- **Die Werkzeuge sollen echt wirken.** Nicht wie ein „Spiel", sondern wie eine Redaktions-Software. Das steigert das Immersion.
- **Nicht belehren.** Das Spiel sagt nie „Ihr habt jetzt gelernt, dass …". Es lässt die SuS selbst schlussfolgern. Nur im Feedback zum Artikel und in optionalen Infoboxen gibt es explizite Aussagen.
- **Realistisches Tempo.** Lieber weniger, aber dichte Inhalte als hektisch viele Mini-Quizzes.
- **Team-Diskussion fördern.** Viele Entscheidungen sollen Diskussion auslösen (soll ich das zitieren oder nicht? Ist das genug Beweis?). Das Spiel fragt manchmal explizit: „Sprecht kurz im Team darüber."
