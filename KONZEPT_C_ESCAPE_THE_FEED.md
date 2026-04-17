# Konzept C: „Escape the Feed" — Bauanleitung für Claude Code

> **Zweck dieser Datei:** Vollständiges Briefing für die Entwicklung eines interaktiven, webbasierten Lernspiels als **modulare Rätselserie** zum Thema **Demokratiekompetenz in Gaming und Social Media**. Zielgruppe: Schülerinnen und Schüler der 12. Klasse eines Gymnasiums. Einsatz: 3-tägige Projektwoche „Demokratiebildung — Reden, Posten, Mitmischen", Unterthema „Gaming und Social Media". Lehrkraft betreut, liefert aber keinen Input.

---

## 1. Pitch in einem Satz

Die SuS wachen eines Morgens auf und merken, dass „ihr" Feed aus den Fugen geraten ist — in 10 abgeschlossenen Kapiteln voller Mini-Spiele, Rätsel und Detektivaufgaben arbeiten sie sich durch die Mechaniken moderner Social-Media- und Gaming-Welt, jeden Tag mit einem Boss-Level als Finale, bis sie am Ende ihren Feed „zurückerobert" haben.

## 2. Lernziele

Nach der Projektwoche können die SuS:

- Deepfakes und manipulierte Bilder an typischen Merkmalen erkennen
- Filterblasen und Echokammern erkennen und reflektieren
- Hate Speech identifizieren, einordnen und Reaktionsstrategien benennen
- subtile politische Einflussnahme in Memes und Kurzvideos entschlüsseln
- Radikalisierungsmuster in Gaming-Chat-Communities erkennen
- demokratieförderliche Medienformate selbst gestalten (Memes, Posts, Gegenrede)
- Quellen prüfen und Informationen kontextualisieren

## 3. Rahmen & Setting

- **Modus:** Singleplayer, ein Gerät pro SuS
- **Plattform:** Lokale Web-App, per Doppelklick auf `index.html`
- **Zielgeräte:** Windows-PCs **und** iPads (Safari). Touch + Maus.
- **Dauer:** 3 Schultage à ca. 6 Zeitstunden. Pro Tag 3–4 Kapitel + 1 Boss-Level.
- **Leistungsnachweis:** Keiner — rein formativ. Motivation durch Varianz, Belohnungen, Story.
- **Sprache:** Deutsch
- **Inhaltliche Schärfe:** Realistisch und direkt, mit klaren Inhaltswarnungen. Das Spiel erlaubt es besonders gut, heikle Themen in geschützten, klar abgegrenzten Kapiteln zu behandeln.
- **Rahmenhandlung:** Die Spieler:in ist eine 17-jährige Person in Greifshafen (fiktive deutsche Großstadt), die eines Morgens in einem „zerbrochenen" Feed aufwacht. Jemand — „der Architekt" — hat das System manipuliert. Um den Feed zu befreien, müssen Aufgaben gelöst werden.

## 4. Kapitelstruktur (3 Tage × ~3-4 Kapitel + Boss)

### Tag 1 — „Das System verstehen"

- **Kapitel 0 — Wake up (20 min):** Intro-Cutscene. Charakter-Avatar wählen. Einführung in die Meta-Navigation.
- **Kapitel 1 — Deepfake-Detektiv (90 min):** 8 Bild- und Videodateien. Erkenne das Fake. Werkzeuge: Zoom, Metadaten, umgekehrte Bildsuche (simuliert), Artefakt-Overlay. Steigerung von leicht bis knifflig.
- **Kapitel 2 — Bubble-Check (90 min):** Die SuS sehen drei fiktive Feeds aus drei verschiedenen Blasen und müssen rekonstruieren, welche Person welchen Feed sieht. Lernen über Algorithmen-Profile.
- **Kapitel 3 — Quellen-Quiz (60 min):** 10 News-Schnipsel, jeweils mit 3 möglichen Quellen. Welche ist vertrauenswürdig? Warum? Kurze Begründungen per Multiple-Choice + freie Notiz.
- **Boss 1 — „Der Morgen-Feed" (60 min):** Großes Rätsel, das alle drei Themen vereint. Die SuS bekommen einen manipulierten Feed voller Deepfakes, Filterblasen-Nachrichten und dubioser Quellen, müssen ihn aufräumen und die ersten „verlorenen Follower" zurückholen (Story-Element).

