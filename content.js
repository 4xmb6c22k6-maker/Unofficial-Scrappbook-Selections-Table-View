// Scrappbook Kommentar-Manager - Content Script
// Version 1.0

// Globale Variablen
let isTableView = false;
let allData = [];
let currentLanguage = 'de'; // Default

// i18n - Internationalization System
const i18n = {
  de: {
    ui: {
      tableView: 'Tabellenansicht',
      gridView: 'Originalansicht',
      export: 'Tabelle exportieren',
      exportFormat: 'Wähle das gewünschte Export-Format:',
      cancel: 'Abbrechen',
      copied: 'Kopiert!',
      noStatus: 'Kein Status',
      loading: 'Bitte warten...',
      excelCreating: 'Excel wird erstellt...',
      pdfCreating: 'PDF wird erstellt...',
      errorExcel: 'Fehler beim Erstellen der Excel-Datei: ',
      errorPdf: 'Fehler beim Erstellen der PDF-Datei: ',
      imagesConfirm: 'Nur {0} von {1} Bildern sind verfügbar.\n\nMöchtest du trotzdem exportieren?',
      imagesLoadedConfirm: 'Nur {0} von {1} Bildern sind geladen.\n\nMöchtest du trotzdem exportieren?',
      namePrompt: 'Name für diese Auswahl eingeben:',
      unnamedSelection: 'Unbenannte Auswahl',
      loadAllImages: 'Alle Bilder laden ({0}/{1})',
      imageNotAvailable: 'Bild nicht verfügbar.\n\nBitte verwende den "Alle Bilder laden" Button.',
      imageNotLoaded: 'Bild nicht geladen - klicke "Alle Bilder laden"'
    },
    table: {
      number: '#',
      status: 'Status',
      preview: 'Vorschau',
      imageName: 'Bildname',
      comment: 'Kommentar',
      done: '✓',
      doneHeader: 'Erledigt'
    },
    export: {
      exportedOn: 'Exportiert am: ',
      by: ' von ',
      byFilename: '_von_',
      excel: {
        title: 'Excel (XLSX) mit Bildern',
        desc: 'Bearbeitbar, sortierbar - inkl. Thumbnails'
      },
      pdf: {
        title: 'PDF mit Bildern',
        desc: 'Zum Archivieren & Drucken - inkl. Thumbnails'
      },
      markdown: {
        title: 'Markdown',
        desc: 'Für GitHub, Notion etc. (ohne Bilder)'
      },
      text: {
        title: 'Text',
        desc: 'Einfache Textdatei (ohne Bilder)'
      }
    }
  },
  en: {
    ui: {
      tableView: 'Table View',
      gridView: 'Grid View',
      export: 'Export Table',
      exportFormat: 'Choose your export format:',
      cancel: 'Cancel',
      copied: 'Copied!',
      noStatus: 'No Status',
      loading: 'Please wait...',
      excelCreating: 'Creating Excel...',
      pdfCreating: 'Creating PDF...',
      errorExcel: 'Error creating Excel file: ',
      errorPdf: 'Error creating PDF file: ',
      imagesConfirm: 'Only {0} of {1} images are available.\n\nDo you want to export anyway?',
      imagesLoadedConfirm: 'Only {0} of {1} images are loaded.\n\nDo you want to export anyway?',
      namePrompt: 'Enter name for this selection:',
      unnamedSelection: 'Unnamed Selection',
      loadAllImages: 'Load all images ({0}/{1})',
      imageNotAvailable: 'Image not available.\n\nPlease use the "Load all images" button.',
      imageNotLoaded: 'Image not loaded - click "Load all images"'
    },
    table: {
      number: '#',
      status: 'Status',
      preview: 'Preview',
      imageName: 'Image Name',
      comment: 'Comment',
      done: '✓',
      doneHeader: 'Done'
    },
    export: {
      exportedOn: 'Exported on: ',
      by: ' by ',
      byFilename: '_by_',
      excel: {
        title: 'Excel (XLSX) with Images',
        desc: 'Editable, sortable - incl. thumbnails'
      },
      pdf: {
        title: 'PDF with Images',
        desc: 'For archiving & printing - incl. thumbnails'
      },
      markdown: {
        title: 'Markdown',
        desc: 'For GitHub, Notion etc. (without images)'
      },
      text: {
        title: 'Text',
        desc: 'Simple text file (without images)'
      }
    }
  }
};

// i18n Helper-Funktion
function t(key, ...args) {
  const keys = key.split('.');
  let value = i18n[currentLanguage];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  // Falls nicht gefunden, fallback zu Deutsch
  if (!value) {
    value = i18n.de;
    for (const k of keys) {
      value = value?.[k];
    }
  }
  
  // String-Replacement für Platzhalter {0}, {1}, etc.
  if (typeof value === 'string' && args.length > 0) {
    args.forEach((arg, index) => {
      value = value.replace(`{${index}}`, arg);
    });
  }
  
  return value || key;
}

// Scrappbook-Sprache aus Tab-Text auslesen (einfacher und zuverlässiger!)
function detectScrappbookLanguage() {
  // Suche nach dem "Auswahlen" oder "Selections" Tab
  const selectionsTab = document.querySelector('.pt-selections.nav-link');
  
  if (selectionsTab) {
    const tabText = selectionsTab.textContent.trim().toLowerCase();
    const language = tabText === 'selections' ? 'en' : 'de';
    
    console.log('🌍 Scrappbook language detected:', language, '(tab text:', tabText + ')');
    
    // Speichere im chrome.storage nur wenn sich etwas geändert hat
    if (currentLanguage !== language) {
      currentLanguage = language;
      chrome.storage.local.set({ language: language });
      
      // Reload Tabelle falls geöffnet
      if (isTableView) {
        showTable(allData);
      }
    }
    
    return language;
  }
  
  // Fallback: Verwende gespeicherte oder Browser-Sprache
  console.log('⚠️ Selections tab not found yet');
  return null;
}

// Sprache laden beim Start - mit Retry-Logik
function loadLanguage() {
  // Lade gespeicherte Sprache aus chrome.storage
  chrome.storage.local.get(['language'], (result) => {
    if (result.language) {
      currentLanguage = result.language;
      console.log('🌍 Language loaded from storage:', currentLanguage);
    }
  });
  
  // Versuche Scrappbook-Sprache zu erkennen mit Retries
  let retries = 0;
  const maxRetries = 10;
  
  const tryDetectLanguage = () => {
    const detectedLang = detectScrappbookLanguage();
    
    if (detectedLang) {
      // Sprache erfolgreich erkannt
      currentLanguage = detectedLang;
      console.log('✅ Language detection complete:', currentLanguage);
    } else if (retries < maxRetries) {
      // Tab noch nicht geladen, versuche es nochmal
      retries++;
      console.log(`🔄 Retrying language detection (${retries}/${maxRetries})...`);
      setTimeout(tryDetectLanguage, 500);
    } else {
      // Max retries erreicht, verwende Fallback
      console.log('⚠️ Could not detect language from tab, using fallback');
      if (!currentLanguage) {
        const browserLang = navigator.language.toLowerCase();
        currentLanguage = browserLang.startsWith('de') ? 'de' : 'en';
        console.log('🌍 Using browser language as fallback:', currentLanguage);
      }
    }
  };
  
  // Starte Spracherkennung
  tryDetectLanguage();
}

// Lausche auf Sprachwechsel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'language_changed') {
    currentLanguage = message.language;
    console.log('🌍 Language changed to:', currentLanguage);
    
    // Reload Tabelle falls geöffnet
    if (isTableView) {
      showTable(allData);
    }
  }
});

// Warte bis Seite geladen
function init() {
  // Lade Sprache zuerst
  loadLanguage();
  
  // Prüfe ob wir in einer Collection sind
  if (!window.location.hash.includes("/collection/edit/")) return;

  // Warte bis die Seite geladen ist und füge Button hinzu
  waitForElement(".selection-preview-wrapper", addToggleButton);
}

// Warte auf Element
function waitForElement(selector, callback) {
  const element = document.querySelector(selector);
  if (element) {
    callback();
  } else {
    setTimeout(() => waitForElement(selector, callback), 500);
  }
}

