#!/bin/bash

# One Piece Offline Reader - Startup Script
# Verwendung: ./run.sh [start|stop|restart|logs|status]

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktionen
print_header() {
    echo -e "${BLUE}"
    echo "🏴‍☠️ One Piece Offline Reader"
    echo "============================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Prüfe ob Docker verfügbar ist
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker ist nicht installiert oder nicht im PATH"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose ist nicht installiert oder nicht verfügbar"
        exit 1
    fi
}

# Prüfe ob .env Datei existiert
check_env() {
    if [ ! -f "backend/.env" ]; then
        print_warning ".env Datei nicht gefunden. Erstelle eine aus der Vorlage..."
        if [ -f ".env" ]; then
            cp .env backend/.env
            print_success ".env Datei erstellt"
        else
            print_error "Keine .env Vorlage gefunden. Bitte erstelle backend/.env manuell."
            exit 1
        fi
    fi
}

# Prüfe Port-Verfügbarkeit
check_ports() {
    if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 8001 ist bereits belegt"
    fi
    
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3001 ist bereits belegt"
    fi
}

# Services starten
start_services() {
    print_header
    print_info "Starte One Piece Offline Reader..."
    
    check_docker
    check_env
    check_ports
    
    # Docker Compose starten
    docker compose up -d
    
    print_success "Services gestartet!"
    
    # Warte auf Services
    print_info "Warte auf Services..."
    sleep 10
    
    # Health Checks
    print_info "Führe Health Checks durch..."
    
    # Backend Health Check
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        print_success "Backend ist erreichbar"
    else
        print_warning "Backend noch nicht bereit..."
    fi
    
    # Frontend Health Check
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        print_success "Frontend ist erreichbar"
    else
        print_warning "Frontend noch nicht bereit..."
    fi
    
    echo
    print_success "One Piece Offline Reader ist gestartet!"
    echo
    print_info "Zugriff:"
    echo "  🌐 Frontend:    http://localhost:3001"
    echo "  🔧 Backend API: http://localhost:8001"
    echo "  📚 API Docs:    http://localhost:8001/docs"
    echo
    print_info "Logs anzeigen: ./run.sh logs"
    print_info "Status prüfen: ./run.sh status"
}

# Services stoppen
stop_services() {
    print_header
    print_info "Stoppe One Piece Offline Reader..."
    
    docker compose down
    
    print_success "Services gestoppt!"
}

# Services neu starten
restart_services() {
    print_header
    print_info "Starte One Piece Offline Reader neu..."
    
    docker compose restart
    
    print_success "Services neu gestartet!"
}

# Logs anzeigen
show_logs() {
    print_header
    print_info "Zeige Logs (Strg+C zum Beenden)..."
    echo
    
    docker compose logs -f
}

# Status anzeigen
show_status() {
    print_header
    print_info "Service Status:"
    echo
    
    # Docker Compose Status
    docker compose ps
    
    echo
    print_info "Health Checks:"
    
    # Backend Health Check
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        print_success "Backend (Port 8001): Online"
    else
        print_error "Backend (Port 8001): Offline"
    fi
    
    # Frontend Health Check
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        print_success "Frontend (Port 3001): Online"
    else
        print_error "Frontend (Port 3001): Offline"
    fi
    
    echo
    print_info "Speicherverbrauch:"
    if [ -d "data" ]; then
        du -sh data/ 2>/dev/null || echo "Keine Downloads vorhanden"
    else
        echo "Kein data/ Verzeichnis gefunden"
    fi
}

# Setup für erste Verwendung
first_time_setup() {
    print_header
    print_info "Führe ersten Setup durch..."
    
    # Prüfe Voraussetzungen
    check_docker
    
    # Erstelle .env wenn nicht vorhanden
    if [ ! -f "backend/.env" ]; then
        print_info "Erstelle .env Datei..."
        if [ -f ".env" ]; then
            cp .env backend/.env
        else
            print_error "Keine .env Vorlage gefunden!"
            exit 1
        fi
    fi
    
    # Erstelle data Verzeichnis
    if [ ! -d "data" ]; then
        print_info "Erstelle data/ Verzeichnis..."
        mkdir -p data
        chmod 755 data
    fi
    
    # Baue Images
    print_info "Baue Docker Images..."
    docker compose build
    
    print_success "Setup abgeschlossen!"
    echo
    print_info "Starte jetzt mit: ./run.sh start"
}

# Update durchführen
update_app() {
    print_header
    print_info "Führe App Update durch..."
    
    # Git Pull
    if command -v git &> /dev/null && [ -d ".git" ]; then
        print_info "Ziehe Updates von Git..."
        git pull origin main
    fi
    
    # Rebuild Images
    print_info "Baue Docker Images neu..."
    docker compose build --no-cache
    
    # Restart Services
    print_info "Starte Services neu..."
    docker compose up -d
    
    print_success "Update abgeschlossen!"
}

# Hauptlogik
case ${1:-start} in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    setup)
        first_time_setup
        ;;
    update)
        update_app
        ;;
    *)
        print_header
        echo "Verwendung: $0 [start|stop|restart|logs|status|setup|update]"
        echo
        echo "Kommandos:"
        echo "  start    - Startet die Services (Standard)"
        echo "  stop     - Stoppt die Services"
        echo "  restart  - Startet die Services neu"
        echo "  logs     - Zeigt Live-Logs an"
        echo "  status   - Zeigt Service-Status an"
        echo "  setup    - Führt ersten Setup durch"
        echo "  update   - Führt App-Update durch"
        echo
        exit 1
        ;;
esac