### Tag 2 — „Das System entlarven"

- **Kapitel 4 — Hate Speech Moderator (90 min):** Die SuS übernehmen die Rolle einer Community-Moderator:in. Entscheidungen: löschen / stehen lassen / melden / Gegenrede posten. Fälle reichen von eindeutig strafbar bis grauzone. Mit jeweiliger Erläuterung der Rechtslage (NetzDG-ähnlicher Rahmen, kurz erklärt). **Pflicht-Inhaltswarnung.**
- **Kapitel 5 — Meme-Labor (60 min):** Subtile politische Botschaften in Memes entschlüsseln. 15 Memes, die SuS müssen Symbole, Dogwhistles, Framing erkennen und zuordnen. Kontextualisierung ist Lernziel.
- **Kapitel 6 — Gaming-Chat-Crisis (120 min):** Lang. Die SuS treten einer fiktiven Gaming-Gilde „Eisenwolf" auf der Plattform Arenyx bei. Harmlos wirkend. Über den Verlauf beobachten sie graduelle Radikalisierung in Live-Chats, müssen Muster erkennen (Witze, die aufhören Witze zu sein; „ironische" Aussagen, die ernster werden; Grenzüberschreitungen, die normalisiert werden). Interaktive Entscheidungen: schweigen, widersprechen, Community-Leitung benachrichtigen, verlassen. **Pflicht-Inhaltswarnung, sanfte Variante verfügbar.**
- **Boss 2 — „Die Welle" (60 min):** Eine Desinformationskampagne rollt durch den Feed. Die SuS müssen die Kampagne in 30 Minuten (Spielzeit) stoppen — Quellen prüfen, Gegenrede platzieren, richtige Accounts melden. Zeitdruck als Mechanik, inhaltlich sauber.

### Tag 3 — „Das System gestalten"

- **Kapitel 7 — Influencer-Ökonomie (60 min):** Hinter die Kulissen eines fiktiven Influencer-Accounts schauen. Welche Posts sind Werbung? Welche politische Einflussnahme? Was kostet Reichweite? Wer finanziert wen? Spiel mit echten Daten-Strukturen (fiktiv befüllt).
- **Kapitel 8 — Meme-Werkstatt (90 min):** Erstmals aktiv: Die SuS erstellen selbst demokratieförderliche Memes. Mini-Grafik-Editor. Vorlagen, Text-Baukasten, kleine Asset-Bibliothek. Output als PNG exportierbar.
- **Kapitel 9 — Gegenrede-Simulator (60 min):** Die SuS reagieren auf Hate-Kommentare. Das Spiel gibt Feedback auf ihre Formulierungen (regelbasiert). Lernen: Wann reagieren, wann nicht, wie. Keine KI — Checklisten-basierte Rückmeldung.
- **Boss 3 — „Das Finale" (90 min):** Großes integratives Szenario. In einer fiktiven Wahlnacht in Greifshafen kippt die Stimmung. Die SuS müssen als Medien-Bürger:innen reagieren: Falsch-Informationen entlarven, Gegenrede platzieren, Freund:innen warnen. Mehrere Ausgänge je nach Handeln.
- **Abschluss — „Das Manifest" (45 min):** Jede:r SuS schreibt ein persönliches „Medien-Manifest" (5 Leitsätze), exportierbar als HTML/PDF.

### Bonus-Kapitel (für Schnelle)

- **Bonus A — Algorithmus-Sandbox:** Spiel mit Gewichtungen eines simulierten Empfehlungssystems.
- **Bonus B — Deepfake-Schmiede:** Selbst ein „Fake" bauen (stark geleitet, kein missbrauchbares Werkzeug) — um besser zu verstehen, wie sie entstehen.
- **Bonus C — Gaming-Radio:** 15-minütiges interaktives Hörspiel mit mehreren Enden, über eine Jugendliche, die in einer Gilde radikalisiert wird.

## 5. Projektstruktur

