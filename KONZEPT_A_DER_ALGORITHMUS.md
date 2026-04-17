# Konzept A: „Der Algorithmus" — Bauanleitung für Claude Code

> **Zweck dieser Datei:** Vollständiges Briefing für die Entwicklung eines interaktiven, webbasierten Lernspiels zum Thema **Algorithmen, Filterblasen und Radikalisierung in Social Media**. Zielgruppe: Schülerinnen und Schüler der 12. Klasse eines Gymnasiums. Einsatz: 3-tägige Projektwoche „Demokratiebildung — Reden, Posten, Mitmischen", Unterthema „Gaming und Social Media". Lehrkraft betreut, liefert aber keinen Input.

---

## 1. Pitch in einem Satz

Die SuS übernehmen den Account einer fiktiven Person und spielen ein simuliertes Halbjahr Social-Media-Nutzung; ein Algorithmus reagiert auf ihre Entscheidungen und formt Feed, Followerschaft und Weltbild — am Ende sehen sie in einem datengestützten Jahresrückblick, wie ihre Filterblase entstanden ist.

## 2. Lernziele

Nach der Projektwoche können die SuS:

- erklären, wie Empfehlungsalgorithmen funktionieren (Engagement-Metriken, Gewichtung, Feedback-Loops)
- die Entstehung von Filterblasen und Echokammern am eigenen Spielverlauf nachvollziehen
- typische Radikalisierungs-Pfade in Plattformökonomien benennen (Rabbit Hole, gradueller Extremismus)
- erkennen, wie politische Werbung, Bots und gekaufte Reichweite wirken
- eigene Strategien zur Mediennutzung reflektieren und formulieren
- ein einfaches Empfehlungssystem nach eigenen Regeln designen und begründen

## 3. Rahmen & Setting

- **Modus:** Singleplayer, ein Gerät pro SuS
- **Plattform:** Lokale Web-App, läuft per Doppelklick auf `index.html` in Chrome/Safari/Firefox
- **Zielgeräte:** Windows-PCs (Schulrechner) **und** iPads (Safari). Touch- und Maus-Bedienung müssen beide sauber funktionieren.
- **Dauer:** 3 Schultage à ca. 6 Zeitstunden, insgesamt ~18 h Spielzeit inkl. Pausen und Reflexion
- **Leistungsnachweis:** Keiner — rein formativ. Motivation durch Story und Entdeckung.
- **Sprache:** Deutsch (alle Texte, UI, Inhalte)
- **Inhaltliche Schärfe:** Realistisch und direkt. Rechte/verschwörungsideologische/frauenfeindliche Inhalte dürfen vorkommen, müssen aber immer durch einen erkennbaren **Warnhinweis** im Spiel eingeleitet werden (Overlay „Inhaltswarnung: Im folgenden Abschnitt werden Inhalte gezeigt, die …"). Keine echten Namen echter Personen, keine echten Logos. Fiktionale Plattform („**Streem**" oder Ähnliches), fiktionale Influencer.

## 4. Tagesstruktur (didaktischer Bogen)

### Tag 1 — Onboarding & erste Wochen (W1–W8)
- **Intro-Sequenz (20 min):** animierte Titelsequenz, Charakter-Erstellung (Geschlecht, Interessen, Gerät), fiktive Stadt, fiktive Schule. „Du ziehst gerade von einer kleinen Stadt nach Hamburg."
- **Tutorial-Woche (W0):** Plattform „Streem" kennenlernen — Feed scrollen, liken, kommentieren, posten, folgen.
- **Wochen 1–8:** pro Woche 5–8 Mikro-Entscheidungen. Feed zeigt ~10 Posts/Woche. Am Wochenende kommt ein kurzer „Wochenrückblick" mit Statistiken (Follower, Reichweite, Stimmung im Feed).
- **Themen W1–W8:** noch harmlos — Lifestyle, Gaming, Uni, erste Politik-Posts, Freundeskreis.
- **Am Ende Tag 1:** „Halbzeit-Reflexion" im Spiel — kurzer Text, drei Fragen an die SuS (Antworten werden gespeichert).

### Tag 2 — Komplexität & Verschärfung (W9–W18)
- **Neue Mechaniken schalten sich frei:**
  - **Politische Werbung** erscheint im Feed, erkennbar an Kennzeichnung
  - **Bots & Fake-Accounts** folgen dem Account, manche freundlich, manche trollend
  - **Shitstorm-Event:** Ein Post der SuS (je nach Verlauf) wird viral, positiv oder negativ
  - **Discord-ähnliche Gruppenchats** — Einladungen in Gaming-Gilden, einige mit radikalem Einschlag
  - **Empfehlungs-Panel** „Dir könnte auch gefallen…" wird sichtbar und lenkbar
