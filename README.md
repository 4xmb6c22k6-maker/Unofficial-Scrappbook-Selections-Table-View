# 🧩 Scrappbook Kommentar-Manager (Inoffiziell)

Ein inoffizielles Browser-Add-on für [Scrappbook](https://scrappbook.de), das Kommentare und Favoriten aus einer Auswahl in einer übersichtlichen Tabellenansicht darstellt.  
Damit können alle Bilder, Kommentare und Likes schnell verglichen, sortiert und exportiert werden (z. B. als CSV oder Markdown-Datei).

> ⚠️ **Hinweis:** Dieses Projekt befindet sich noch in der Entwicklung. Da es außschließlich mit KI erstellt wurde können noch Fehler auftreten oder sich Funktionen unerwartet verhalten.

---

## 🚀 Funktionen

- Zeigt alle Bilder einer Scrappbook-Kollektion als Tabelle mit:
  - Bildvorschau
  - Kommentar
  - Favoriten-Status ❤️
  - Download-Button
- Export als **CSV**, **Markdown** oder **Textdatei**
- Kopieren von Bildnamen und Kommentaren mit einem Klick
- Option zum automatischen Laden aller Bilder aus dem Grid
- Sortierbare Spalten und einfache Navigation
- Keine externen Bibliotheken oder Tracker – reines, lokales JavaScript

---

## 🧩 Installation (Entpackte Erweiterung)

1. Lade dieses Repository als ZIP-Datei herunter direkt über den GitHub-Button:
   - Klicke oben rechts auf **Code → Download ZIP**
   - Entpacke die ZIP-Datei an einen beliebigen Ort auf deinem Computer.

2. Öffne **Google Chrome** und gehe zu:
   ```
   chrome://extensions/
   ```

3. Aktiviere oben rechts den **Entwicklermodus** (Schalter umlegen).

4. Klicke auf **„Entpackte Erweiterung laden“** und wähle den Ordner aus, in dem sich die Dateien  
   `manifest.json`, `content.js` und `styles.css` befinden.

5. Die Erweiterung erscheint nun in deiner Liste – sie wird automatisch auf  
   [`https://builder.scrappbook.de`](https://builder.scrappbook.de) aktiv, wenn du dort eine Kollektion öffnest.

---

## 🧰 Verwendung

1. Öffne eine Kollektion unter  
   [`https://builder.scrappbook.de/#/collection/`](https://builder.scrappbook.de/#/collection/)

2. Warte, bis oben rechts in der Button-Leiste der neue Button  
   **„Tabellenansicht“** erscheint.

3. Klicke ihn an, um zur Tabellenansicht zu wechseln.

4. Du kannst jetzt:
   - Kommentare und Namen kopieren
   - Exportieren (CSV / Markdown / Text)
   - Bilder direkt herunterladen
   - Wieder zur Original-Ansicht wechseln

---

## 🐞 Bekannte Einschränkungen & Bugs

- Bei sehr großen Kollektionen kann das automatische Nachladen aller Bilder etwas dauern.
- Die Tabellenansicht erkennt manchmal nicht sofort den Wechsel zwischen Kollektionen.
- Das Layout kann sich ändern, wenn Scrappbook seine Oberfläche anpasst.
- Die Vollbildansicht von Bildern funktioniert manchmal nicht.

> Diese Version ist **nicht final**. Fehlerberichte oder Verbesserungsvorschläge sind willkommen!

---

## ⚖️ Rechtlicher Hinweis

Dieses Projekt ist ein **inoffizielles Tool** und steht **in keiner Verbindung zu Scrappbook oder PhotoStore24**.  
Es nutzt ausschließlich die öffentlich zugängliche Weboberfläche und API-Endpunkte, um bestehende Inhalte anzuzeigen.

Alle Marken- und Produktnamen sind Eigentum ihrer jeweiligen Inhaber.

---

## 📄 Lizenz

Dieses Projekt steht unter der **MIT-Lizenz** – du darfst den Code frei verwenden, verändern und teilen,  
solange der Lizenzhinweis erhalten bleibt.

Siehe [LICENSE](./LICENSE) für den vollständigen Text.