```
escape-the-feed/
├── index.html                  # Haupt-Menü & Kapitel-Auswahl
├── README.md
├── css/
│   ├── main.css                # Globales Theme
│   ├── hub.css                 # Kapitel-Auswahl
│   ├── chapters.css            # Kapitel-spezifisch
│   ├── boss.css                # Boss-Level
│   └── animations.css
├── js/
│   ├── main.js                 # Einstieg, Kapitel-Router
│   ├── state.js                # globaler Gamestate
│   ├── hub.js                  # Haupt-Menü, Fortschritt
│   ├── warnings.js             # Inhaltswarnungen-System
│   ├── chapters/
│   │   ├── ch00_wake.js
│   │   ├── ch01_deepfake.js
│   │   ├── ch02_bubble.js
│   │   ├── ch03_sources.js
│   │   ├── ch04_hate_mod.js
│   │   ├── ch05_meme_lab.js
│   │   ├── ch06_gaming_chat.js
│   │   ├── ch07_influencer.js
│   │   ├── ch08_meme_werkstatt.js
│   │   ├── ch09_gegenrede.js
│   │   ├── boss1_morgenfeed.js
│   │   ├── boss2_welle.js
│   │   ├── boss3_finale.js
│   │   ├── bonus_algo.js
│   │   ├── bonus_deepfake.js
│   │   └── bonus_hoerspiel.js
│   └── shared/
│       ├── ui.js               # wiederverwendete UI-Komponenten
│       ├── feedback.js         # Regelbasiertes Textfeedback
│       └── animations.js
├── data/
│   ├── chapters/               # ein .json pro Kapitel mit Inhalten
│   ├── characters.json         # wiederkehrende Figuren
│   └── warnings.json
├── assets/
│   ├── img/                    # SVG-Grafiken, Meme-Vorlagen
│   ├── audio/                  # für Hörspiel und Atmo
│   └── animations/
└── tools/
    └── debug.html              # Lehrkraft-Debug-Ansicht
```

## 6. Technologie-Stack

- **Pures HTML + CSS + Vanilla JavaScript (ES-Modules).** Kein Build, kein npm.
- **Keine CDNs zur Laufzeit.** Alles lokal.
- **localStorage** für Spielstand.
- **SVG-Grafiken** überall. Wenige Raster-Bilder, wenn dann optimiert (WebP/PNG < 200 KB).
- **Audio:** Für Bonus-Hörspiel und optional Atmo. Als .mp3/.ogg lokal. Pro Kapitel max. 2 MB.
- **Animationen:** CSS-Keyframes + JS-gesteuertes SVG. Keine Videodateien.
- **Canvas** für den Meme-Editor (Kapitel 8).
- **Touch + Maus** durchgehend. Alle Interaktionen Pflicht-testen auf iPad.

## 7. Hub / Haupt-Menü

Das Hub ist die zentrale Navigation. Optisch als zerbrochener Handy-Bildschirm designed: Am Anfang sind nur Kapitel 0 + 1 sichtbar, der Rest ist „verschlüsselt" dargestellt (ikonisches Glitch-Element). Mit jedem abgeschlossenen Kapitel wird ein weiteres freigeschaltet — ein kleines Stück des „Feeds" wird wiederhergestellt.

Features:
- Kapitel-Karten mit Status (verschlossen / verfügbar / abgeschlossen / Perfekt-Score)
- Fortschrittsleiste
- „Letzter Save"-Info
- Reset-Knopf im Einstellungsmenü
- Zugriff auf Bonus-Kapitel ab Abschluss des jeweils dritten Kapitels am selben Tag
- Direktlink zu Inhaltswarnungen-Erklärung

Das Hub sollte auch spürbar „heilen": visueller Fortschritt (kaputte Pixel werden ganz, Farbe kommt zurück). Kleines aber konstantes Belohnungsgefühl.

## 8. Die Kapitel im Detail

### Ch00 — Wake up

**Ziel:** Einstieg, Emotion, Setup.
**Ablauf:** Animierte Cutscene (SVG): Morgen, Handy-Weckton, Bildschirm zerbrochen. Avatar-Auswahl (6 Vorlagen, Customization von Hauttöne/Haare). Der „Architekt" meldet sich anonym per Nachricht: „Dein Feed gehört jetzt mir. Wenn du ihn zurückwillst, musst du lernen, wie er funktioniert." → Freischaltung Kapitel 1.

### Ch01 — Deepfake-Detektiv