// Button hinzufügen
function addToggleButton() {
  // Prüfe ob wir im Auswahlen-Tab sind
  const activeTab = document.querySelector(".tab-pane.active");
  if (!activeTab) {
    setTimeout(addToggleButton, 500);
    return;
  }

  // Prüfe ob es Auswahlen sind (nicht Bilder/Design/etc)
  const hasSelections = activeTab.querySelector(".selection-preview-wrapper");
  if (!hasSelections) {
    setTimeout(addToggleButton, 500);
    return;
  }

  // Prüfe ob Button schon existiert
  if (document.getElementById("scrappbook-table-toggle")) return;

  // Finde die Button-Leiste - suche nach DIV die mehrere Buttons enthält
  let buttonContainer = null;
  
  // Durchsuche alle divs in der aktiven Tab-Pane
  const allDivs = activeTab.querySelectorAll("div");
  for (const div of allDivs) {
    const buttons = div.querySelectorAll(":scope > button");
    // Wenn ein div direkt mehrere Buttons als Kinder hat, ist das unser Container
    if (buttons.length >= 2) {
      buttonContainer = div;
      console.log('✅ Button container found with', buttons.length, 'buttons');
      break;
    }
  }
  
  if (!buttonContainer) {
    console.error('⚠️ Button container not found, retrying...');
    setTimeout(addToggleButton, 500);
    return;
  }

  // Erstelle Toggle-Button (gleicher Style wie andere Buttons)
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "scrappbook-table-toggle";
  toggleBtn.className = "sc-kDHTFB fwuoPL btn btn-primary btn-outline";
  toggleBtn.type = "button";
  toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px;">
            <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/>
        </svg>
        ${t('ui.tableView')}
    `;

  toggleBtn.addEventListener("click", toggleView);
  buttonContainer.appendChild(toggleBtn);
}

// Ansicht wechseln
async function toggleView() {
  const toggleBtn = document.getElementById("scrappbook-table-toggle");

  if (!isTableView) {
    // Zu Tabellenansicht wechseln
    toggleBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px;">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
            </svg>
            ${t('ui.gridView')}
        `;

    // Daten laden und Tabelle anzeigen
    await loadDataAndShowTable();
    isTableView = true;
  } else {
    // Zurück zur Originalansicht
    toggleBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px;">
                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/>
            </svg>
            ${t('ui.tableView')}
        `;

    hideTable();
    isTableView = false;
  }
}

// Collection ID finden
function getCollectionId() {
  // Aus der URL extrahieren: #/collection/edit/SkD6TBF1-g
  const match = window.location.hash.match(/\/collection\/edit\/([^\/]+)/);
  return match ? match[1] : null;
}

// Daten von API laden
async function loadDataAndShowTable() {
  const collectionId = getCollectionId();

  if (!collectionId) {
    alert("Collection ID konnte nicht gefunden werden!");
    return;
  }

  console.log("Collection ID:", collectionId);

  const apiUrl = `https://api.scrappbook.de/api/selections/collection?collection_id=${collectionId}`;

  try {
    const response = await fetch(apiUrl, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API Fehler: ${response.status}`);
    }

    const data = await response.json();
    console.log("API Daten geladen:", data.length, "Auswahlen");

    // Finde die Selection ID aus dem DOM - Format: <div id="selection_XXX">
    let selectionId = null;
    const selectionDivs = document.querySelectorAll('[id^="selection_"]');

    if (selectionDivs.length > 0) {
      // Filtere _lock divs raus und nimm das mit opacity: 1 (aktive Auswahl)
      for (let div of selectionDivs) {
        if (!div.id.includes("_lock")) {
          const opacity = window.getComputedStyle(div).opacity;
          if (opacity === "1") {
            selectionId = div.id.replace("selection_", "");
            console.log(
              "✅ Aktive Selection ID gefunden:",
              selectionId,
              "(opacity: 1)",
            );
            break;
          }
        }
      }
    }

    if (!selectionId) {
      console.error("Keine Selection ID im DOM gefunden");
      // Fallback: Nimm die erste Auswahl mit Bildern
      const firstSelection = data.find(
        (sel) => sel.favorites && sel.favorites.length > 0,
      );
      if (firstSelection) {
        console.log("Fallback: Verwende erste Auswahl:", firstSelection.name);
        prepareAndShowData(firstSelection, data);
        return;
      } else {
        alert("Keine Auswahl mit Bildern gefunden!");
        return;
      }
    }

    // Finde die passende Auswahl in den API-Daten
    const currentSelection = data.find((sel) => sel._id === selectionId);

    if (!currentSelection) {
      console.error("Selection ID", selectionId, "nicht in API-Daten gefunden");
      console.log(
        "Verfügbare Selections:",
        data.map((s) => ({ id: s._id, name: s.name })),
      );
      alert("Auswahl wurde in den API-Daten nicht gefunden!");
      return;
    }

    console.log(
      "Auswahl gefunden:",
      currentSelection.name,
      "mit",
      currentSelection.favorites.length,
      "Bildern",
    );

    prepareAndShowData(currentSelection, data);
  } catch (error) {
    console.error("Fehler beim Laden:", error);
    alert("Fehler beim Laden der Daten: " + error.message);
  }
}

// Cache für geladene Bild-URLs
let imageCache = {};

// Cache für Fullscreen-Buttons
let fullscreenButtonCache = {};

// Ersteller-Namen aus DOM extrahieren
function getCreatorName(currentSelection) {
  // Verwende Selection-Name direkt aus API-Daten
  const selectionName = currentSelection?.name || "Auswahl";
  console.log("📋 Selection Name aus API:", selectionName);
  
  // Suche im DOM nach dem Ersteller-Namen
  // Das ist der einzige Text in Anführungszeichen unter dem Auswahl-Namen
  let creatorName = null;
  
  // Versuche verschiedene Selektoren
  const possibleContainers = [
    document.querySelector('.sc-cnVHIu.dRHrzP .mb-0.mt-2.text-center'),
    document.querySelector('.text-center strong')?.parentElement,
    document.querySelector('[class*="text-center"]'),
  ];
  
  for (const container of possibleContainers) {
    if (container) {
      console.log("📋 Container gefunden:", container.className);
      const fullText = container.textContent;
      console.log("📋 Voller Text:", fullText);
      
      // Suche nach Text in Anführungszeichen
      const quoteMatch = fullText.match(/"([^"]+)"/);
      if (quoteMatch) {
        creatorName = quoteMatch[1].trim();
        console.log("✅ Ersteller gefunden:", creatorName);
        break;
      }
      
      // Alternative: Suche nach Zeilen und nimm die zweite (ohne Strong-Tag)
      const lines = fullText.split('\n').map(l => l.trim()).filter(l => l && l !== selectionName);
      if (lines.length > 0) {
        // Entferne Anführungszeichen falls vorhanden
        creatorName = lines[0].replace(/^["']|["']$/g, '');
        console.log("✅ Ersteller aus Zeilen gefunden:", creatorName);
        break;
      }
    }
  }
  
  if (!creatorName) {
    console.warn("⚠️ Ersteller nicht gefunden, verwende 'Unbekannt'");
    creatorName = "Unbekannt";
  }
  
  // Prüfe auf "Unbenannte Auswahl"
  if (selectionName === t('ui.unnamedSelection')) {
    const customName = prompt(t('ui.namePrompt'), t('ui.unnamedSelection'));
    return { 
      selectionName: customName || t('ui.unnamedSelection'), 
      creatorName: creatorName 
    };
  }
  
  return { 
    selectionName: selectionName, 
    creatorName: creatorName 
  };
}

// Daten vorbereiten und anzeigen
function prepareAndShowData(currentSelection, allSelections) {
  console.log("✅ Bereite Daten vor für:", currentSelection.name);
  console.log("📦 KOMPLETTES SELECTION OBJEKT:", currentSelection);
  console.log("📦 Verfügbare Felder:", Object.keys(currentSelection));
  
  // Speichere für Export  
  window.currentSelectionData = currentSelection;

  // 1. Sammle ALLE jemals geladenen Bilder aus Performance API (Browser Cache)
  const cachedImageUrls = performance
    .getEntriesByType("resource")
    .filter(
      (r) =>
        r.name.includes("photostore24.online") && r.name.includes("images"),
    )
    .map((r) => r.name);

  console.log(`🗂️ ${cachedImageUrls.length} Bilder im Browser-Cache gefunden`);

  // 2. Sammle aktuell sichtbare Bilder aus dem Grid
  const imageUrlMap = {};
  const visibleImages = document.querySelectorAll('[data-cy="wrapper"] img');

  visibleImages.forEach((img) => {
    if (img.src) {
      // URL Format: .../userId/folder/IDENTIFIER/filename?token=...
      // Extrahiere identifier (vorletzter Teil vor filename)
      const match = img.src.match(/\/([^\/]+)\/[^\/]+\?token=/);
      if (match) {
        const identifier = match[1];
        imageUrlMap[identifier] = img.src;
      }
    }
  });

  // 3. Ergänze mit gecachten URLs
  cachedImageUrls.forEach((url) => {
    const match = url.match(/\/([^\/]+)\/[^\/]+\?token=/);
    if (match) {
      const identifier = match[1];
      if (!imageUrlMap[identifier]) {
        imageUrlMap[identifier] = url;
      }
    }
  });

  console.log(
    `📸 ${Object.keys(imageUrlMap).length} Bilder verfügbar (Grid + Cache)`,
  );
  console.log("Erste 3 Identifiers:", Object.keys(imageUrlMap).slice(0, 3));

  // 4. Prüfe Extension-Cache für diese Selection
  const cacheKey = currentSelection._id;
  if (imageCache[cacheKey]) {
    console.log("✅ Extension-Cache gefunden! Verwende gecachte Bilder");
    Object.assign(imageUrlMap, imageCache[cacheKey]);
  }

  allData = currentSelection.favorites.map((fav) => {
    const imageName = fav._image.originalImageName;
    const identifier = fav._image.identifier;

    // Suche passendes Bild über identifier im URL-Mapping
    let thumbnail = imageUrlMap[identifier] || null;

    if (!thumbnail) {
      console.log(`⚠️ Kein Bild gefunden für identifier: ${identifier}`);
    }

    // Status aus API-Daten
    const hasHeart = !!fav.like;
    const hasComment = !!(fav.comment && fav.comment.trim());

    return {
      selectionName: currentSelection.name,
      imageName: imageName,
      imageId: fav._image._id,
      identifier: identifier,
      comment: fav.comment || "",
      thumbnail: thumbnail,
      fullImage: thumbnail ? thumbnail.replace("/XS.jpg", "/S.jpg") : null,
      hasHeart: hasHeart,
      hasComment: hasComment,
      imageObj: fav._image,
    };
  });

  console.log(
    `✅ ${allData.length} Bilder vorbereitet (${allData.filter((d) => d.thumbnail).length} mit URLs)`,
  );
  showTable(allData);
}

// Tabelle anzeigen
function showTable(data) {
  // Aktualisiere allData mit der übergebenen Reihenfolge
  allData = data;

  // Original Grid-Container verstecken
  const originalContainer =
    document.querySelector('[data-testid="image-gallery-inner-container"]') ||
    document.querySelector(".sc-cepDVR.eIOBQB") ||
    document.querySelector(".autosizer") ||
    document.querySelector('[style*="overflow: visible"]');

  if (originalContainer) {
    originalContainer.style.display = "none";
  }

  // Finde die Button-Leiste - mit robuster Suche
  const activeTab = document.querySelector(".tab-pane.active");
  if (!activeTab) {
    console.error("Active tab nicht gefunden!");
    return;
  }

  let buttonContainer = null;
  const allDivs = activeTab.querySelectorAll("div");
  for (const div of allDivs) {
    const buttons = div.querySelectorAll(":scope > button");
    if (buttons.length >= 2) {
      buttonContainer = div;
      break;
    }
  }
  
  if (!buttonContainer) {
    console.error("Button-Container nicht gefunden!");
    return;
  }

  // Finde den Parent des Button-Containers (dort fügen wir die Tabelle ein)
  const parentContainer = buttonContainer.parentElement;
  if (!parentContainer) {
    console.error("Parent-Container nicht gefunden!");
    return;
  }

  // Tabellen-Container erstellen oder finden
  let tableContainer = document.getElementById("scrappbook-table-container");
  if (!tableContainer) {
    tableContainer = document.createElement("div");
    tableContainer.id = "scrappbook-table-container";
    // Füge Container NACH dem Button-Container ein
    buttonContainer.parentNode.insertBefore(
      tableContainer,
      buttonContainer.nextSibling,
    );
  }

  tableContainer.style.display = "block";
  tableContainer.innerHTML = "";

  // Export-Button mit Dropdown ZUERST hinzufügen
  const exportContainer = document.createElement("div");
  exportContainer.style.cssText =
    "margin-bottom: 20px; display: inline-flex; gap: 10px; align-items: center;";

  const exportBtn = document.createElement("button");
  exportBtn.className = "scrappbook-export-btn";
  exportBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
        </svg>
        ${t("ui.export")}
    `;

  exportBtn.onclick = () => showExportModal();

  exportContainer.appendChild(exportBtn);

  // "Alle Bilder laden" Button
  const loadedImages = data.filter((item) => item.thumbnail).length;
  const missingImages = data.length - loadedImages;

  if (missingImages > 0) {
    const loadImagesBtn = document.createElement("button");
    loadImagesBtn.className = "scrappbook-export-btn";
    loadImagesBtn.style.background = "#2196F3";
    loadImagesBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M.5 3.5A.5.5 0 0 1 1 3h14a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5H1a.5.5 0 0 1-.5-.5v-9zM1 4a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h6V4H1zm7 0v8h6a.5.5 0 0 0 .5-.5v-7A.5.5 0 0 0 14 4H8z"/>
                <path d="M10 5.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
            </svg>
            ${t('ui.loadAllImages', loadedImages, data.length)}
        `;
    loadImagesBtn.onclick = async () => {
      // Lade alle Bilder Funktion inline
      const loadBtn = loadImagesBtn;

      // Button deaktivieren
      loadBtn.disabled = true;
      const originalBtnHtml = loadBtn.innerHTML;
      loadBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                    <path d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                </svg>
                Wechsle zur Original-Ansicht...
            `;

      try {
        console.log("🔄 Starte Bild-Lade-Prozess...");

        // 1. Zur Original-Ansicht wechseln
        const tableContainer = document.getElementById(
          "scrappbook-table-container",
        );
        const originalContainer =
          document.querySelector(
            '[data-testid="image-gallery-inner-container"]',
          ) || document.querySelector('[style*="overflow: visible"]');

        if (!originalContainer || !tableContainer) {
          alert("Container nicht gefunden!");
          loadBtn.disabled = false;
          loadBtn.innerHTML = originalBtnHtml;
          return;
        }

        // Verstecke Tabelle, zeige Grid
        tableContainer.style.display = "none";
        originalContainer.style.display = "block";

        await new Promise((r) => setTimeout(r, 300)); // Warte bis Grid sichtbar

        // 2. Finde Grid-Container (den scrollbaren DIV)
        let gridContainer = null;

        // Finde scrollbaren Container
        const scrollables = Array.from(document.querySelectorAll("*")).filter(
          (el) => {
            const style = window.getComputedStyle(el);
            return (
              (style.overflow === "auto" || style.overflowY === "auto") &&
              el.scrollHeight > el.clientHeight
            );
          },
        );

        // Nimm den zweiten scrollbaren Container (der mit den Bildern)
        if (scrollables.length >= 2) {
          gridContainer = scrollables[1];
        } else if (scrollables.length === 1) {
          gridContainer = scrollables[0];
        } else {
          gridContainer = document.querySelector(".autosizer");
        }

        if (!gridContainer) {
          console.error("❌ Grid-Container nicht gefunden!");
          console.log("Verfügbare scrollable Container:", scrollables.length);
          alert("Grid-Container nicht gefunden!");
          tableContainer.style.display = "block";
          originalContainer.style.display = "none";
          loadBtn.disabled = false;
          loadBtn.innerHTML = originalBtnHtml;
          return;
        }

        console.log("✅ Grid-Container gefunden:", {
          className: gridContainer.className,
          scrollHeight: gridContainer.scrollHeight,
          clientHeight: gridContainer.clientHeight,
          scrollTop: gridContainer.scrollTop,
        });

        loadBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                        <path d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                    </svg>
                    Scrolle durch Bilder...
                `;

        console.log("🔄 Starte Auto-Scroll im Grid...");

        const imageMap = {};
        const fullscreenBtnMap = {};
        let lastImageCount = 0;
        let noChangeCount = 0;
        const maxScrolls = 50;
        let scrollCount = 0;

        // 3. Scrolle durch das Grid
        while (scrollCount < maxScrolls && noChangeCount < 5) {
          // Sammle aktuell sichtbare Bilder UND deren Fullscreen-Button-Info
          const visibleWrappers = document.querySelectorAll(
            '[data-cy="wrapper"]',
          );
          visibleWrappers.forEach((wrapper) => {
            const img = wrapper.querySelector("img");
            if (img && img.src) {
              // Extrahiere identifier (vorletzter Teil der URL)
              const match = img.src.match(/\/([^\/]+)\/[^\/]+\?token=/);
              if (match) {
                const identifier = match[1];
                imageMap[identifier] = img.src;

                // Finde Fullscreen-Button für dieses Bild
                const fullscreenBtn =
                  wrapper.querySelector('[data-for*="fullscreen"]') ||
                  wrapper.querySelector('[data-for*="Vollbild"]') ||
                  wrapper.querySelector('button[title*="Vollbild"]');

                if (fullscreenBtn) {
                  // Cache METADATEN statt Button-Objekt!
                  const dataFor = fullscreenBtn.getAttribute("data-for");
                  const title = fullscreenBtn.getAttribute("title");

                  fullscreenBtnMap[identifier] = {
                    dataFor: dataFor,
                    title: title,
                    selector: dataFor ? `[data-for="${dataFor}"]` : null,
                  };
                  console.log(
                    `✅ Button-Info gecached für: ${identifier}`,
                    fullscreenBtnMap[identifier],
                  );
                }
              }
            }
          });

          const currentCount = Object.keys(imageMap).length;
          console.log(`📸 Bilder geladen: ${currentCount}/${allData.length}`);

          // Update Button Text
          loadBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                            <path d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                        </svg>
                        Lade ${currentCount}/${allData.length}...
                    `;

          // Prüfe ob neue Bilder geladen wurden
          if (currentCount === lastImageCount) {
            noChangeCount++;
          } else {
            noChangeCount = 0;
            lastImageCount = currentCount;
          }

          // Alle Bilder geladen?
          if (currentCount >= allData.length) {
            console.log("✅ Alle Bilder geladen!");
            break;
          }

          // Scrolle weiter
          const oldScrollTop = gridContainer.scrollTop;
          gridContainer.scrollTop += 300;
          const newScrollTop = gridContainer.scrollTop;

          console.log(
            `🔄 Scroll: ${oldScrollTop} → ${newScrollTop} (${scrollCount + 1}/${maxScrolls})`,
          );

          // Prüfe ob wir am Ende sind
          if (oldScrollTop === newScrollTop && oldScrollTop > 0) {
            console.log("⬇️ Scrolling am Ende angekommen");
            noChangeCount++;
          }

          scrollCount++;

          // Warte kurz damit Bilder laden können
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        console.log(`✅ ${Object.keys(imageMap).length} Bilder gesammelt`);
        console.log(
          `✅ ${Object.keys(fullscreenBtnMap).length} Fullscreen-Buttons gecached`,
        );

        // 4. Speichere im Cache
        const selectionDivs = document.querySelectorAll('[id^="selection_"]');
        let selectionId = null;
        for (let div of selectionDivs) {
          if (!div.id.includes("_lock")) {
            const opacity = window.getComputedStyle(div).opacity;
            if (opacity === "1") {
              selectionId = div.id.replace("selection_", "");
              break;
            }
          }
        }

        if (selectionId) {
          imageCache[selectionId] = imageMap;
          fullscreenButtonCache[selectionId] = fullscreenBtnMap;
          console.log(
            "💾 Bilder und Fullscreen-Buttons im Extension-Cache gespeichert",
          );
        }

        // 5. Scrolle zurück zum Anfang
        gridContainer.scrollTop = 0;

        loadBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                        <path d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                    </svg>
                    Zurück zur Tabelle...
                `;

        await new Promise((r) => setTimeout(r, 300));

        // 6. Zurück zur Tabelle
        originalContainer.style.display = "none";

        // 7. Tabelle neu laden mit allen Bildern
        await loadDataAndShowTable();

        console.log("✅ Fertig! Alle Bilder geladen.");
      } catch (error) {
        console.error("❌ Fehler beim Laden der Bilder:", error);
        alert("Fehler beim Laden der Bilder: " + error.message);

        // Stelle sicher dass Tabelle wieder sichtbar ist
        const tableContainer = document.getElementById(
          "scrappbook-table-container",
        );
        const originalContainer =
          document.querySelector(
            '[data-testid="image-gallery-inner-container"]',
          ) || document.querySelector('[style*="overflow: visible"]');
        if (tableContainer) tableContainer.style.display = "block";
        if (originalContainer) originalContainer.style.display = "none";

        loadBtn.disabled = false;
        loadBtn.innerHTML = originalBtnHtml;
      }
    };
    exportContainer.appendChild(loadImagesBtn);
  }

  // Buttons-Container OBEN hinzufügen (vor der Tabelle)
  tableContainer.appendChild(exportContainer);

  // Tabelle erstellen (ohne extra Wrapper, direkt in tableContainer)
  const table = document.createElement("table");
  table.className = "scrappbook-table";

  // Header
  const thead = document.createElement("thead");
  thead.innerHTML = `
        <tr>
            <th>#</th>
            <th class="sortable" data-sort="status">${t("table.status")} ↕</th>
            <th>${t("table.preview")}</th>
            <th class="sortable" data-sort="imageName">${t("table.imageName")} ↕</th>
            <th class="sortable" data-sort="comment">${t("table.comment")} ↕</th>
            <th>Download</th>
        </tr>
    `;

  // Sortier-Events
  thead.querySelectorAll(".sortable").forEach((th) => {
    th.addEventListener("click", () => sortTable(th.dataset.sort));
  });

  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  data.forEach((item, index) => {
    const row = document.createElement("tr");

    // Zeilennummer
    const numberCell = document.createElement("td");
    numberCell.textContent = index + 1;
    numberCell.style.fontWeight = "600";
    numberCell.style.color = "#666";

    // Status-Zelle mit Icons
    const statusCell = document.createElement("td");
    statusCell.style.textAlign = "center";
    statusCell.style.fontSize = "18px";

    let statusIcons = "";
    if (item.hasHeart && item.hasComment) {
      statusIcons = "❤️💬";
      statusCell.title = "Favorisiert & Kommentiert";
    } else if (item.hasHeart) {
      statusIcons = "❤️";
      statusCell.title = "Favorisiert";
    } else if (item.hasComment) {
      statusIcons = "💬";
      statusCell.title = "Kommentiert";
    } else {
      statusIcons = "-";
      statusCell.title = t("ui.noStatus");
    }
    statusCell.textContent = statusIcons;

    // Thumbnail oder Platzhalter
    const thumbnailCell = document.createElement("td");
    thumbnailCell.style.textAlign = "center";

    if (item.thumbnail) {
      // Bild vorhanden - zeige img
      const img = document.createElement("img");
      img.src = item.thumbnail;
      img.alt = item.imageName;
      img.className = "scrappbook-thumbnail";
      img.style.width = "80px";
      img.style.height = "80px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "4px";
      img.style.cursor = "pointer";
      img.style.display = "block";
      
      // Lade Bild über Background Script (umgeht CORS!)
      const convertToBase64 = async () => {
        try {
          // Sende Message an Background Script
          chrome.runtime.sendMessage(
            { type: 'fetch_image', url: item.thumbnail },
            (response) => {
              if (response && response.success) {
                item.thumbnailBase64 = response.base64;
                console.log(`✅ Base64 konvertiert für: ${item.imageName} (${response.base64.length} Zeichen)`);
              } else {
                console.error(`❌ Base64-Konvertierung fehlgeschlagen für ${item.imageName}:`, response?.error);
                item.thumbnailBase64 = null;
              }
            }
          );
        } catch (e) {
          console.error(`❌ Base64-Konvertierung fehlgeschlagen für ${item.imageName}:`, e);
          item.thumbnailBase64 = null;
        }
      };
      
      // Starte Konvertierung wenn Bild geladen ist
      img.onload = () => convertToBase64();

      // Klick öffnet Vollbild - Professionelle Fullscreen-Ansicht
      img.addEventListener("click", () => {
        console.log("🖼️ Öffne Vollbildansicht für:", item.imageName);

        // Finde aktuellen Index in sortierter Liste
        let currentIndex = allData.findIndex(
          (d) => d.identifier === item.identifier,
        );
        if (currentIndex === -1) currentIndex = 0;

        // Funktion um Bild zu wechseln
        const showImage = (index) => {
          if (index < 0 || index >= allData.length) return;
          currentIndex = index;
          const currentItem = allData[currentIndex];

          // Update Bildanzeige
          if (currentItem.thumbnail) {
            const highResUrl = currentItem.thumbnail.replace(
              "/XS.jpg",
              "/L.jpg",
            );
            const xlUrl = currentItem.thumbnail.replace("/XS.jpg", "/XL.jpg");

            fullImg.style.display = "none";
            spinner.style.display = "block";
            fullImg.style.transform = "scale(1)";
            fullImg.style.transformOrigin = "center";
            isZoomed = false;
            fullImg.style.cursor = "zoom-in";
            translateX = 0;
            translateY = 0;

            // Container zurücksetzen
            imgContainer.style.top = "70px";
            imgContainer.style.bottom = "70px";

            fullImg.onload = () => {
              spinner.style.display = "none";
              fullImg.style.display = "block";
            };

            fullImg.onerror = () => {
              if (fullImg.src === highResUrl) {
                fullImg.src = xlUrl;
              } else {
                fullImg.src = currentItem.fullImage || currentItem.thumbnail;
              }
            };

            fullImg.src = highResUrl;

            // Update Position + Name
            infoLabel.innerHTML = `${currentIndex + 1}/${allData.length} &nbsp;•&nbsp; ${currentItem.imageName}`;
          }
        };

        // Baue hochauflösende Bild-URL
        if (!item.thumbnail) {
          alert(t('ui.imageNotAvailable'));
          return;
        }

        const highResUrl = item.thumbnail.replace("/XS.jpg", "/L.jpg");
        const xlUrl = item.thumbnail.replace("/XS.jpg", "/XL.jpg");

        // Overlay
        const overlay = document.createElement("div");
        overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.95);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;

        // Header-Leiste (SEHR transparent)
        const header = document.createElement("div");
        header.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 70px;
                    background: rgba(0, 0, 0, 0.15);

                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 20px;
                `;

        // Position + Name (links in Header)
        const infoLabel = document.createElement("div");
        infoLabel.innerHTML = `${currentIndex + 1}/${allData.length} &nbsp;•&nbsp; ${item.imageName}`;
        infoLabel.style.cssText = `
                    color: white;
                    font-size: 14px;
                `;

        // Close-Button (rechts in Header) - OHNE focus outline
        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "✕";
        closeBtn.style.cssText = `
                    width: 40px;
                    height: 40px;
                    background: transparent;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    transition: opacity 0.2s;
                    opacity: 0.7;
                    outline: none;
                `;
        closeBtn.onmouseover = () => (closeBtn.style.opacity = "1");
        closeBtn.onmouseout = () => (closeBtn.style.opacity = "0.7");
        closeBtn.onclick = (e) => {
          e.stopPropagation();
          overlay.remove();
          document.removeEventListener("keydown", handleKeydown);
        };

        header.appendChild(infoLabel);
        header.appendChild(closeBtn);

        // Navigation Links - OHNE focus outline, quadratisch
        const prevBtn = document.createElement("button");
        prevBtn.innerHTML = "‹";
        prevBtn.style.cssText = `
                    position: absolute;
                    left: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 60px;
                    height: 60px;
                    background: transparent;
                    border: none;
                    color: white;
                    font-size: 48px;
                    line-height: 48px;
                    cursor: pointer;
                    z-index: 10;
                    display: ${currentIndex > 0 ? "flex" : "none"};
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.2s;
                    opacity: 0.7;
                    outline: none;
                    padding: 0;
                `;
        prevBtn.onmouseover = () => (prevBtn.style.opacity = "1");
        prevBtn.onmouseout = () => (prevBtn.style.opacity = "0.7");
        prevBtn.onclick = (e) => {
          e.stopPropagation();
          if (currentIndex > 0) {
            showImage(currentIndex - 1);
            prevBtn.style.display = currentIndex > 0 ? "flex" : "none";
            nextBtn.style.display =
              currentIndex < allData.length - 1 ? "flex" : "none";
          }
        };

        // Navigation Rechts
        const nextBtn = document.createElement("button");
        nextBtn.innerHTML = "›";
        nextBtn.style.cssText = `
                    position: absolute;
                    right: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 60px;
                    height: 60px;
                    background: transparent;
                    border: none;
                    color: white;
                    font-size: 48px;
                    line-height: 48px;
                    cursor: pointer;
                    z-index: 10;
                    display: ${currentIndex < allData.length - 1 ? "flex" : "none"};
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.2s;
                    opacity: 0.7;
                    outline: none;
                    padding: 0;
                `;
        nextBtn.onmouseover = () => (nextBtn.style.opacity = "1");
        nextBtn.onmouseout = () => (nextBtn.style.opacity = "0.7");
        nextBtn.onclick = (e) => {
          e.stopPropagation();
          if (currentIndex < allData.length - 1) {
            showImage(currentIndex + 1);
            prevBtn.style.display = currentIndex > 0 ? "flex" : "none";
            nextBtn.style.display =
              currentIndex < allData.length - 1 ? "flex" : "none";
          }
        };

        // Bild-Container (gleicher Abstand oben/unten in normaler Ansicht)
        const imgContainer = document.createElement("div");
        imgContainer.style.cssText = `
                    position: fixed;
                    top: 70px;
                    left: 0;
                    right: 0;
                    bottom: 70px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    transition: top 0.3s ease, bottom 0.3s ease;
                `;

        // Click auf Container schließt Overlay
        imgContainer.onclick = (e) => {
          if (e.target === imgContainer) {
            overlay.remove();
            document.removeEventListener("keydown", handleKeydown);
          }
        };

        // Loading Spinner
        const spinner = document.createElement("div");
        spinner.textContent = "Lädt...";
        spinner.style.cssText = `
                    color: white;
                    font-size: 20px;
                    position: absolute;
                `;
        imgContainer.appendChild(spinner);

        // Bild mit Zoom-Funktionalität
        let isZoomed = false;
        let isDragging = false;
        let startX,
          startY,
          translateX = 0,
          translateY = 0;
        let zoomOffsetX = 0, zoomOffsetY = 0; // Offset vom Zoom-Klick
        let swipeStartX = 0;
        let mouseDownX, mouseDownY;

        const fullImg = document.createElement("img");
        fullImg.style.cssText = `
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    display: none;
                    cursor: zoom-in;
                    transition: transform 0.3s ease;
                    user-select: none;
                    transform-origin: center center;
                `;

        // Mouse Down
        fullImg.addEventListener("mousedown", (e) => {
          mouseDownX = e.clientX;
          mouseDownY = e.clientY;

          if (isZoomed) {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            fullImg.style.cursor = "grabbing";
            fullImg.style.transition = "none";
          } else {
            swipeStartX = e.clientX;
          }
        });

        // Mouse Move
        imgContainer.addEventListener("mousemove", (e) => {
          if (isZoomed && isDragging) {
            e.preventDefault();

            // Berechne neue Position
            let newTranslateX = e.clientX - startX;
            let newTranslateY = e.clientY - startY;

            // Berechne Limits DYNAMISCH basierend auf aktuellem Zoom-Offset
            // Nach Zoom ist das Bild 2.5x größer
            const imgRect = fullImg.getBoundingClientRect();
            const containerRect = imgContainer.getBoundingClientRect();

            // ORIGINAL Bildgröße (vor Scale)
            const origWidth = imgRect.width / 2.5;
            const origHeight = imgRect.height / 2.5;

            // Überhang = wie viel größer das gezoomte Bild als der Container ist
            const overflowX = (origWidth * 2.5 - containerRect.width);
            const overflowY = (origHeight * 2.5 - containerRect.height);

            // Limits für Gesamt-Translation (zoomOffset + translate)
            // Das Bild darf maximal um Überhang/2 von der Mitte weg
            const maxTotalTranslateX = Math.max(0, overflowX / 2);
            const maxTotalTranslateY = Math.max(0, overflowY / 2);

            // Limits für translateX/Y alleine (unter Berücksichtigung von zoomOffset)
            const maxTranslateX = maxTotalTranslateX - zoomOffsetX;
            const minTranslateX = -maxTotalTranslateX - zoomOffsetX;
            const maxTranslateY = maxTotalTranslateY - zoomOffsetY;
            const minTranslateY = -maxTotalTranslateY - zoomOffsetY;

            // Limitiere Translation
            translateX = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
            translateY = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));

            // Wende Transform an
            fullImg.style.transform = `scale(2.5) translate(${(translateX + zoomOffsetX) / 2.5}px, ${(translateY + zoomOffsetY) / 2.5}px)`;
          }
        });

        // Mouse Up - Zoom in/out
        fullImg.addEventListener("mouseup", (e) => {
          e.stopPropagation();

          const deltaX = e.clientX - mouseDownX;
          const deltaY = e.clientY - mouseDownY;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          if (isZoomed && isDragging) {
            isDragging = false;
            fullImg.style.cursor = "grab";

            // War es nur ein Klick?
            if (distance < 10) {
              // Zoom out - zurück zur Mitte
              fullImg.style.transition = "transform 0.3s ease";
              fullImg.style.transform = "scale(1)";
              fullImg.style.cursor = "zoom-in";
              isZoomed = false;
              translateX = 0;
              translateY = 0;
              zoomOffsetX = 0;
              zoomOffsetY = 0;

              // Container zurück
              imgContainer.style.top = "70px";
              imgContainer.style.bottom = "70px";
            } else {
              // War Drag
              fullImg.style.transition = "transform 0.3s ease";
            }
          } else if (!isZoomed && distance < 10) {
            // Zoom in - berechne Offset zur Klick-Position
            const imgRect = fullImg.getBoundingClientRect();
            
            // Klick-Position relativ zum Bild (in px)
            const clickX = e.clientX - imgRect.left;
            const clickY = e.clientY - imgRect.top;
            
            // Bild-Mitte (in px)
            const centerX = imgRect.width / 2;
            const centerY = imgRect.height / 2;
            
            // Offset = Differenz zwischen Klick und Mitte
            // Nach dem Zoom soll die Klick-Stelle in der Mitte sein
            let rawZoomOffsetX = (centerX - clickX) * 2.5; // *2.5 weil zoom scale
            let rawZoomOffsetY = (centerY - clickY) * 2.5;

            // WICHTIG: Berechne Limits und limitiere den Zoom-Offset SOFORT!
            const containerRect = imgContainer.getBoundingClientRect();
            const origWidth = imgRect.width;
            const origHeight = imgRect.height;
            
            // Überhang nach Zoom
            const overflowX = (origWidth * 2.5 - containerRect.width);
            const overflowY = (origHeight * 2.5 - containerRect.height);
            
            // Max-Offset vom Zentrum
            const maxOffsetX = Math.max(0, overflowX / 2);
            const maxOffsetY = Math.max(0, overflowY / 2);
            
            // Limitiere Zoom-Offset sofort!
            zoomOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, rawZoomOffsetX));
            zoomOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, rawZoomOffsetY));

            fullImg.style.transform = `scale(2.5) translate(${zoomOffsetX / 2.5}px, ${zoomOffsetY / 2.5}px)`;
            fullImg.style.cursor = "grab";
            fullImg.style.transition = "transform 0.3s ease";
            isZoomed = true;
            translateX = 0;
            translateY = 0;

            // Container auf Fullscreen
            imgContainer.style.top = "0";
            imgContainer.style.bottom = "0";
          } else if (!isZoomed && swipeStartX !== 0 && Math.abs(deltaX) > 50) {
            // Swipe Navigation
            if (deltaX > 0 && currentIndex > 0) {
              showImage(currentIndex - 1);
              prevBtn.style.display = currentIndex > 0 ? "flex" : "none";
              nextBtn.style.display =
                currentIndex < allData.length - 1 ? "flex" : "none";
            } else if (deltaX < 0 && currentIndex < allData.length - 1) {
              showImage(currentIndex + 1);
              prevBtn.style.display = currentIndex > 0 ? "flex" : "none";
              nextBtn.style.display =
                currentIndex < allData.length - 1 ? "flex" : "none";
            }
          }

          swipeStartX = 0;
        });

        // Mouse Leave
        imgContainer.addEventListener("mouseleave", () => {
          if (isDragging) {
            isDragging = false;
            if (isZoomed) {
              fullImg.style.cursor = "grab";
              fullImg.style.transition = "transform 0.3s ease";
            }
          }
          swipeStartX = 0;
        });

        // Lade Bild
        fullImg.onload = () => {
          spinner.style.display = "none";
          fullImg.style.display = "block";
        };

        fullImg.onerror = () => {
          if (fullImg.src === highResUrl) {
            fullImg.src = xlUrl;
          } else {
            fullImg.src = item.fullImage || item.thumbnail;
          }
        };

        fullImg.src = highResUrl;

        imgContainer.appendChild(fullImg);

        // Keyboard Navigation
        const handleKeydown = (e) => {
          if (e.key === "Escape") {
            overlay.remove();
            document.removeEventListener("keydown", handleKeydown);
          } else if (e.key === "ArrowLeft" && currentIndex > 0) {
            showImage(currentIndex - 1);
            prevBtn.style.display = currentIndex > 0 ? "flex" : "none";
            nextBtn.style.display =
              currentIndex < allData.length - 1 ? "flex" : "none";
          } else if (
            e.key === "ArrowRight" &&
            currentIndex < allData.length - 1
          ) {
            showImage(currentIndex + 1);
            prevBtn.style.display = currentIndex > 0 ? "flex" : "none";
            nextBtn.style.display =
              currentIndex < allData.length - 1 ? "flex" : "none";
          }
        };
        document.addEventListener("keydown", handleKeydown);

        // Overlay schließen bei Klick auf Hintergrund
        overlay.onclick = (e) => {
          // Nur schließen wenn nicht aufs Bild geklickt wurde
          if (e.target === overlay) {
            overlay.remove();
            document.removeEventListener("keydown", handleKeydown);
          }
        };

        // Baue Overlay zusammen
        overlay.appendChild(header);
        overlay.appendChild(prevBtn);
        overlay.appendChild(nextBtn);
        overlay.appendChild(imgContainer);

        document.body.appendChild(overlay);
        console.log("✅ Professionelle Fullscreen-Ansicht geöffnet");
      });

      thumbnailCell.appendChild(img);
    } else {
      // Kein Bild - zeige Platzhalter
      const placeholder = document.createElement("div");
      placeholder.style.cssText =
        "width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 4px; font-size: 32px; margin: 0 auto;";
      placeholder.textContent = "📷";
      placeholder.title = t('ui.imageNotLoaded');
      thumbnailCell.appendChild(placeholder);
    }

    const nameCell = document.createElement("td");
    nameCell.className = "copyable";
    nameCell.title = "Klicken zum Kopieren";
    nameCell.textContent = item.imageName;
    nameCell.addEventListener("click", () => copyToClipboard(item.imageName));

    const commentCell = document.createElement("td");
    commentCell.className = "copyable";
    commentCell.title = "Klicken zum Kopieren";
    commentCell.textContent = item.comment || "-";
    if (item.comment) {
      commentCell.addEventListener("click", () =>
        copyToClipboard(item.comment),
      );
    }

    const actionsCell = document.createElement("td");
    actionsCell.className = "scrappbook-actions";
    actionsCell.style.textAlign = "center";
    actionsCell.style.verticalAlign = "middle";

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "action-btn";
    downloadBtn.title = "Download";
    downloadBtn.style.cursor = "pointer";
    downloadBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
            </svg>
        `;
    downloadBtn.addEventListener("click", () => {
      // Finde und klicke Original Download-Link im Grid
      const downloadLink = document.querySelector(
        `[href*="/download/"][href*="${item.imageId}"]`,
      );
      if (downloadLink) {
        downloadLink.click();
      } else {
        // Fallback: Baue Download-URL mit aktuellem Token
        const collectionId = window.location.hash.match(
          /\/collection\/edit\/([^\/]+)/,
        )[1];
        const anyDownloadLink = document.querySelector('[href*="authToken"]');
        if (anyDownloadLink) {
          const tokenMatch = anyDownloadLink.href.match(/authToken=([^&]+)/);
          if (tokenMatch) {
            const authToken = tokenMatch[1];
            const downloadUrl = `https://api-2.scrappbook.de/api/image/download/${collectionId}/${item.imageId}?q=high&authToken=${authToken}`;
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = item.imageName;
            a.click();
          }
        } else {
          alert("Download nicht verfügbar - Token nicht gefunden");
        }
      }
    });

    actionsCell.appendChild(downloadBtn);

    row.appendChild(numberCell);
    row.appendChild(statusCell);
    row.appendChild(thumbnailCell);
    row.appendChild(nameCell);
    row.appendChild(commentCell);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  // Füge Tabelle direkt in Container ein (kein extra Wrapper mehr)
  tableContainer.appendChild(table);
}