- **Rabbit-Hole-Mechanik:** Wer bestimmte Inhalte konsumiert, bekommt gradueller extremere Vorschläge. Dies ist **im Spiel sichtbar** aber nicht plump — die SuS sollen es beim Jahresrückblick entdecken.
- **Inhaltswarnungen** werden aktiv ab dieser Phase (Verschwörungsnarrative, antifeministische Memes, rechte Gaming-Communities). Im Spiel immer als „wird häufig in solchen Communities verbreitet" gerahmt, nie affirmativ.
- **Am Ende Tag 2:** freigeschaltete **„Blick hinter den Algorithmus"**-Seite — zeigt erstmalig, welche Datenpunkte das System über die SuS gesammelt hat.

### Tag 3 — Analyse & Gestaltung (W19–W26 + Sandbox)
- **Letzte Wochen W19–W26** mit den reichweitenstärksten Ereignissen (Wahl-Situation in der fiktiven Stadt, Hate-Speech-Incident, Einfluss-Versuch durch „Influencer X").
- **Jahresrückblick-Sequenz (60 min, inszeniert):** Spotify-Wrapped-Stil, animiert:
  - „Deine Top-Interessen laut Algorithmus"
  - „Dein politischer Echokammer-Score"
  - „Dein Rabbit-Hole-Pfad" (visualisiert als Graph der Inhalts-Kategorien über die Zeit)
  - „Wen der Algorithmus für dich hält" — fiktives „Werbeprofil"
  - „Was du nicht gesehen hast" — ausgeblendete Gegenpositionen
- **Sandbox-Modus:** Die SuS können eigene Algorithmus-Regeln schreiben (per Slider & Logik-Blöcke, kein Code) und testen, wie sich der Feed dadurch ändert. Z.B. „Zeige Inhalte, die von MEHR unterschiedlichen Quellen kommen" / „Gewichte Aktualität höher als Engagement" / „Bestrafe Posts mit viel Empörungssprache".
- **Abschluss:** Export eines persönlichen „Medien-Manifests" als druckbare HTML-Seite.

## 5. Projektstruktur

```
der-algorithmus/
├── index.html                # Einstiegspunkt
├── README.md                 # Kurzanleitung für die Lehrkraft
├── css/
│   ├── main.css              # Grundlayout, Theme
│   ├── feed.css              # Feed-spezifisch (Posts, Cards)
│   ├── animations.css        # Keyframe-Animationen
│   └── wrapped.css           # Jahresrückblick-Styles
├── js/
│   ├── main.js               # Einstieg, Routing
│   ├── state.js              # Zentraler Gamestate, localStorage
│   ├── algorithm.js          # Empfehlungs-Engine (siehe §7)
│   ├── feed.js               # Feed-Rendering, Interaktionen
│   ├── events.js             # Wöchentliche Events, Shitstorm, Wahl
│   ├── characters.js         # NPC-Definitionen, Bots, Influencer
│   ├── wrapped.js            # Jahresrückblick-Sequenz
│   ├── sandbox.js            # Algorithmus-Editor Tag 3
│   └── warnings.js           # Inhaltswarnungen-System
├── data/
│   ├── posts.json            # ~400 Beispiel-Posts mit Tags
│   ├── characters.json       # NPCs, Influencer, Bots
│   ├── events.json           # Wochenereignisse
│   ├── ads.json              # Politische Werbung
│   └── weeks.json            # Story-Struktur W0–W26
├── assets/
│   ├── img/                  # SVG-Avatare, Icons, Memes (generiert)
│   ├── audio/                # kurze Sounds (optional)
│   └── animations/           # CSS/JS-basierte Animationen
└── tools/
    └── validate_data.html    # kleine Debug-Seite für die Lehrkraft
```

## 6. Technologie-Stack

- **Pures HTML + CSS + Vanilla JavaScript (ES-Modules).** Kein Build-Schritt, kein npm, kein Framework. Muss per `file://` funktionieren.
- **Keine externen CDNs zur Laufzeit.** Alles lokal. Falls Libraries nötig sind (z.B. Chart.js für den Jahresrückblick), als lokale Datei ins Projekt legen.
- **localStorage** für Spielstand. Struktur siehe §8. **Warnung für Safari/iPad:** Im „Privat"-Modus wird localStorage beim Schließen gelöscht — im README Hinweis für die Lehrkraft.
- **SVG-basierte Grafiken und Avatare**, damit das ZIP klein bleibt und alles scharf skaliert.
- **Kurze Animationen** als CSS-Keyframes oder JS-gesteuertes SVG (kein Video-Asset). Wenn „Videos" simuliert werden sollen (z.B. Deepfake einer Rede), mit SVG-Mund-Animation + sichtbaren Glitch-Effekten.
- **Touch + Maus:** Alle Interaktionen müssen mit Touch UND Maus funktionieren. Keine Hover-only-UI. Mindestgröße aller Touch-Targets 44×44 px.
- **Responsive:** 1024×768 (iPad) bis 1920×1080 (PC). Querformat priorisieren, Hochformat soll funktionieren.

## 7. Die Empfehlungs-Engine (Kern-Feature)

Die Engine in `algorithm.js` ist didaktisch das Herz des Spiels. Sie muss **nachvollziehbar, manipulierbar und später ausstellbar** sein.

### Datenstruktur eines Posts

```javascript
{
  id: "p0142",
  author: "char_023",              // Referenz auf characters.json
  text: "...",
  media: { type: "image|video|none", src: "..." },
  tags: ["gaming", "politik-rechts", "meme", "outrage"],
  engagement_bait_score: 0.7,      // 0–1
  outrage_score: 0.3,              // 0–1
  political_lean: -0.4,            // -1 (links) bis +1 (rechts)
  quality_score: 0.6,              // 0–1, "journalistische" Qualität
  trigger_warning: null            // oder "rechtsextremismus", "hass", ...
}
```

### Scoring-Funktion (vereinfacht, aber transparent)

```javascript
score(post, userProfile) =
    affinity(post.tags, userProfile.interests)     * w.affinity
  + engagementBoost(post)                          * w.engagement
  + recency(post)                                  * w.recency
  + followedAuthorBoost(post, userProfile)         * w.social
  + paidBoost(post)                                * w.ads
  - diversityPenalty(post, userProfile.recentFeed) * w.diversity
```

Die `w`-Gewichtungen sind ab Tag 3 im Sandbox-Editor veränderbar. In den ersten beiden Tagen sind sie so gesetzt, dass der realistische Effekt entsteht (Engagement und Affinity sehr hoch, Diversity sehr niedrig, Ads subtil vorhanden).

### Das User-Profil

Das Profil wird implizit aus dem Verhalten gelernt:

```javascript
userProfile = {
  interests: { gaming: 0.8, politik-rechts: 0.3, ... },   // Tag-Gewichte
  political_lean_estimated: -0.2,
  outrage_tolerance: 0.5,
  followed: [...],
  muted: [...],
  weekly_screentime: 120   // Minuten
}
```

Jede Interaktion (like, kommentieren, lange anschauen, teilen, Profil aufrufen, ignorieren) modifiziert das Profil. **Wichtig didaktisch:** liken zählt ~3×, kommentieren ~5×, teilen ~8× — „negative" Interaktionen wie Empörungs-Kommentare boosten das Thema trotzdem.

### Jahresrückblick

`wrapped.js` liest die Historie und generiert ~10 animierte „Slides" im Wrapped-Stil. Wichtig: die Texte sind generisch-formuliert, passen sich aber an die tatsächlichen Daten an („Du hast 73 % deiner Likes an Inhalte gegeben, die einer einzigen politischen Richtung zuzuordnen sind."). 