**Ziel:** Visuelle Manipulation erkennen.
**Mechanik:** 8 Medien-Fälle. Pro Fall: Bild/Video anschauen, 3 Werkzeuge benutzen (Zoom, Metadaten, Umkehrsuche), Urteil fällen („echt / manipuliert / unklar") + Begründung aus Baukasten wählen.
**Schwierigkeitskurve:** Fall 1–2 offensichtlich (sichtbare Artefakte), Fall 3–5 subtil, Fall 6–8 anspruchsvoll (Metadaten müssen gelesen, Kontext geprüft werden).
**Assets:** 8 SVG-Grafiken oder SVG+PNG-Kompositionen mit kontrollierten Artefakten.

### Ch02 — Bubble-Check

**Ziel:** Filterblasen verstehen.
**Mechanik:** 3 fiktive Personen-Profile (kurze Bio-Karten). Dazu 3 Feeds (je 12 Posts). Aufgabe: welche Person sieht welchen Feed? Posts untereinander vergleichen, Muster erkennen. Nach der Zuordnung: Erklärung, warum der Algorithmus so entscheidet.
**Zweite Runde:** Ein neuer Post auf jedem Feed — was empfiehlt der Algorithmus dieser Person als nächstes?

### Ch03 — Quellen-Quiz

**Ziel:** Quellenkritik.
**Mechanik:** 10 Nachrichtentexte, jeweils mit 3 angeblichen Quellen. SuS wählen die vertrauenswürdigste und begründen per Textfeld. Feedback sofort, mit Erklärung. Inhalte von harmlos (wissenschaftliche Studie) bis heikel (politische Behauptung).

### Ch04 — Hate Speech Moderator

**Ziel:** Hassrede erkennen und einordnen.
**Mechanik:** Die SuS sitzen am „Moderations-Desk". 20 Kommentare laufen ein. Pro Kommentar: löschen, stehen lassen, melden (an Plattform / an Polizei), Gegenrede posten. Zeitdruck moderat (30 Sekunden pro Kommentar, pausierbar).
**Kategorien:** strafrechtlich relevant (Volksverhetzung, Beleidigung), plattform-relevant (Hate Speech i.S.d. Nutzungsbedingungen), grenzwertig (aggressiv, aber legal), harmlos (Meckerei).
**Nach jedem Kommentar:** Bewertung der Entscheidung, kurze Rechtsinfo (ohne Rechtsberatung zu sein).
**Pflicht-Inhaltswarnung:** Kommentare enthalten echte Hassrede-Muster (fiktiv formuliert).

### Ch05 — Meme-Labor

**Ziel:** Subtile politische Codes in Memes entschlüsseln.
**Mechanik:** 15 Memes. Pro Meme: „Was wird hier transportiert?" (mehrere Auswahlmöglichkeiten), „Welche Zielgruppe?" (Einschätzung), „Problematische Elemente?" (Checkbox-Liste). Nach jedem Meme eine Kontextualisierung.
**Besondere Sorgfalt:** Hier werden teilweise echte Dogwhistle-Symbole erklärt. Die Darstellung ist *immer aufklärerisch*, nie affirmativ. Am Ende Glossar.

### Ch06 — Gaming-Chat-Crisis

**Ziel:** Graduelle Radikalisierung erkennen.
**Mechanik:** Die SuS treten einer fiktiven Gaming-Gilde bei. Live-Chat-Simulation (die Nachrichten laufen scheinbar in Echtzeit ein, aber mit definiertem Skript). Die SuS können schreiben, aber nur aus vorgegebenen Antworten wählen.
**Verlauf:** Kapitel simuliert ~4 Wochen Gildenleben in ~90 Spielminuten. Anfangs harmlos (Zocken, Witze), dann häufiger „ironische" Grenzüberschreitungen, später offene Aussagen.
**Wichtige Entscheidungen:**
- Wie reagiere ich auf einen sexistischen „Scherz" des Gilden-Anführers?
- Schweige ich bei einer rassistischen Bemerkung?
- Lade ich mir den Server-Bot herunter, den alle benutzen?
- Gehe ich raus, wenn es mir zu viel wird?

**Mehrere Ausgänge** je nach Verlauf. Kein „falsches" Ende — aber reflektierendes Schlusswort.
**Pflicht-Inhaltswarnung, Opt-out und sanfte Variante verfügbar.**

### Ch07 — Influencer-Ökonomie

**Ziel:** Kommerzielle und politische Einflussnahme in Influencer-Welten verstehen.
**Mechanik:** Explore-Modus. Die SuS erkunden das Profil der fiktiven Influencerin „Mira Holt" (2,5 Mio. Follower). Sichtbar: ihre Posts, ihr Kalender, Vertragsauszüge (fiktiv), Einnahmequellen. Aufgabe: Erkenne, welche Posts deklarierte Werbung sind, welche versteckte Werbung, welche politisch instrumentalisiert. Am Ende Bewertung + Auflösung.

### Ch08 — Meme-Werkstatt

**Ziel:** Selbst demokratieförderliche Inhalte schaffen.
**Mechanik:** Mini-Meme-Editor (Canvas-basiert). Vorlage wählen (10 Optionen), eigenen Text einfügen, kleine SVG-Assets platzieren. Ausgabe als PNG exportierbar.
**Task:** Drei Aufgaben — „Mache ein Meme für mehr Beteiligung an der Kommunalwahl", „Mache ein Meme gegen Hass im Netz", „Freies Thema rund um Demokratie".
**Feedback-Phase:** Regelbasiertes Feedback zu Klarheit, Ton, Inklusion. Keine Zensur, nur Impulse.

### Ch09 — Gegenrede-Simulator

**Ziel:** Konstruktive Reaktion auf Hass lernen.
**Mechanik:** Die SuS bekommen 8 fiktive Hass-Kommentare präsentiert. Antwortoptionen: A) Baukasten mit vorformulierten Bausteinen, B) freie Textantwort. Das Spiel bewertet regelbasiert: sachlich? adressiert den Inhalt? bleibt respektvoll? zieht Grenzen? Keine KI, klare Prüf-Regeln (Sentiment-Heuristik, Keyword-Check, Länge).

