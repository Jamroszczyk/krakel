# 🧠 ToDoGraph

Eine visuelle To-Do-App mit Node-Graph-Darstellung. Organisiere deine Aufgaben hierarchisch von oben (Hauptaufgaben) nach unten (Unteraufgaben) - wie eine interaktive Mindmap!

## ✨ Features

- 📊 **Visueller Node-Graph**: Tasks als Nodes mit kurvigen Verbindungen
- 🎯 **Automatisches Layout**: Hierarchische Anordnung von oben nach unten
- 💾 **Speichern & Laden**: Projekte als JSON-Dateien
- 🖥️ **Desktop-App**: Native Windows-Anwendung mit Electron
- 🎨 **Modernes UI**: Schönes Design mit TailwindCSS
- ⚡ **Smooth Interactions**: Zoom, Pan, Drag & Drop

## 🚀 Entwicklung

### Voraussetzungen

- Node.js (v18+)
- npm oder yarn

### Installation

```bash
npm install
```

### Entwicklungsserver starten

**Für Browser:**
```bash
npm run dev
```

**Für Electron (Desktop-App):**
```bash
npm run electron:dev
```

## 📦 Build

### Web-Build
```bash
npm run build
```

### Desktop-App (Windows EXE)
```bash
npm run electron:build
```

Die fertige `.exe` findest du dann in `dist_electron/`.

## 🛠️ Tech Stack

- **React** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **ReactFlow** - Node Graph Library
- **TailwindCSS** - Styling
- **Zustand** - State Management
- **Electron** - Desktop App
- **ELK.js** - Automatic Layout

## 📝 Verwendung

1. **Neue Aufgabe erstellen**: Klick auf "+ Neue Aufgabe"
2. **Verbindungen erstellen**: Ziehe vom Rand eines Nodes zu einem anderen
3. **Auto-Layout**: Klick auf "🎯 Auto-Layout (Vertikal)" für automatische Anordnung
4. **Speichern**: Klick auf "💾 Projekt speichern"
5. **Laden**: Klick auf "📂 Projekt laden"

## 🎯 Roadmap

- [ ] Pinned Nodes / Container unten
- [ ] Keyboard Shortcuts
- [ ] Markdown Notes für Nodes
- [ ] Light/Dark Mode
- [ ] Cloud Sync
- [ ] Node bearbeiten (Doppelklick)
- [ ] Farbauswahl für Nodes

## 📄 Lizenz

MIT

## 👨‍💻 Entwickelt mit

- ❤️ und viel Kaffee
- 🤖 Cursor AI Assistant
