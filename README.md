# Der Algorithmus — Lernspiel zu Social Media & Filterblasen

Ein interaktives, webbasiertes Lernspiel zum Thema **Algorithmen, Filterblasen und Radikalisierung**. Zielgruppe: 12. Klasse. Einsatz: 3-tägige Projektwoche „Demokratiebildung".

## Schnellstart

**Einfachste Variante:** Doppelklick auf `index.html`. Fertig. Die App läuft direkt im Browser, ohne Server.

Das funktioniert, weil alle JSON-Daten und der JS-Code in zwei gebündelten Dateien (`data/data.bundle.js`, `js/app.bundle.js`) vorliegen — keine `fetch()`-Requests, die Chrome/Edge auf `file://` blockieren würden.

> **iPad (Safari):** Dateien in die **Dateien-App** legen, `index.html` öffnen. **Keine privaten Tabs** — der Spielstand im `localStorage` würde sonst beim Schließen verloren gehen.

### Alternative: Server (für Dev / iPad-Klassensatz)

Wenn du am Code arbeitest oder mehrere iPads per WLAN bespielen willst:
```
cd der-algorithmus
python -m http.server 8080
```
Dann `http://localhost:8080` im Browser. Vom iPad aus: die IP des Laptops, z.B. `http://192.168.1.42:8080`.

### Bundle neu bauen (nur wenn du Code änderst)

Bei Änderungen an `js/*.js` oder `data/*.json` den Bundle regenerieren:
```
python tools/make_bundle.py
```
Die Originalquellen bleiben editierbar — die Bundles sind nur der file://-Auslieferungszustand.

## Pädagogischer Rahmen

### Tag 1 — Onboarding & erste Wochen (W0–W8)
Die SuS legen einen fiktiven Account an und spielen die ersten 9 In-Game-Wochen. Inhalte bleiben weitgehend harmlos (Lifestyle, Gaming, Uni, erste politische Posts). Nach W4 gibt's eine **erste Zwischenreflexion** im Spiel — 3 offene Fragen, die im Save gespeichert werden.

**Reflexionsgespräch am Ende von Tag 1 (Vorschlag):**
- „Was ist dir im Feed zuerst aufgefallen?"
- „Welche Accounts hast du schon geblockt oder gemutet, welche nicht?"
- „Hat dich dein Feed überrascht?"

### Tag 2 — Komplexität & Verschärfung (W9–W18)
Neue Mechaniken schalten sich frei:
- **Anzeigen** (politische und kommerzielle, immer gekennzeichnet)
- **Bots** und Fake-Accounts folgen
- **Gilden** (Discord-ähnlich) — darunter eine radikalere
- **Blick hinter den Algorithmus** — zeigt, welche Tags das System gelernt hat
- **Shitstorm-Check** — einer der eigenen Posts wird viral (positiv oder negativ)
- **Deepfake-Episode**
- **Zwischenreflexion** nach W18

**Inhaltswarnungen greifen ab hier.** Jede Gilde und jeder Post mit problematischem Inhalt wird mit Overlay-Warnung eingeleitet. Die SuS können zu jedem Moment „Überspringen" wählen.

**Reflexionsgespräch am Ende von Tag 2 (Vorschlag):**
- „Hast du Posts gesehen, die du lieber nicht gesehen hättest?"
- „Welche Gilden hast du betreten, welche nicht — warum?"
- „Der Algorithmus zeigt dir, was er über dich ‚weiß'. Überrascht dich das?"

### Tag 3 — Analyse & Gestaltung (W19–W26 + Sandbox)
- **Wahlkampf** in der fiktiven Stadt Greifshafen. Vier fiktive Parteien, Feed je nach Filterblase extrem verschieden.
- **Wahltag (W22)**: objektives Ergebnis vs. das, was der Feed vermittelt hat.
- **Hate-Incident** in einer Gilde.
- **Jahresrückblick** („Wrapped"): 9 Slides, datengestützt, animiert.
- **Sandbox**: SuS bauen ihren eigenen Algorithmus per Slider (keine Programmierung). Live-Vorschau + 10-Wochen-Simulation.
- **Medien-Manifest**: 5 eigene Leitsätze, als HTML exportierbar.

**Abschlussgespräch (Vorschlag):**
- „Was hat dein Jahresrückblick gezeigt, das dich überrascht hat?"
- „Welche Regeln hast du in der Sandbox gewählt — und warum?"
- „Was nimmst du für dein echtes Social-Media-Leben mit?"

## Inhaltliche Leitplanken

Das Spiel zeigt bewusst auch schwierige Inhalte — fiktiv, aber in Form und Ton realistisch.

**Was vorkommt (mit Warnhinweis):**
- rechtsextreme und verschwörungsideologische Rhetorik
- antifeministische / Incel-nahe Rhetorik
- Hate Speech als fiktives Zitat
- graduelle Radikalisierung in einer fiktiven Gilde

**Was nicht vorkommt:**
- explizite Gewalt, Selbstverletzung, Suizid
- Darstellungen Minderjähriger in irgendeiner Form
- echte Personen oder Logos

Alle Accounts, Parteien, Städte und Influencer sind fiktiv. „Greifshafen", „Streem", die Parteien und alle Personen sind erfunden.

## Technisches

- **Pures HTML + CSS + Vanilla-JavaScript (ES-Modules).** Kein Build, kein npm.
- Spielstand liegt in `localStorage` unter dem Key `algo_save_v1`.
- Daten in `data/*.json`, Code in `js/*.js`, Stile in `css/*.css`.
- Keine externen CDN-Aufrufe zur Laufzeit.
- Autosave nach jeder Aktion.

## Troubleshooting

**Spielstand ist weg.**  
Vermutlich Privat-Modus oder Browser-Cache gelöscht. Im Normalmodus funktioniert es. Über „Einstellungen" → „Spielstand exportieren (JSON)" kann gespeichert werden.

**iPad zeigt leeren Bildschirm.**  
Vermutlich können die JSONs nicht geladen werden. Lösung: Server vom Lehrer-Laptop nutzen (siehe oben), oder die SuS unter Chrome auf dem Windows-PC spielen lassen.

**Dev-Check:**  
Öffne `tools/validate_data.html` — zeigt an, ob alle JSON-Dateien korrekt geladen werden können und wie viele Posts/Charaktere vorhanden sind.

## Hilfreiche Anlaufstellen (in-Spiel verlinkt)

- **bpb.de** — Bundeszentrale für politische Bildung  
- **klicksafe.de** — Infos für sichere Mediennutzung  
- **hateaid.org** — Hilfe bei digitaler Gewalt  
- **beratung-gegen-rechtsextremismus.de**  
- **Telefonseelsorge: 0800 111 0 111** (kostenlos, 24/7)

## Lizenz / Wiederverwendung

Das Spiel entstand im Rahmen der Projektwoche-Vorbereitung. Nicht kommerziell nutzen, Quelle angeben.