### Boss 1 — „Der Morgen-Feed"

Großer Feed (~30 Posts), der in 45 Minuten bereinigt werden soll. Jeder Post muss bewertet werden (Deepfake? Fake News? Bubble-Inhalt? OK?). Timer moderat, pausierbar. Am Ende Auswertung und Story-Fortschritt.

### Boss 2 — „Die Welle"

Desinformationskampagne in Echtzeit. 30 Spielminuten. Quellen prüfen, Gegenrede, melden. Mehrere parallele Fäden — das Spiel wird kurz hektisch, aber fair. Keine Zeitüberschreitungs-„Verluste", nur schlechtere Outcomes.

### Boss 3 — „Das Finale"

Wahlnacht. Integriert alle bisherigen Kompetenzen. Mehrere Schauplätze: eigener Feed, Gaming-Chat, Nachrichten-Dashboard. Die SuS navigieren zwischen ihnen, reagieren, entscheiden. Am Ende: „Dein Feed ist wiederhergestellt. Aber er ist jetzt deiner — weil du weißt, wie er funktioniert."

### Abschluss — Das Manifest

Geleitetes Schreiben: 5 Leitsätze. Vorlage: „Ich werde …", „Ich werde nicht …", „Ich erkenne …", „Ich reagiere mit …", „Ich bewahre …". Als HTML-Export, druckbar.

### Bonus-Kapitel

- **Bonus A — Algorithmus-Sandbox:** siehe Konzept A §12.7 — kleinere Version.
- **Bonus B — Deepfake-Schmiede:** Stark geleitete, harmlose Übung. SuS erhalten ein Portraitbild (fiktiv, SVG-basiert) und können einzelne Elemente manipulieren (Mund, Blickrichtung, Bildzuschnitt) mit dem Effekt auf die Wahrnehmung erklärt.
- **Bonus C — Gaming-Radio-Hörspiel:** 15 min Audio, an 3 Stellen verzweigend. Hintergrund: Jugendliche in Gaming-Gilde erzählt aus der Ich-Perspektive.

## 9. State-Schema (localStorage)

Key `escape_feed_save_v1`:

```javascript
{
  meta: { version: 1, createdAt, lastSavedAt },
  character: { name, avatar, ... },
  progress: {
    ch00: "done", ch01: "done", ch02: "in_progress", ...
    boss1: "done", boss2: "locked", ...
  },
  scores: { ch01: { accuracy: 0.75, time: 4320 }, ... },
  chapterState: {
    ch06: { decisionsLog: [...], exitTimestamp: ... },
    ch08: { memes: [blobURLs oder dataURIs] }
  },
  warnings: { acknowledged: { ch04: true, ... }, softModeFor: [ch06] },
  manifesto: { line1: "...", ... },
  unlockedBonus: ["bonusA"]
}
```

Autosave nach jeder Aktion. Mehrere Savegames möglich (z.B. Parallel-Nutzung im Klassenraum).

## 10. UI-Design & Ton

- **Look:** Cybermystery-Ästhetik. Glitch-Effekte beim Wechsel, saubere moderne UI innerhalb der Kapitel. Jedes Kapitel kann seinen eigenen Look haben (Hate-Moderator: Dashboard-Stil; Meme-Labor: Post-it-Wand; Gaming-Chat: Discord-artig), aber Hub und Übergänge verbindend.
- **Farbschema:** Dunkelmodus Default. Neon-Akzente (Magenta, Cyan). Warnung: Rot.
- **Typografie:** System-Fonts. Monospace für die „Architekt"-Nachrichten (leicht bedrohlich).
- **Ton:** Mystery-Thriller-Anflug mit Jugend-Ansprache. Das Spiel duzt die SuS. Humor erlaubt, aber nicht flapsig bei heiklen Themen.
- **Animationen:** Dosiert einsetzen. Übergänge zwischen Kapiteln dürfen spektakulär sein, innerhalb eines Kapitels eher zurückhaltend.

## 11. Inhaltswarnungen & Leitplanken