// Tabelle verstecken
function hideTable() {
  const tableContainer = document.getElementById("scrappbook-table-container");
  if (tableContainer) {
    tableContainer.style.display = "none";
  }

  const originalContainer =
    document.querySelector(".sc-cepDVR.eIOBQB") ||
    document.querySelector(".autosizer") ||
    document.querySelector('[style*="overflow: visible"]');

  if (originalContainer) {
    originalContainer.style.display = "block";
  }
}

// Sortieren
let sortDirection = {};
function sortTable(column) {
  // Für Status-Spalte: 4 verschiedene Sortierungen
  if (column === "status") {
    if (!sortDirection[column]) {
      sortDirection[column] = "mode1"; // Start mit Mode 1
    } else if (sortDirection[column] === "mode1") {
      sortDirection[column] = "mode2";
    } else if (sortDirection[column] === "mode2") {
      sortDirection[column] = "mode3";
    } else if (sortDirection[column] === "mode3") {
      sortDirection[column] = "mode4";
    } else {
      sortDirection[column] = "mode1"; // Zurück zu Mode 1
    }
  } else {
    // Für alle anderen Spalten: Normal asc/desc
    if (!sortDirection[column]) {
      sortDirection[column] = "asc";
    } else {
      sortDirection[column] = sortDirection[column] === "asc" ? "desc" : "asc";
    }
  }

  const sorted = [...allData].sort((a, b) => {
    let aVal, bVal;

    // Spezialbehandlung für Status-Sortierung mit 4 Modi
    if (column === "status") {
      const mode = sortDirection[column];
      
      // Mode 1: Kommentar (1) → Herz (2) → Kommentar+Herz (3)
      // Mode 2: Kommentar+Herz (3) → Herz (2) → Kommentar (1)
      // Mode 3: Kommentar (1) → Kommentar+Herz (3) → Herz (2)
      // Mode 4: Herz (2) → Kommentar+Herz (3) → Kommentar (1)
      
      if (mode === "mode1") {
        // Priorität: nur Kommentar=1, nur Herz=2, beide=3, nichts=0
        aVal = a.hasHeart && a.hasComment ? 3 : a.hasHeart ? 2 : a.hasComment ? 1 : 0;
        bVal = b.hasHeart && b.hasComment ? 3 : b.hasHeart ? 2 : b.hasComment ? 1 : 0;
      } else if (mode === "mode2") {
        // Priorität umgekehrt: beide=3, nur Herz=2, nur Kommentar=1, nichts=0 (DESC)
        aVal = a.hasHeart && a.hasComment ? 3 : a.hasHeart ? 2 : a.hasComment ? 1 : 0;
        bVal = b.hasHeart && b.hasComment ? 3 : b.hasHeart ? 2 : b.hasComment ? 1 : 0;
        // Vertausche für absteigende Reihenfolge
        [aVal, bVal] = [bVal, aVal];
      } else if (mode === "mode3") {
        // Priorität: nur Kommentar=1, beide=3, nur Herz=2, nichts=0
        aVal = a.hasHeart && a.hasComment ? 3 : a.hasHeart ? 2 : a.hasComment ? 1 : 0;
        bVal = b.hasHeart && b.hasComment ? 3 : b.hasHeart ? 2 : b.hasComment ? 1 : 0;
        // Tausche Herz (2) und Beide (3) für Mode 3
        if (aVal === 3) aVal = 2.5;
        else if (aVal === 2) aVal = 3;
        if (bVal === 3) bVal = 2.5;
        else if (bVal === 2) bVal = 3;
      } else if (mode === "mode4") {
        // Priorität: nur Herz=1, beide=2, nur Kommentar=3, nichts=0
        aVal = a.hasHeart && a.hasComment ? 2 : a.hasHeart ? 1 : a.hasComment ? 3 : 0;
        bVal = b.hasHeart && b.hasComment ? 2 : b.hasHeart ? 1 : b.hasComment ? 3 : 0;
      }
      
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      aVal = a[column] || "";
      bVal = b[column] || "";

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDirection[column] === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    }
  });

  showTable(sorted);
}

