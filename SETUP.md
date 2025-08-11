# 🚀 Setup Anleitung - One Piece Offline Reader

Diese Anleitung führt dich Schritt für Schritt durch die Installation und Konfiguration der One Piece Offline Reader App.

## 📋 Voraussetzungen

### System Requirements
- **Python 3.11 oder höher**
- **Node.js 18 oder höher**
- **Git**
- **Docker & Docker Compose** (empfohlen)
- **4GB freier Speicherplatz** (für Downloads)

### Port-Verfügbarkeit prüfen
Die App benötigt folgende Ports (bereits angepasst um Konflikte zu vermeiden):
- **8001**: Backend API
- **3001**: Frontend Web Interface

```bash
# Prüfe ob Ports frei sind
lsof -i :8001
lsof -i :3001
```

## 🐳 Installation mit Docker (Empfohlen)

### 1. Repository Setup
```bash
# Repository in gewünschtes Verzeichnis klonen
cd ~/Documents
git clone <repository-url> onepiece_tube_manga
cd onepiece_tube_manga
```

### 2. Environment Konfiguration
```bash
# Environment-Datei erstellen
cp .env backend/.env

# Optional: SMTP für E-Mail Benachrichtigungen konfigurieren
nano backend/.env
```

**Beispiel SMTP-Konfiguration (Gmail):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=deine.email@gmail.com
SMTP_PASSWORD=dein-app-passwort
SMTP_SENDER=deine.email@gmail.com
```

### 3. Services starten
```bash
# Alle Services im Hintergrund starten
docker compose up -d

# Logs verfolgen (optional)
docker compose logs -f
```

### 4. Zugriff testen
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

## 🛠 Manuelle Installation

### Backend Setup

1. **Python Environment erstellen**
```bash
cd backend
python3 -m venv venv

# Virtual environment aktivieren
# macOS/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate
```

2. **Dependencies installieren**
```bash
pip install -r requirements.txt
```

3. **Environment konfigurieren**
```bash
cp .env.example .env
# .env Datei nach Bedarf anpassen
```

4. **Backend starten**
```bash
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

1. **Node.js Dependencies installieren**
```bash
cd frontend
npm install
```

2. **Development Server starten**
```bash
npm run dev
```

3. **Production Build (optional)**
```bash
npm run build
npm start
```

## ✅ Funktionstest

### 1. Health Check
```bash
# Backend Health Check
curl http://localhost:8001/health

# Erwartete Antwort:
# {"status":"healthy","service":"onepiece-offline-api"}
```

### 2. Frontend Test
1. Öffne http://localhost:3001
2. Dashboard sollte sichtbar sein
3. Verbindungsstatus sollte "Online" zeigen

### 3. API Test
```bash
# Verfügbare Kapitel abrufen
curl http://localhost:8001/api/latest

# Test-Download (kleines Kapitel)
curl -X POST http://localhost:8001/api/chapters/1156
```

## 🔧 Konfiguration

### Storage Verzeichnis
```bash
# Data-Verzeichnis wird automatisch erstellt
mkdir -p data
chmod 755 data
```

### SMTP Setup (Optional)

Für E-Mail Benachrichtigungen bei neuen Kapiteln:

**Gmail Setup:**
1. App-Passwort in Google Account erstellen
2. 2FA muss aktiviert sein
3. App-Passwort in `.env` eintragen

**Andere Provider:**
```env
# Beispiel für andere SMTP-Provider
SMTP_HOST=mail.dein-provider.de
SMTP_PORT=587
SMTP_USERNAME=dein-username
SMTP_PASSWORD=dein-passwort
SMTP_SENDER=noreply@deine-domain.de
```

### Backend-URL konfigurieren

Wenn Backend auf anderem Server läuft:

**Frontend Konfiguration:**
```bash
# frontend/next.config.js anpassen
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://deine-backend-url:8001/api/:path*',
    },
  ]
}
```

## 📊 Monitoring & Logs

### Docker Logs
```bash
# Alle Services
docker compose logs -f

# Nur Backend
docker compose logs -f backend

# Nur Frontend
docker compose logs -f frontend

# Letzte 100 Zeilen
docker compose logs --tail=100
```

### Service Status
```bash
# Container Status
docker compose ps

# Health Checks
docker compose exec backend curl http://localhost:8001/health
docker compose exec frontend curl http://localhost:3001
```

### Performance Monitoring
```bash
# Ressourcenverbrauch
docker stats

# Speicherverbrauch des data/ Ordners
du -sh data/
```

## 🚨 Troubleshooting

### Backend startet nicht
```bash
# Logs prüfen
docker compose logs backend

# Häufige Probleme:
# 1. Port 8001 bereits belegt
# 2. Python Dependencies fehlen
# 3. .env Datei fehlt oder falsch konfiguriert
```

### Frontend startet nicht
```bash
# Logs prüfen
docker compose logs frontend

# Häufige Probleme:
# 1. Port 3001 bereits belegt
# 2. Node.js Dependencies fehlen
# 3. Backend nicht erreichbar
```

### Download-Probleme
```bash
# Backend Health Check
curl http://localhost:8001/health

# Netzwerk-Test
curl https://onepiece.tube

# Storage-Permissions prüfen
ls -la data/
```

### SMTP-Probleme
```bash
# SMTP-Konfiguration testen
# (aus dem Backend-Container heraus)
docker compose exec backend python -c "
from utils import send_email_notification
import os
send_email_notification(
    os.getenv('SMTP_HOST'),
    int(os.getenv('SMTP_PORT', 587)),
    os.getenv('SMTP_USERNAME'),
    os.getenv('SMTP_PASSWORD'),
    os.getenv('SMTP_SENDER'),
    'test@example.com',
    'Test',
    'Test message'
)
"
```

## 🔄 Updates & Wartung

### App Updates
```bash
# Repository Updates ziehen
git pull origin main

# Services neu bauen
docker compose build --no-cache

# Services neu starten
docker compose up -d
```

### Cleanup
```bash
# Alte Container und Images aufräumen
docker system prune -a

# Nur nicht verwendete Images
docker image prune -a

# Data-Verzeichnis aufräumen (Vorsicht!)
# rm -rf data/old-chapters/
```

### Backup
```bash
# Downloads sichern
tar -czf onepiece_backup_$(date +%Y%m%d).tar.gz data/

# Konfiguration sichern
cp backend/.env config_backup.env
```

## 🔧 Entwicklung

### Development Mode
```bash
# Services im Development Mode starten
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Hot Reload für Backend
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8001

# Hot Reload für Frontend
cd frontend
npm run dev
```

### Debugging
```bash
# Backend Debug Modus
docker compose exec backend python -m pdb app.py

# Frontend Debug
cd frontend
npm run dev
# Browser DevTools öffnen
```

---

## 📞 Support

Bei Problemen:
1. Logs prüfen (`docker compose logs`)
2. Health Checks ausführen
3. Port-Konflikte prüfen
4. Issue im Repository erstellen

**Happy Reading! 🏴‍☠️📚**