## 8. State-Schema (localStorage)

Ein einziger Key `algo_save_v1` mit JSON-Objekt:

```javascript
{
  meta: { version: 1, createdAt, lastSavedAt, day: 1|2|3 },
  character: { name, avatar, interests_initial, city },
  currentWeek: 14,
  history: [
    { week: 1, actions: [...], feedSeen: [...], profileSnapshot: {...} },
    ...
  ],
  userProfile: {...},
  unlockedMechanics: ["ads", "bots", "discord", "algorithm_panel"],
  reflections: { halftime: "...", final: "..." },
  sandboxRules: {...}
}
```

**Pause-Speichern und Resume** sind kritisch (Schulstunde zu Ende, Pausenklingel). Autosave nach jeder Aktion. Reset-Knopf im Einstellungsmenü.

## 9. UI-Design & Ton

- **Look:** Modern, glaubwürdig als Social-Media-App. Orientierung optisch an Instagram/TikTok/Twitter/X — aber mit eigenem, nicht imitiertem Design. Kein Logo-Missbrauch.
- **Farbschema:** Dunkelmodus als Default (passt zum Thema, schont Augen über 6 h). Helle Akzentfarbe (z.B. Magenta/Cyan) für die Plattform „Streem".
- **Typografie:** System-Fonts (-apple-system, Segoe UI, ...) — keine Web-Fonts laden.
- **Ton:** Spielerisch, nicht belehrend. Keine moralischen Zwischenrufe im Feed. Die Reflexion passiert durch den Jahresrückblick am Ende und durch zwei geplante Zwischenreflexionen. Zwischendurch darf das Spiel „süchtig machen" — das ist Teil des Lerneffekts.
- **Zugänglichkeit:** Alt-Texte auf allen Grafiken, Tastaturbedienung möglich, Kontrast WCAG AA.