// In Zwischenablage kopieren
function copyToClipboard(text) {
  if (text === "-" || !text) return;

  navigator.clipboard.writeText(text).then(() => {
    const tooltip = document.createElement("div");
    tooltip.className = "copy-tooltip";
    tooltip.textContent = t("ui.copied");
    document.body.appendChild(tooltip);

    setTimeout(() => tooltip.remove(), 1500);
  });
}

// Export Modal anzeigen
function showExportModal() {
  // Erstelle Modal-Overlay
  const modal = document.createElement("div");
  modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

  // Modal-Content
  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

  modalContent.innerHTML = `
        <h2 style="margin: 0 0 20px 0; font-size: 24px;">${t('ui.export')}</h2>
        <p style="margin: 0 0 20px 0; color: #666;">${t('ui.exportFormat')}</p>

        <div style="display: grid; gap: 10px;">
            <button class="export-format-btn" data-format="xlsx" style="
                padding: 15px;
                background: #217346;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                text-align: left;
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <span style="font-size: 24px;">📗</span>
                <div>
                    <div style="font-weight: 600;">${t('export.excel.title')}</div>
                    <div style="font-size: 12px; opacity: 0.9;">${t('export.excel.desc')}</div>
                </div>
            </button>

            <button class="export-format-btn" data-format="pdf" style="
                padding: 15px;
                background: #D32F2F;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                text-align: left;
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <span style="font-size: 24px;">📕</span>
                <div>
                    <div style="font-weight: 600;">${t('export.pdf.title')}</div>
                    <div style="font-size: 12px; opacity: 0.9;">${t('export.pdf.desc')}</div>
                </div>
            </button>

            <button class="export-format-btn" data-format="md" style="
                padding: 15px;
                background: #2196F3;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                text-align: left;
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <span style="font-size: 24px;">📝</span>
                <div>
                    <div style="font-weight: 600;">${t('export.markdown.title')}</div>
                    <div style="font-size: 12px; opacity: 0.9;">${t('export.markdown.desc')}</div>
                </div>
            </button>

            <button class="export-format-btn" data-format="txt" style="
                padding: 15px;
                background: #9E9E9E;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                text-align: left;
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <span style="font-size: 24px;">📄</span>
                <div>
                    <div style="font-weight: 600;">${t('export.text.title')}</div>
                    <div style="font-size: 12px; opacity: 0.9;">${t('export.text.desc')}</div>
                </div>
            </button>
        </div>

        <button id="cancel-export" style="
            margin-top: 20px;
            width: 100%;
            padding: 10px;
            background: transparent;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        ">${t('ui.cancel')}</button>
    `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Event Listeners
  modalContent.querySelectorAll(".export-format-btn").forEach((btn) => {
    btn.onmouseover = () => (btn.style.opacity = "0.9");
    btn.onmouseout = () => (btn.style.opacity = "1");
    btn.onclick = () => {
      const format = btn.dataset.format;
      modal.remove();
      exportData(format);
    };
  });

  modalContent.querySelector("#cancel-export").onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// Export in verschiedenen Formaten
async function exportData(format) {
  const date = new Date().toISOString().split("T")[0];
  let content, filename, mimeType;

  // Status als Emoji-String
  const getStatusEmoji = (item) => {
    if (item.hasHeart && item.hasComment) return "❤️💬";
    if (item.hasHeart) return "❤️";
    if (item.hasComment) return "💬";
    return "-";
  };

  // Escape-Funktionen
  const escapeCSV = (text) => {
    if (!text) return "";
    return text.replace(/"/g, '""').replace(/[\r\n]+/g, " ");
  };

  const escapeMD = (text) => {
    if (!text) return "-";
    return text.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
  };

  const escapeTXT = (text) => {
    if (!text) return "-";
    return text.replace(/[\r\n]+/g, " ");
  };

  // PRÜFE OB BILDER GELADEN SIND
  const imagesLoaded = allData.filter(d => d.thumbnail).length;
  const totalImages = allData.length;
  
  if (format === "csv" || format === "excel") {
    if (imagesLoaded < totalImages) {
      const proceed = confirm(t('ui.imagesLoadedConfirm', imagesLoaded, totalImages));
      if (!proceed) return;
    }
  }

  // Namen aus API-Daten holen
  const sel = window.currentSelectionData || { name: allData[0]?.selectionName };
  let selectionName = sel.name || "Auswahl";
  let creatorName = null;
  
  // Ersteller-Name aus _endCustomer holen
  if (sel._endCustomer) {
    const firstName = sel._endCustomer.firstName || "";
    const lastName = sel._endCustomer.lastName || "";
    creatorName = `${firstName} ${lastName}`.trim();
    console.log("✅ Ersteller gefunden:", creatorName);
  }
  
  console.log("📝 Export - Selection:", selectionName, "| Ersteller:", creatorName);
  
  // Bei "Unbenannte Auswahl" oder "Auswahl" frage nach Namen
  const trimmedName = selectionName.trim();
  if (trimmedName === 'Unbenannte Auswahl' || trimmedName === 'Auswahl') {
    const customName = prompt("Name für diese Auswahl eingeben:", selectionName);
    if (customName && customName.trim()) {
      selectionName = customName.trim();
    }
    // Bei unbenannter Auswahl keinen Ersteller im Dateinamen
    creatorName = null;
  }
  
  const safeSelectionName = selectionName.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, "_");
  const safeCreatorName = creatorName ? creatorName.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, "_") : null;

  if (format === "xlsx") {
    // XLSX Export mit ExcelJS
    await exportXLSX(selectionName, creatorName, safeSelectionName, safeCreatorName, date);
    return;
  } else if (format === "pdf") {
    // PDF Export mit jsPDF
    await exportPDF(selectionName, creatorName, safeSelectionName, safeCreatorName, date);
    return;
  } else if (format === "md") {
    const rows = allData.map(row =>
      `| ${getStatusEmoji(row)} | ${escapeMD(row.imageName)} | ${escapeMD(row.comment)} | - [ ] |`
    ).join("\n");

    const title = creatorName ? `${selectionName}${t('export.by')}${creatorName}` : selectionName;
    content = `# ${escapeMD(title)}\n\n${t('export.exportedOn')}${date}\n\n| ${t('table.status')} | ${t('table.imageName')} | ${t('table.comment')} | ${t('table.doneHeader')} |\n|--------|----------|----------|----------|\n${rows}`;
    
    filename = creatorName
      ? `${safeSelectionName}${t('export.byFilename')}${safeCreatorName}_${date}.md`
      : `${safeSelectionName}_${date}.md`;
    mimeType = "text/markdown;charset=utf-8;";
  } else if (format === "txt") {
    const maxNameLength = Math.max(...allData.map(r => r.imageName.length), 10);
    const rows = allData.map(row => {
      const status = getStatusEmoji(row);
      const name = escapeTXT(row.imageName).padEnd(maxNameLength);
      const comment = escapeTXT(row.comment);
      return `${status}\t|\t${name}\t|\t${comment}`;
    }).join("\n");

    const title = creatorName ? `${selectionName}${t('export.by')}${creatorName}` : selectionName;
    content = `${escapeTXT(title)}\n${t('export.exportedOn')}${date}\n${"=".repeat(80)}\n\n${rows}`;
    
    filename = creatorName
      ? `${safeSelectionName}${t('export.byFilename')}${safeCreatorName}_${date}.txt`
      : `${safeSelectionName}_${date}.txt`;
    mimeType = "text/plain;charset=utf-8;";
  }

  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// XLSX Export mit ExcelJS
async function exportXLSX(selectionName, creatorName, safeSelectionName, safeCreatorName, date) {
  // Prüfe ob Bilder geladen sind
  const imagesWithBase64 = allData.filter(d => d.thumbnailBase64).length;
  if (imagesWithBase64 < allData.length) {
    const proceed = confirm(t('ui.imagesConfirm', imagesWithBase64, allData.length));
    if (!proceed) return;
  }

  // Loading-Anzeige
  const loadingDiv = document.createElement("div");
  loadingDiv.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: white; padding: 30px 50px; border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 100001; text-align: center;
  `;
  loadingDiv.innerHTML = `<h3 style="margin: 0 0 10px 0;">${t("ui.excelCreating")}</h3><p style="margin: 0; color: #666;">${t("ui.loading")}</p>`;
  document.body.appendChild(loadingDiv);

  try {
    // ExcelJS ist bereits über manifest.json geladen
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Auswahl');

    // Header
    const title = creatorName ? `${selectionName}${t('export.by')}${creatorName}` : selectionName;
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = title;
    worksheet.getCell('A1').font = { size: 20, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
    
    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = `${t('export.exportedOn')}${date}`;
    worksheet.getCell('A2').font = { size: 12, color: { argb: 'FF666666' } };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };

    // Spalten-Header
    worksheet.getRow(4).values = [
      t('table.number'), 
      t('table.status'), 
      t('table.preview'), 
      t('table.imageName'), 
      t('table.comment'), 
      t('table.done')
    ];
    worksheet.getRow(4).font = { size: 14, bold: true };
    worksheet.getRow(4).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' }
    };
    worksheet.getRow(4).height = 25;

    // Spaltenbreiten
    worksheet.getColumn(1).width = 8;      // #
    worksheet.getColumn(2).width = 12;     // Status
    worksheet.getColumn(3).width = 20;     // Vorschau (Bilder)
    worksheet.getColumn(4).width = 50;     // Bildname
    worksheet.getColumn(5).width = 132.50; // Kommentar (800 Pixel!)
    worksheet.getColumn(6).width = 6;      // Checkbox

    // Helper-Funktion: Berechne Bilddimensionen mit Aspect Ratio
    function getImageDimensions(base64) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          resolve({ width: 80, height: 60 }); // Fallback
        };
        img.src = base64;
      });
    }

    // Daten + Bilder
    for (let i = 0; i < allData.length; i++) {
      const row = allData[i];
      const rowNum = i + 5; // Start bei Zeile 5
      
      // Berechne Zeilenhöhe basierend auf Kommentarlänge
      const commentLength = (row.comment || '').length;
      // Grobe Schätzung: ~80 Zeichen pro Zeile bei Breite 80
      const estimatedLines = Math.ceil(commentLength / 80) || 1;
      // Mindesthöhe für Bilder (80), erhöhe für lange Kommentare
      const calculatedHeight = Math.max(80, estimatedLines * 20);
      worksheet.getRow(rowNum).height = calculatedHeight;
      
      // Spalte A: # - Zentriert
      const cellA = worksheet.getCell(`A${rowNum}`);
      cellA.value = i + 1;
      cellA.font = { size: 18 };
      cellA.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Spalte B: Status - Zentriert
      const cellB = worksheet.getCell(`B${rowNum}`);
      cellB.value = 
        row.hasHeart && row.hasComment ? '❤️💬' :
        row.hasHeart ? '❤️' :
        row.hasComment ? '💬' : '-';
      cellB.font = { size: 18 };
      cellB.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Spalte C: Vorschau - Zentriert (für Bilder)
      const cellC = worksheet.getCell(`C${rowNum}`);
      cellC.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Spalte D: Bildname - Links, vertikal mittig
      const cellD = worksheet.getCell(`D${rowNum}`);
      cellD.value = row.imageName;
      cellD.font = { size: 18 };
      cellD.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      
      // Spalte E: Kommentar - Links, vertikal mittig (für lange Kommentare)
      const cellE = worksheet.getCell(`E${rowNum}`);
      cellE.value = row.comment || '';
      cellE.font = { size: 18 };
      cellE.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      
      // Spalte F: Checkbox mit Data Validation
      const cellF = worksheet.getCell(`F${rowNum}`);
      cellF.value = false; // Boolean-Wert für Checkbox
      cellF.font = { size: 18 };
      cellF.alignment = { vertical: 'middle', horizontal: 'center' };
      // Data Validation für echte Checkbox
      cellF.dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"✓,☐"'],
        showDropDown: false
      };
      cellF.value = '☐'; // Start-Wert
      
      // Bild einfügen wenn verfügbar - mit Aspect Ratio UND Zentrierung in Zelle
      if (row.thumbnailBase64) {
        try {
          // Hole Originalbilddimensionen
          const imgDims = await getImageDimensions(row.thumbnailBase64);
          const imgRatio = imgDims.width / imgDims.height;
          
          // Zellengröße in Excel (Spalte C ist 20 Zeichen breit, Zeile ist 80 Punkte hoch)
          // 1 Zeichen Breite ≈ 7 Pixel, 1 Punkt Höhe ≈ 1.33 Pixel
          const maxWidth = 18 * 7;   // ~126 Pixel
          const maxHeight = 80 * 1.33; // ~106 Pixel
          
          let finalWidth, finalHeight;
          
          if (imgRatio >= 1) {
            // Querformat oder Quadrat - limitiere Breite
            finalWidth = Math.min(imgDims.width, maxWidth);
            finalHeight = finalWidth / imgRatio;
            
            // Falls Höhe zu groß, limitiere Höhe
            if (finalHeight > maxHeight) {
              finalHeight = maxHeight;
              finalWidth = finalHeight * imgRatio;
            }
          } else {
            // Hochformat - limitiere Höhe
            finalHeight = Math.min(imgDims.height, maxHeight);
            finalWidth = finalHeight * imgRatio;
            
            // Falls Breite zu groß, limitiere Breite
            if (finalWidth > maxWidth) {
              finalWidth = maxWidth;
              finalHeight = finalWidth / imgRatio;
            }
          }
          
          const imageId = workbook.addImage({
            base64: row.thumbnailBase64,
            extension: 'jpeg'
          });
          
          // Füge Bild oben links in Zelle ein
          // ext in Pixeln = korrekte Größe & Seitenverhältnis
          worksheet.addImage(imageId, {
            tl: { col: 2, row: rowNum - 1 },  // Keine Offsets = oben links
            ext: { width: finalWidth, height: finalHeight },  // In Pixeln!
            editAs: 'oneCell'  // In Zelle verankert
          });
        } catch (e) {
          console.error(`Fehler beim Einfügen von Bild ${i + 1}:`, e);
        }
      }
    }

    // Borders für alle Zellen
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 4) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    // Export
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const filename = creatorName
      ? `${safeSelectionName}${t('export.byFilename')}${safeCreatorName}_${date}.xlsx`
      : `${safeSelectionName}_${date}.xlsx`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    console.log('✅ XLSX Export erfolgreich');
  } catch (error) {
    console.error('❌ XLSX Export fehlgeschlagen:', error);
    alert('Fehler beim Erstellen der Excel-Datei: ' + error.message);
  } finally {
    loadingDiv.remove();
  }
}

// PDF Export mit jsPDF
async function exportPDF(selectionName, creatorName, safeSelectionName, safeCreatorName, date) {
  // Prüfe ob Bilder geladen sind
  const imagesWithBase64 = allData.filter(d => d.thumbnailBase64).length;
  if (imagesWithBase64 < allData.length) {
    const proceed = confirm(t('ui.imagesConfirm', imagesWithBase64, allData.length));
    if (!proceed) return;
  }

  // Loading-Anzeige
  const loadingDiv = document.createElement("div");
  loadingDiv.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: white; padding: 30px 50px; border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 100001; text-align: center;
  `;
  loadingDiv.innerHTML = `<h3 style="margin: 0 0 10px 0;">${t("ui.pdfCreating")}</h3><p style="margin: 0; color: #666;">${t("ui.loading")}</p>`;
  document.body.appendChild(loadingDiv);

  try {
    // jsPDF + autoTable sind bereits über manifest.json geladen
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Titel
    const title = creatorName ? `${selectionName}${t('export.by')}${creatorName}` : selectionName;
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${t('export.exportedOn')}${date}`, 14, 28);

    // WICHTIG: Bild-Dimensionen VORHER berechnen für korrekte Aspect Ratios
    const imageDimensions = [];
    for (let i = 0; i < allData.length; i++) {
      const row = allData[i];
      if (row.thumbnailBase64) {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            imageDimensions[i] = { width: img.width, height: img.height };
            resolve();
          };
          img.onerror = () => {
            imageDimensions[i] = { width: 80, height: 60 }; // Fallback
            resolve();
          };
          img.src = row.thumbnailBase64;
        });
      } else {
        imageDimensions[i] = null;
      }
    }

    // EMOJI-CANVAS: Erstelle Canvas mit Emojis für PDF
    function createEmojiCanvas(emoji, width = 48, height = 32) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Hintergrund transparent
      ctx.clearRect(0, 0, width, height);
      
      // Emoji zeichnen
      ctx.font = `${height * 0.8}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, width / 2, height / 2);
      
      return canvas.toDataURL('image/png');
    }

    // Tabelle mit autoTable
    const tableData = [];
    
    for (let i = 0; i < allData.length; i++) {
      const row = allData[i];
      
      tableData.push([
        i + 1,
        '', // LEER - Emojis werden in didDrawCell eingefügt
        '', // Placeholder für Bild
        row.imageName,
        row.comment || ''
      ]);
    }

    doc.autoTable({
      startY: 35,
      head: [[
        t('table.number'), 
        t('table.status'), 
        t('table.preview'), 
        t('table.imageName'), 
        t('table.comment')
      ]],
      body: tableData,
      // Spaltenbreiten angepasst (A4 = 210mm breit, Margins 14mm links/rechts = 182mm verfügbar)
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', valign: 'middle' },  // # (breiter für 3-stellige Nummern!)
        1: { cellWidth: 18, halign: 'center', valign: 'middle' },  // Status (breiter!)
        2: { cellWidth: 22, halign: 'center', valign: 'middle' },  // Vorschau
        3: { cellWidth: 56, halign: 'left', valign: 'middle' },    // Bildname (etwas schmaler)
        4: { cellWidth: 76, halign: 'left', valign: 'middle' }     // Kommentar (MITTIG!)
      },
      headStyles: {
        halign: 'center',
        valign: 'middle',
        fontSize: 11,
        fontStyle: 'bold'
      },
      // Zeilenhöhe für Bilder
      rowPageBreak: 'avoid', // Verhindert aufgeteilte Zeilen über Seitengrenzen
      margin: { left: 14, right: 14, top: 35 },
      didDrawCell: (data) => {
        // Füge Emoji-Status in Spalte 1 ein
        if (data.column.index === 1 && data.section === 'body') {
          const rowIndex = data.row.index;
          const rowData = allData[rowIndex];
          
          if (rowData) {
            try {
              const emojiStatus = 
                rowData.hasHeart && rowData.hasComment ? '❤️💬' :
                rowData.hasHeart ? '❤️' :
                rowData.hasComment ? '💬' :
                '';
              
              if (emojiStatus && emojiStatus !== '-') {
                // Für zwei Emojis breiteres Canvas (2:1 Ratio)
                const canvasWidth = emojiStatus.length > 2 ? 64 : 32;
                const canvasHeight = 32;
                const emojiImage = createEmojiCanvas(emojiStatus, canvasWidth, canvasHeight);
                
                const cellHeight = data.cell.height;
                const imgHeight = Math.min(cellHeight - 4, 4); // Max 4mm hoch (halbiert!)
                const imgWidth = imgHeight * (canvasWidth / canvasHeight); // Aspect Ratio beibehalten
                
                doc.addImage(
                  emojiImage,
                  'PNG',
                  data.cell.x + (data.cell.width - imgWidth) / 2,
                  data.cell.y + (cellHeight - imgHeight) / 2,
                  imgWidth,
                  imgHeight
                );
              }
            } catch (e) {
              console.error(`Fehler beim Einfügen von Emoji ${rowIndex + 1}:`, e);
            }
          }
        }
        
        // Füge Bilder in Spalte 2 (Vorschau) ein
        if (data.column.index === 2 && data.section === 'body') {
          const rowIndex = data.row.index;
          const rowData = allData[rowIndex];
          
          if (rowData && rowData.thumbnailBase64 && imageDimensions[rowIndex]) {
            try {
              // Hole Zellendimensionen
              const cellWidth = data.cell.width - 4; // 2mm padding auf jeder Seite
              const cellHeight = data.cell.height - 4;
              
              // Verwende VORHER berechnete Dimensionen (korrekt!)
              const imgWidth = imageDimensions[rowIndex].width;
              const imgHeight = imageDimensions[rowIndex].height;
              const imgRatio = imgWidth / imgHeight;
              
              // Berechne finale Dimensionen unter Beibehaltung des Aspect Ratio
              let finalWidth, finalHeight;
              
              if (imgRatio >= 1) {
                // Querformat oder Quadrat - limitiere BREITE zuerst
                finalWidth = Math.min(cellWidth, 20);
                finalHeight = finalWidth / imgRatio;
                
                // Falls Höhe zu groß, limitiere Höhe
                if (finalHeight > cellHeight) {
                  finalHeight = cellHeight;
                  finalWidth = finalHeight * imgRatio;
                }
              } else {
                // Hochformat - limitiere HÖHE zuerst
                finalHeight = Math.min(cellHeight, 20);
                finalWidth = finalHeight * imgRatio;
                
                // Falls Breite zu groß, limitiere Breite
                if (finalWidth > cellWidth) {
                  finalWidth = cellWidth;
                  finalHeight = finalWidth / imgRatio;
                }
              }
              
              // Zentriere Bild in Zelle
              const xOffset = (cellWidth - finalWidth) / 2;
              const yOffset = (cellHeight - finalHeight) / 2;
              
              doc.addImage(
                rowData.thumbnailBase64,
                'JPEG',
                data.cell.x + 2 + xOffset,
                data.cell.y + 2 + yOffset,
                finalWidth,
                finalHeight
              );
            } catch (e) {
              console.error(`Fehler beim Einfügen von Bild ${rowIndex + 1}:`, e);
            }
          }
        }
      },
      // Setze Mindesthöhe für Zeilen damit Bilder passen
      styles: {
        minCellHeight: 24,
        fontSize: 10,
        cellPadding: 2
      }
    });

    // Speichern
    const filename = creatorName
      ? `${safeSelectionName}${t('export.byFilename')}${safeCreatorName}_${date}.pdf`
      : `${safeSelectionName}_${date}.pdf`;
    
    doc.save(filename);

    console.log('✅ PDF Export erfolgreich');
  } catch (error) {
    console.error('❌ PDF Export fehlgeschlagen:', error);
    alert('Fehler beim Erstellen der PDF-Datei: ' + error.message);
  } finally {
    loadingDiv.remove();
  }
}

