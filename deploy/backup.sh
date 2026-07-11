#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/photo.ladyzenko.ru"
BACKUP_DIR="/var/backups/photo.ladyzenko.ru"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"
tar -czf "$BACKUP_DIR/archive-$STAMP.tar.gz" data storage
find "$BACKUP_DIR" -type f -name 'archive-*.tar.gz' -mtime +30 -delete
