# 📦 Build-Anleitung für ToDoGraph

## Vorbereitung

### 1. Icon erstellen (Optional aber empfohlen)

Erstelle ein Icon für die App:
- Format: `.ico` (Windows) oder `.png` (256x256px minimum)
- Speichere es in `public/icon.png` oder `public/icon.ico`
- Aktualisiere in `package.json` unter `build.win.icon` den Pfad

**Online Icon-Generator:**
- https://www.favicon-generator.org/
- https://icoconvert.com/

### 2. App-Details anpassen

In `package.json`:
```json
{
  "name": "todograph",
  "version": "0.1.0",
  "author": "Dein Name"
}
```

## 🚀 Build-Prozess

### Schritt 1: Dependencies installieren
```bash
npm install
```

### Schritt 2: Web-Build erstellen
```bash
npm run build
```

Dies erstellt einen optimierten Build in `dist/`.

### Schritt 3: Desktop-App bauen
```bash
npm run electron:build
```

**Oder kürzer:**
```bash
npm run dist
```

### Ausgabe

Die fertige `.exe` findest du in:
```
dist_electron/
  └── ToDoGraph Setup 0.1.0.exe
```

## ⚙️ Build-Optionen anpassen

In `package.json` unter `build`:

```json
{
  "build": {
    "appId": "com.todograph.app",
    "productName": "ToDoGraph",
    "win": {
      "target": ["nsis"],        // Installer-Typ
      "icon": "public/icon.ico"  // Icon-Pfad
    },
    "nsis": {
      "oneClick": false,         // Installations-Dialog anzeigen
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

## 🐛 Troubleshooting

### Build schlägt fehl?

1. **Node-Module neu installieren:**
```bash
rm -rf node_modules package-lock.json
npm install
```

2. **Cache leeren:**
```bash
npm run build -- --force
```

3. **Electron Builder Cache leeren:**
```bash
npx electron-builder install-app-deps
```

### Icon wird nicht angezeigt?

- Stelle sicher, dass das Icon existiert
- Nutze `.ico` Format für Windows
- Größe mindestens 256x256px

## 📝 Build-Konfiguration

Die komplette Konfiguration findest du in `package.json` unter dem `build`-Schlüssel.

Weitere Optionen: https://www.electron.build/configuration/configuration

