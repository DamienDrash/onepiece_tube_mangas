# 🏴‍☠️ One Piece Offline Reader

Eine moderne Web-Anwendung zum Herunterladen und offline Verfügbarmachen von One Piece Manga-Kapiteln. Die App lädt Kapitel von OnePiece-Tube herunter, konvertiert sie in EPUB-Format und bietet eine benutzerfreundliche Oberfläche zum Verwalten der Sammlung.

[![GitHub Repository](https://img.shields.io/badge/GitHub-onepiece__tube__mangas-blue?style=for-the-badge&logo=github)](https://github.com/DamienDrash/onepiece_tube_mangas)
[![Docker Support](https://img.shields.io/badge/Docker-Supported-blue?style=for-the-badge&logo=docker)](https://docker.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-Frontend-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

## ✨ Features

### 🎯 Hauptfunktionen
- **Automatischer Download**: Lädt One Piece Kapitel direkt von OnePiece-Tube
- **EPUB-Konvertierung**: Konvertiert Kapitel automatisch in standardkonforme EPUB-Dateien
- **Offline-Lesbarkeit**: Alle Downloads funktionieren komplett offline
- **Moderne UI**: Responsive Web-Interface mit Next.js und Tailwind CSS
- **REST API**: Vollständige API für alle Funktionen

### 🔧 Technische Features
- **Intelligente Erkennung**: Erkennt neue Kapitel automatisch über JSON-Parsing
- **Robustes Downloading**: Wiederverwendung bestehender Downloads, Fehlerbehandlung
- **Duale Benachrichtigungen**: E-Mail + Web-Push-Benachrichtigungen bei neuen Kapiteln
- **Web-Push-Service**: Browser-Benachrichtigungen ohne E-Mail-Setup
- **VAPID-verschlüsselt**: Sichere Push-Notifications mit moderner Verschlüsselung
- **Docker-Support**: Komplettes Docker-Compose Setup
- **Gesundheitschecks**: Monitoring von Backend und Frontend
- **PWA-Ready**: Progressive Web App mit Service Worker

### 📱 Benutzeroberfläche
- **Dashboard**: Übersicht über verfügbare und heruntergeladene Kapitel
- **Suchfunktion**: Kapitel nach Nummer oder Titel durchsuchen
- **Filter**: Nach Status (alle/heruntergeladen/verfügbar) filtern
- **Download-Verwaltung**: Übersicht und Verwaltung aller EPUB-Dateien
- **Erweiterte Einstellungen**: 
  - E-Mail-Benachrichtigungen (SMTP-Konfiguration)
  - Web-Push-Benachrichtigungen (Browser-nativ)
  - Live-Status-Anzeige der Abonnenten
  - Test-Benachrichtigungen

## 🚀 Schnellstart

### Voraussetzungen
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional aber empfohlen)

### Mit Docker (Empfohlen)

1. **Repository klonen**
   ```bash
   git clone https://github.com/DamienDrash/onepiece_tube_mangas.git
   cd onepiece_tube_mangas
   ```

2. **Environment konfigurieren**
   ```bash
   cp .env backend/.env
   # Editiere backend/.env nach Bedarf
   ```

3. **Services starten**
   ```bash
   docker compose up -d
   ```

4. **Zugriff**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8001
   - API Dokumentation: http://localhost:8001/docs

### Manuelle Installation

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Auf Windows: venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
# Editiere .env nach Bedarf
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📁 Projektstruktur

```
onepiece_tube_manga/
├── backend/                 # Python FastAPI Backend
│   ├── app.py              # Haupt-API Application
│   ├── downloader.py       # Chapter Download Logic
│   ├── notification.py     # E-Mail Benachrichtigungen
│   ├── scheduler.py        # Automatische Updates
│   ├── models.py           # SQLAlchemy Models (optional)
│   ├── utils.py            # Hilfsfunktionen
│   ├── requirements.txt    # Python Dependencies
│   ├── .env.example        # Environment Template
│   └── Dockerfile          # Docker Configuration
├── frontend/               # Next.js Frontend
│   ├── app/                # Next.js App Router
│   ├── components/         # React Components
│   ├── lib/                # Utilities & API Client
│   ├── package.json        # Node Dependencies
│   └── Dockerfile          # Docker Configuration
├── data/                   # Downloaded Chapters (auto-created)
├── docker-compose.yml      # Docker Compose Configuration
├── .env                    # Environment Template
├── .gitignore             # Git Ignore Rules
└── README.md              # Diese Dokumentation
```

## 🔧 Konfiguration

### Environment Variablen

Erstelle eine `.env` Datei im `backend/` Verzeichnis:

```env
# Speicher-Verzeichnis für Downloads
STORAGE_DIR=./data

# OnePiece-Tube Basis-URL
BASE_URL=https://onepiece.tube

# Server Konfiguration
PORT=8001
HOST=0.0.0.0

# SMTP für E-Mail Benachrichtigungen (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=dein-username
SMTP_PASSWORD=dein-password
SMTP_SENDER=noreply@example.com
```

### Port-Konfiguration

Die App verwendet folgende Ports (anpassbar):
- **Backend**: 8001 (vermeidet Konflikt mit Port 8000)
- **Frontend**: 3001 (vermeidet Konflikt mit Port 3000)
- **PostgreSQL**: Nicht verwendet (vermeidet Konflikt mit Port 5432)

## 📚 API Dokumentation

### Wichtige Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/chapters` | Liste heruntergeladener Kapitel |
| POST | `/api/chapters/{id}` | Kapitel herunterladen |
| GET | `/api/chapters/{id}/epub` | EPUB-Datei herunterladen |
| GET | `/api/latest` | Neuestes verfügbares Kapitel |
| GET | `/api/available-chapters` | Alle verfügbaren Kapitel |
| POST | `/api/notify` | E-Mail Benachrichtigung senden |
| GET | `/health` | Health Check |

### Beispiel API Calls

```bash
# Verfügbare Kapitel abrufen
curl http://localhost:8001/api/available-chapters

# Kapitel 1156 herunterladen
curl -X POST http://localhost:8001/api/chapters/1156

# EPUB-Datei herunterladen
curl -O http://localhost:8001/api/chapters/1156/epub
```

## 🎨 Frontend Features

### Dashboard
- **Statistiken**: Übersicht über Downloads und verfügbare Kapitel
- **Kapitel-Liste**: Alle verfügbaren Kapitel mit Download-Status
- **Such- und Filterfunktionen**: Einfache Navigation durch große Kapitel-Listen

### Downloads-Seite
- **Download-Verwaltung**: Übersicht aller heruntergeladenen EPUBs
- **Bulk-Aktionen**: Massenoperationen für mehrere Kapitel
- **EPUB-Reader Integration**: Direktes Öffnen von EPUB-Dateien

### Einstellungen
- **Download-Konfiguration**: Automatische Downloads ein-/ausschalten
- **E-Mail Setup**: SMTP-Einstellungen für Benachrichtigungen
- **Server-Info**: Aktuelle Konfiguration einsehen

## 🔧 Entwicklung

### Backend entwickeln
```bash
cd backend
# Virtual environment aktivieren
source venv/bin/activate

# Dependencies installieren
pip install -r requirements.txt

# Development server starten
uvicorn app:app --reload --host 0.0.0.0 --port 8001
```

### Frontend entwickeln
```bash
cd frontend
npm install
npm run dev
```

### Tests ausführen
```bash
# Backend tests (wenn vorhanden)
cd backend
python -m pytest

# Frontend tests (wenn vorhanden)
cd frontend
npm test
```

## 🐳 Docker Details

### Services
- **backend**: Python FastAPI Application auf Port 8001
- **frontend**: Next.js Application auf Port 3001

### Volumes
- `./data:/app/data`: Persistente Speicherung der Downloads
- `./backend:/app`: Hot-reload für Backend-Entwicklung
- `./frontend:/app`: Hot-reload für Frontend-Entwicklung

### Commands
```bash
# Services starten
docker compose up -d

# Logs anzeigen
docker compose logs -f

# Services stoppen
docker compose down

# Mit Volume-Cleanup
docker compose down -v

# Services neu bauen
docker compose build --no-cache
```

## 📖 Nutzung

### Ersten Download starten
1. Öffne http://localhost:3001
2. Durchsuche verfügbare Kapitel im Dashboard
3. Klicke "Herunterladen" für gewünschte Kapitel
4. Warte auf Download-Abschluss
5. EPUB-Datei über "EPUB öffnen" Button herunterladen

### Benachrichtigungen einrichten

#### E-Mail Benachrichtigungen
1. SMTP-Daten in `backend/.env` konfigurieren:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=dein_username
   SMTP_PASSWORD=dein_password
   SMTP_SENDER=noreply@example.com
   ```
2. In den Einstellungen E-Mail-Adresse eintragen
3. E-Mail-Benachrichtigungen aktivieren

#### Web-Push-Benachrichtigungen
1. Gehe zu den Einstellungen (`/settings`)
2. Aktiviere "Web Push-Benachrichtigungen"
3. Browser fragt nach Berechtigung → "Erlauben"
4. Optional: Test-Benachrichtigung senden
5. Automatische Benachrichtigungen bei neuen Kapiteln

### EPUB-Dateien verwenden
- **Desktop**: Calibre, Adobe Digital Editions
- **Mobile**: Apple Books (iOS), Google Play Books (Android)
- **E-Reader**: Kindle (nach Konvertierung), Kobo, Tolino

## ⚠️ Wichtige Hinweise

### Rechtliche Aspekte
- **Nur für Bildungszwecke**: Diese Software dient ausschließlich Bildungszwecken
- **Copyright beachten**: Respektiere die Urheberrechte von Eiichiro Oda
- **Kommerzielle Nutzung verboten**: Keine kommerzielle Nutzung der Downloads
- **Terms of Service**: Beachte die Nutzungsbedingungen von OnePiece-Tube

### Performance
- **Bandbreite**: Downloads benötigen entsprechende Internetverbindung
- **Speicherplatz**: Jedes Kapitel benötigt ~10-50 MB
- **Rate Limiting**: App respektiert Server-Limits durch Delays

### Troubleshooting
- **Backend Offline**: Prüfe `docker compose logs backend`
- **Frontend Fehler**: Prüfe `docker compose logs frontend`
- **Downloads fehlschlagen**: Prüfe Internetverbindung und OnePiece-Tube Status
- **SMTP Fehler**: Validiere E-Mail-Konfiguration in `.env`

## 🤝 Beitragen

### Bug Reports
1. Issue im Repository erstellen
2. Detaillierte Beschreibung des Problems
3. Logs und Screenshots anhängen
4. Environment-Details angeben

### Feature Requests
1. Feature Request Issue erstellen
2. Anwendungsfall beschreiben
3. Mockups oder Beispiele anhängen

### Code Beiträge
1. Repository forken
2. Feature branch erstellen
3. Änderungen implementieren
4. Tests hinzufügen
5. Pull Request erstellen

## 📝 Lizenz

Dieses Projekt ist für **reine Bildungszwecke** gedacht. Die Nutzung erfolgt auf eigene Verantwortung unter Beachtung aller geltenden Urheberrechte und Nutzungsbedingungen.

---

**⚓ Entwickelt mit ❤️ für die One Piece Community**