- **Kapitel 4, 6 und Teile von Kapitel 5** bekommen Pflicht-Inhaltswarnung mit Opt-in.
- **Sanfte Variante** für Kapitel 6 (Gaming-Chat): abgemilderte Sprache, gleicher Lerninhalt. Wähl- und wechselbar.
- **Kein selbst-geschriebener Hass.** SuS können nie selbst Hassrede posten, nur vorgegebene Reaktionen wählen.
- **Keine operativen Anleitungen.** Bonus B („Deepfake-Schmiede") ist stark limitiert, erzeugt keine nutzbaren Fakes, sondern nur Lern-Demonstrationen mit sichtbaren Einschränkungen.
- **Beratungsangebote** im Hub verlinkt und am Ende jedes Tages eingeblendet: bpb.de, klicksafe.de, HateAid, Beratungsnetzwerk gegen Rechtsextremismus, Telefonseelsorge, Hilfe-Portal der Polizei.
- **Besondere Vorsicht Kapitel 6:** Hier besteht das größte Risiko, dass SuS sich persönlich angesprochen fühlen (vielleicht hat jemand in der Klasse schon radikalisierte Mitschüler oder Familienangehörige). Das Spiel bietet nach Abschluss Kapitel 6 eine sanfte Nachbesprechung an und verweist explizit auf Gesprächsmöglichkeiten mit Lehrkraft oder Beratungsstellen.

## 12. Story-Elemente & Figuren

**Der Architekt:** Namenloser Gegenspieler, kommuniziert per Glitch-Nachrichten. Bleibt bis zum Ende mysteriös. Finale-Twist: Der „Architekt" ist eine Personifikation des Algorithmus selbst — das Spiel endet mit der Erkenntnis, dass die SuS nun die Kontrolle übernommen haben.

**Wiederkehrende Nebenfiguren:**
- **Lin (16)** — Freund:in der Hauptfigur. Hilft in Kapitel 2 und 9.
- **Opa Willi** — Rentner, fällt auf Fake News herein. Wichtige Figur in Boss 2.
- **Mira Holt** — Influencerin (Kapitel 7).
- **KRONOS_99** — anonymer Gildenanführer (Kapitel 6). Kommt im Finale zurück.

**Alle Namen fiktiv.**

## 13. Entwicklungs-Phasen für Claude Code

**Phase 1 — Hub und Struktur:** Hauptmenü, Kapitel-Router, State-Management, Grundlayout. Glitch-Übergänge. Ein Dummy-Kapitel testweise spielbar.

**Phase 2 — Einzelne Kapitel-Engines:** Jedes Kapitel ist ein eigenes Mini-Spiel mit eigener Mechanik. Zuerst die technisch einfachen (Ch01, Ch03, Ch05), dann die komplexeren (Ch06 Chat-Simulation, Ch08 Meme-Editor).

**Phase 3 — Boss-Level:** Die drei Bosse zusammenbauen. Sie sind Kombinationen der Kapitel-Mechaniken und sollten erst gebaut werden, wenn die Kapitel stehen.

**Phase 4 — Content & Balance:** Inhalte befüllen, Schwierigkeitskurve testen. Reflexions-Texte schreiben.

**Phase 5 — Bonus-Kapitel:** Nur wenn Zeit ist. Das Hörspiel (Bonus C) braucht Audio-Produktion, am besten zuletzt.

**Phase 6 — Polish:** iPad-Test, Touch-Interaktionen, Animationen feinschleifen, README.

## 14. Konkrete Feature-Liste (kompakt)

- [x] Zentrales Hub mit visuellem Fortschritt („Feed heilt")
- [x] 10 Kapitel + 3 Boss-Level + Abschluss
- [x] 3 Bonus-Kapitel optional
- [x] Avatar-Erstellung
- [x] Inhaltswarnungs-System mit Opt-in und sanfter Variante
- [x] localStorage-Save mit Autosave
- [x] Export des „Manifests" als HTML
- [x] Export von Memes als PNG (Kapitel 8)
- [x] Touch + Maus überall
- [x] System-Fonts, keine externen Ressourcen zur Laufzeit
- [x] Beratungsangebote im Hub verlinkt
- [x] Debug-Werkzeug für Lehrkraft

## 15. README für die Lehrkraft

- Kurzbeschreibung + Projektplan (Tag 1/2/3)
- Installation: ZIP entpacken, `index.html` öffnen
- iPad-Hinweis (Safari, keine privaten Tabs)
- Zeit-Empfehlung pro Kapitel, Pausenvorschläge
- Inhaltswarnungen-Übersicht: welche Kapitel, welche Themen, welche Alternativen
- Empfehlung für Tagesabschluss-Gespräche (3–5 Impulsfragen pro Tag)
- Troubleshooting (localStorage, Browser, Audio)
- Liste aller Beratungsangebote mit Kontaktdaten
- Hinweis: Bei emotional belasteten SuS Gesprächsangebot, ggf. Schulsozialarbeit einbeziehen.

## 16. Abnahmekriterien

- [ ] Ein:e SuS kann 3 Tage durchspielen ohne Hilfe
- [ ] iPad (Safari) und PC gleichwertig spielbar
- [ ] Touch-Interaktionen in allen Kapiteln funktionieren
- [ ] Meme-Editor (Ch08) exportiert sauber als PNG
- [ ] Inhaltswarnungen greifen, sanfte Variante funktioniert
- [ ] Progression und Save/Load stabil
- [ ] Boss-Level integrieren vorherige Kapitel-Mechaniken sichtbar
- [ ] Manifest-Export als HTML funktioniert
- [ ] Keine externen Ressourcen zur Laufzeit
- [ ] Keine echten Markennamen, keine echten Personen
- [ ] README vollständig, Beratungsangebote aktuell

## 17. Besondere Design-Hinweise

- **Varianz ist der Trumpf.** Jedes Kapitel soll sich anders anfühlen. Das hält die Aufmerksamkeit über 3 Tage.
- **Belohnung und Fortschritt spürbar machen.** Das heilende Hub, kleine Animationen, freigeschaltete Bonus-Kapitel für Schnelle.
- **Das Spiel moralisiert nicht.** Es zeigt Mechanismen, stellt Fragen, gibt Werkzeuge. Die Schlüsse ziehen die SuS im Manifest selbst.
- **Konsequenz bei Beratungsangeboten.** Nicht nur am Ende, sondern überall dort, wo der Inhalt emotional werden könnte, einen dezenten Link zu Hilfe anbieten.
- **Story-Rahmen nicht zu eng.** Die SuS sollen ohne Story-Kontext jederzeit ein Kapitel wiederspielen oder ein Bonus-Kapitel starten können.