// Beobachte Auswahl-Wechsel
function observeSelectionChanges() {
  let lastActiveSelectionId = null;

  const checkActiveSelection = () => {
    // Nur prüfen wenn Tabelle aktiv ist
    if (!isTableView) return;

    const selectionDivs = document.querySelectorAll('[id^="selection_"]');
    let currentActiveId = null;

    for (let div of selectionDivs) {
      if (!div.id.includes("_lock")) {
        const opacity = window.getComputedStyle(div).opacity;
        if (opacity === "1") {
          currentActiveId = div.id;
          break;
        }
      }
    }

    // Wenn sich die aktive Auswahl geändert hat, lade Tabelle neu
    if (currentActiveId && currentActiveId !== lastActiveSelectionId) {
      console.log(
        "🔄 Auswahl gewechselt von",
        lastActiveSelectionId,
        "zu",
        currentActiveId,
      );
      lastActiveSelectionId = currentActiveId;

      // Tabelle neu laden
      if (lastActiveSelectionId) {
        // Nur beim Wechsel, nicht beim ersten Mal
        console.log("♻️ Lade Tabelle neu...");
        loadDataAndShowTable();
      }
    }

    // Setze die ID auch beim ersten Mal
    if (!lastActiveSelectionId && currentActiveId) {
      lastActiveSelectionId = currentActiveId;
    }
  };

  // Prüfe alle 500ms auf Änderungen
  setInterval(checkActiveSelection, 500);
}

// URL-Änderungen beobachten
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    isTableView = false;

    // Alten Button entfernen
    const oldBtn = document.getElementById("scrappbook-table-toggle");
    if (oldBtn) oldBtn.remove();

    // Alte Tabelle entfernen
    const oldTable = document.getElementById("scrappbook-table-container");
    if (oldTable) oldTable.remove();

    setTimeout(init, 500);
  }
}).observe(document, { subtree: true, childList: true });

// Initial starten
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Starte Auswahl-Beobachtung
observeSelectionChanges();