## 10. Inhaltswarnungen & Redaktionelle Leitplanken

- **Warnhinweis-Komponente** zentral in `warnings.js`: Vor jedem Post mit `trigger_warning ≠ null` wird ein Overlay gezeigt. Die SuS können „Anschauen" oder „Überspringen" wählen. Beides wird getrackt.
- **Keine Aufforderungen zur Tat.** Auch in Fiktion keine konkreten Anleitungen zu Gewalt, Hassaktionen, Radikalisierung. Narrative Darstellung von Mechanismen — ja. Operative Anleitungen — nein.
- **Themen, die vorkommen dürfen (mit Warnung):**
  - rechtsextreme Narrative, Verschwörungsideologien (QAnon-artig), Querfront
  - antifeministische/Incel-Strömungen, Red-Pill-Rhetorik
  - Hate Speech gegen Minderheiten (als Zitat eines fiktiven Kommentars, nicht als spielbare Option für die SuS selbst)
  - graduelle Radikalisierung in Gaming-Communities (fiktive Discord-Gilde)
- **Themen, die nicht vorkommen:**
  - explizite Gewaltdarstellung, Selbstverletzung, Suizid
  - Darstellung oder Sexualisierung Minderjähriger in jeglicher Form
  - Darstellungen echter, lebender Personen
- **„Aussteigerhilfe" am Ende:** Im Abspann echte Beratungsangebote (bpb.de, klicksafe.de, HateAid, Beratungsnetzwerk gegen Rechtsextremismus, Telefonseelsorge). Kurze Liste, gut sichtbar.

## 11. Inhalts-Erstellung: Die ~400 Posts

Das Post-Korpus ist die Seele des Spiels. Vorgehen:

1. **Kategorien-Matrix anlegen:** 8 Themenfelder (Gaming, Politik-links, Politik-rechts, Lifestyle, Wissenschaft, Verschwörung, Humor, Hass) × 4 Qualitätsstufen (Journalismus, Laien, Propaganda, Müll) = 32 Cluster. Pro Cluster ~10–15 Posts.
2. **Posts generieren:** Fiktive Absender aus `characters.json`, Text 1–5 Sätze, plausibel formuliert. Am besten durch Claude Code generieren lassen mit explizitem Prompt pro Cluster.
3. **Tagging sauber:** Jeder Post braucht Tags + Scores (§7). Die Scores am besten per Heuristik aus dem Inhalt + händischer Nachkontrolle.
4. **Bilder:** SVG-Memes (einfache Bild-Text-Kompositionen), keine echten Fotos. Für „Deepfake-Demonstration" reicht ein animiertes SVG mit sichtbar künstlichem Gesicht.

## 12. Konkrete Features pro Modul

### 12.1 Feed-Ansicht (`feed.js`)
Endless-Scroll-Feed mit ~10 Posts pro Woche. Interaktionen: Like-Button, Kommentar-Knopf (öffnet Kommentar-Modal mit vorgefertigten Optionen), Teilen, Ignorieren (Scrollen). Post-Ansicht mit Detail-View und „Warum sehe ich das?"-Button (Tag 2+ freigeschaltet).

### 12.2 Wochenrückblick
Nach ~10 Posts: Modal mit Statistiken und nächstem Story-Event. „Weiter zu Woche X" Button. Hier auch Badges/Achievements (fiktiv, spielerisch: „Early Adopter", „Flammenwerfer", „Stiller Beobachter").

### 12.3 Algorithmus-Fenster (ab Tag 2)
Button „Blick hinter den Algorithmus" öffnet Panel mit:
- aktuellem User-Profil (sichtbare Tag-Gewichte)
- „Deine 3 wichtigsten Interessen laut System"
- „Ads-Targeting: du giltst als ..."
Die Darstellung ist **deutend, nicht spielerisch** — sie erklärt, was das System gerade „weiß".

### 12.4 Discord-Mechanik (ab Tag 2)
Eigene Ansicht „Gilden" — ~4 fiktive Gruppen. Je nach Verhalten werden Einladungen in radikalere Gruppen gepusht. In jeder Gilde: rudimentärer Chatverlauf (vorab geschrieben), die SuS können an 3–5 Punkten reagieren. Zeigt, wie Gruppenzugehörigkeit das eigene Weltbild verstärkt. **Dringend mit Inhaltswarnung.**

### 12.5 Wahl-Event (W20–W22)
In der fiktiven Stadt „Greifshafen" steht eine Kommunalwahl an. Vier fiktive Parteien. Der Feed der SuS zeigt, je nach Filterblase, extrem unterschiedliche „Wahrheiten" über Kandidaten. Am Ende: „Wen hätte dein Feed dich wählen lassen?"-Auswertung.

### 12.6 Jahresrückblick (`wrapped.js`)
10 Slides, volle Screen-Animationen, 5–10 Sekunden pro Slide (Überspringen möglich). Daten-gestützt, kein fester Text. Am Ende Export als HTML-Datei zum Speichern/Drucken.

### 12.7 Algorithmus-Sandbox (Tag 3)
GUI mit 6–8 Gewichtungs-Slidern (Engagement, Recency, Diversity, Quality, Political Balance, Ad-Tolerance, Outrage-Penalty, Echo-Chamber-Penalty). Live-Vorschau: ein kleiner Feed rechts zeigt, wie sich der erste Post-Satz ändert. „Testen mit deinen Daten" simuliert 10 Wochen mit den neuen Regeln und zeigt den Effekt.

## 13. Didaktische Zwischenreflexionen

Es gibt genau drei Reflexions-Momente, alle in-Spiel:

1. **Halbzeit Tag 1** (nach W4): 3 offene Textfragen, gespeichert in `reflections`. „Was hat dich heute überrascht?" „Hast du schon Muster erkannt?" „Was würdest du in deinem eigenen Leben anders machen?"
2. **Übergang Tag 2 → 3** (nach W18): Visualisierung bisheriger Daten + 3 Fragen.
3. **Abschluss Tag 3**: „Medien-Manifest" — die SuS schreiben 5 Leitsätze für sich selbst, exportieren sie als HTML.

Die Lehrkraft kann die Reflexionen nicht zentral einsehen (keine Serverkomponente), sie bleiben beim Lernenden. Freiwillige Abgabe per Export möglich.

## 14. README für die Lehrkraft

In `README.md` im Hauptverzeichnis:
- Kurzbeschreibung
- Installations-Anleitung („ZIP entpacken, index.html doppelklicken")
- iPad-Hinweis (Safari nutzen, keine privaten Tabs, evtl. Dateien-App nötig)
- Pädagogische Hinweise (Reflexionsgespräch-Vorschläge am Ende jedes Tages)
- Troubleshooting (localStorage, Browser-Kompatibilität)
- Ethik- und Inhaltswarnung-Hinweis für die Lehrkraft: Welche Themen wann auftauchen, damit die Lehrkraft vorbereitet ist.

## 15. Entwicklungs-Phasen für Claude Code

**Phase 1 — Gerüst (ca. 1/4 der Arbeit):** Projektstruktur, Grundlayout, Navigation, State-Management, 1 Woche spielbar mit 10 Test-Posts und einfachem Algorithmus.

**Phase 2 — Content (ca. 1/3 der Arbeit):** Die ~400 Posts, Charaktere, Events generieren. Story für 26 Wochen schreiben. Inhaltswarnungs-Tags setzen.

**Phase 3 — Mechaniken (ca. 1/4 der Arbeit):** Ads, Bots, Discord-Gilden, Wahl-Event, Shitstorm, Rabbit Hole.

**Phase 4 — Jahresrückblick & Sandbox (ca. 1/6 der Arbeit):** die beiden „Wow-Momente" — hier darf es aufwendig und animiert werden.

**Phase 5 — Polish & Test:** iPad-Test, Touch-Interaktionen, localStorage-Resilienz, README schreiben, Bugs fixen.

## 16. Abnahmekriterien

Das Spiel ist fertig, wenn:
- [ ] 3 SuS es unabhängig 3 Tage ohne Hilfe durchspielen könnten
- [ ] iPad (Safari) und Chrome/Firefox auf Windows/Linux spielbar
- [ ] Spielstand überlebt Browser-Neustart
- [ ] Alle Inhaltswarnungen greifen, alle Opt-outs funktionieren
- [ ] Jahresrückblick funktioniert datenbasiert, nicht mit Platzhaltern
- [ ] Sandbox-Modus verändert den Feed sichtbar
- [ ] README vollständig, Beratungsangebote verlinkt
- [ ] Keine externen Ressourcen werden zur Laufzeit geladen
- [ ] Keine echten Markennamen, keine echten Personen
