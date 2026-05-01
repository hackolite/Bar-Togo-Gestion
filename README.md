<div align="center">

<img src="assets/images/icon.png" alt="MaquisGest Togo Logo" width="120" height="120" style="border-radius: 24px;" />

# 🍺 MaquisGest Togo

### Application de gestion pour bars, maquis et restaurants au Togo

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/hackolite/Bar-Togo-Gestion)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo)](https://expo.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)

</div>

---

## 📱 Aperçu

**MaquisGest Togo** est une application web et mobile complète de gestion commerciale, conçue spécialement pour les bars, maquis et petits restaurants togolais. Elle permet de suivre en temps réel les ventes, les stocks, les dépenses et les fournisseurs depuis n'importe quel appareil.

<div align="center">

| Tableau de bord | Gestion des ventes | Inventaire |
|:---:|:---:|:---:|
| ![Dashboard](https://placehold.co/280x500/1a73e8/white?text=📊+Tableau+de+bord) | ![Ventes](https://placehold.co/280x500/34a853/white?text=🛒+Ventes) | ![Inventaire](https://placehold.co/280x500/fbbc04/white?text=📦+Inventaire) |

| Dépenses | Stock | Fournisseurs |
|:---:|:---:|:---:|
| ![Dépenses](https://placehold.co/280x500/ea4335/white?text=💳+Dépenses) | ![Stock](https://placehold.co/280x500/9c27b0/white?text=🗂️+Stock) | ![Fournisseurs](https://placehold.co/280x500/ff6d00/white?text=🏢+Fournisseurs) |

</div>

> 💡 **Note :** Remplacez ces captures d'écran par de vraies photos de l'application en production.

---

## ✨ Fonctionnalités

<table>
<tr>
<td width="50%">

### 📊 Tableau de bord
- Vue synthétique du chiffre d'affaires
- Graphiques de ventes et dépenses
- Alertes de stock faible
- Résumé financier en temps réel

### 🛒 Gestion des ventes
- Caisse rapide avec recherche de produits
- Calcul automatique du total
- Historique complet des transactions
- Notes et commentaires par vente

### 📦 Inventaire & Produits
- Catalogue produits avec photos
- Catégories personnalisables
- Code-barres EAN
- Prix d'achat et de vente

</td>
<td width="50%">

### 🏢 Fournisseurs
- Répertoire des fournisseurs
- Coordonnées complètes
- Historique des achats par fournisseur

### 💳 Dépenses
- Saisie des dépenses par catégorie
- Dépenses récurrentes (loyer, électricité…)
- Suivi mensuel et annuel

### 🗂️ Gestion du stock
- Suivi des entrées/sorties
- Alertes de rupture de stock
- Historique des mouvements

### 🔐 Authentification
- Connexion sécurisée par email/mot de passe
- Données isolées par utilisateur
- Sessions persistantes

</td>
</tr>
</table>

---

## 🏗️ Architecture technique

```
┌─────────────────────────────────────────────────┐
│                  CLIENT (Expo)                   │
│   React Native + Expo Router + TanStack Query    │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐  │
│   │ Mobile │ │  iOS   │ │Android │ │   Web   │  │
│   └────────┘ └────────┘ └────────┘ └─────────┘  │
└─────────────────────┬───────────────────────────┘
                      │ HTTP/REST API
┌─────────────────────▼───────────────────────────┐
│              SERVEUR (Express.js)                │
│         Node.js + Express 5 + Sessions           │
│  ┌────────────┐  ┌──────────────┐  ┌─────────┐  │
│  │   Routes   │  │  Middleware  │  │  Auth   │  │
│  └────────────┘  └──────────────┘  └─────────┘  │
└─────────────────────┬───────────────────────────┘
                      │ Drizzle ORM
┌─────────────────────▼───────────────────────────┐
│              BASE DE DONNÉES                     │
│                  PostgreSQL                      │
│  users │ produits │ ventes │ depenses │ stock    │
└─────────────────────────────────────────────────┘
```

### Stack technologique

| Couche | Technologie |
|--------|-------------|
| Frontend mobile | React Native 0.81, Expo 54, Expo Router |
| Frontend web | React 19, React Native Web |
| Animations | Expo Linear Gradient, Expo Blur |
| Backend | Express.js 5, Node.js 18+ |
| Base de données | PostgreSQL 15+ |
| ORM | Drizzle ORM + Drizzle Kit |
| Validation | Zod |
| État serveur | TanStack Query v5 |
| Authentification | Express Session + bcryptjs |

---

## 🚀 Installation sur serveur IONOS

> Guide complet pour déployer MaquisGest Togo sur un VPS ou serveur dédié IONOS.

### Prérequis

- Serveur IONOS **VPS Linux** (Ubuntu 22.04 LTS recommandé) ou serveur dédié
- Accès SSH avec droits `sudo`
- Un nom de domaine (ex : `maquis.mondomaine.tg`) pointant vers l'IP du serveur
- Minimum : **2 Go de RAM**, **20 Go de disque**

---

### Étape 1 — Connexion et préparation du serveur

```bash
# Connectez-vous à votre serveur IONOS via SSH
ssh root@VOTRE_IP_IONOS

# Mettez à jour le système
apt update && apt upgrade -y

# Installez les outils essentiels
apt install -y curl wget git unzip build-essential ufw
```

---

### Étape 2 — Installer Node.js 20 (LTS)

```bash
# Ajout du dépôt NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Installation de Node.js
apt install -y nodejs

# Vérification
node --version   # v20.x.x
npm --version    # 10.x.x
```

---

### Étape 3 — Installer PostgreSQL

```bash
# Installation de PostgreSQL
apt install -y postgresql postgresql-contrib

# Démarrage et activation au boot
systemctl enable postgresql
systemctl start postgresql

# Connexion à PostgreSQL en tant que superutilisateur
sudo -u postgres psql

# Dans le shell PostgreSQL, créez la base et l'utilisateur :
CREATE DATABASE maquisgest;
CREATE USER maquisgest_user WITH ENCRYPTED PASSWORD 'MotDePasseFort123!';
GRANT ALL PRIVILEGES ON DATABASE maquisgest TO maquisgest_user;
\c maquisgest
GRANT ALL ON SCHEMA public TO maquisgest_user;
\q
```

---

### Étape 4 — Installer PM2 (gestionnaire de processus)

```bash
# Installation globale de PM2
npm install -g pm2

# Configuration du démarrage automatique
pm2 startup systemd
# Suivez l'instruction affichée (copiez-collez la commande sudo)
```

---

### Étape 5 — Cloner et configurer l'application

```bash
# Créez un répertoire dédié
mkdir -p /var/www/maquisgest
cd /var/www/maquisgest

# Clonez le dépôt
git clone https://github.com/hackolite/Bar-Togo-Gestion.git .

# Installez les dépendances
npm install
```

---

### Étape 6 — Configurer les variables d'environnement

```bash
# Créez le fichier .env
nano /var/www/maquisgest/.env
```

Contenu du fichier `.env` :

```env
# ============================================
# CONFIGURATION MAQUISGEST TOGO - PRODUCTION
# ============================================

# Base de données PostgreSQL
DATABASE_URL=postgresql://maquisgest_user:MotDePasseFort123!@localhost:5432/maquisgest

# Serveur
NODE_ENV=production
PORT=5000

# Session (générez une clé aléatoire forte)
SESSION_SECRET=remplacez_par_une_cle_aleatoire_de_64_caracteres_minimum

# Domaine de l'application
APP_DOMAIN=maquis.mondomaine.tg
```

> 🔑 Générez une clé SESSION_SECRET sécurisée :
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

### Étape 7 — Initialiser la base de données

```bash
cd /var/www/maquisgest

# Chargez les variables d'environnement
export $(grep -v '^#' .env | xargs)

# Créez les tables dans la base de données
npm run db:push
```

---

### Étape 8 — Construire l'application web

```bash
cd /var/www/maquisgest

# Construisez le bundle web statique
npm run expo:static:build

# Construisez le serveur backend
npm run server:build
```

---

### Étape 9 — Lancer avec PM2

```bash
cd /var/www/maquisgest

# Démarrez le serveur en production
pm2 start server_dist/index.js \
  --name "maquisgest" \
  --env production \
  --time

# Sauvegardez la configuration PM2
pm2 save

# Vérifiez que le serveur tourne
pm2 status
pm2 logs maquisgest --lines 20
```

---

### Étape 10 — Installer et configurer Nginx

```bash
# Installation de Nginx
apt install -y nginx

# Activation au démarrage
systemctl enable nginx
systemctl start nginx
```

Créez la configuration Nginx pour votre domaine :

```bash
nano /etc/nginx/sites-available/maquisgest
```

Collez la configuration suivante (remplacez `maquis.mondomaine.tg`) :

```nginx
server {
    listen 80;
    server_name maquis.mondomaine.tg www.maquis.mondomaine.tg;

    # Taille max des uploads (photos produits)
    client_max_body_size 10M;

    # Logs
    access_log /var/log/nginx/maquisgest.access.log;
    error_log  /var/log/nginx/maquisgest.error.log;

    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Cache des assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Activez le site
ln -s /etc/nginx/sites-available/maquisgest /etc/nginx/sites-enabled/

# Vérifiez la configuration
nginx -t

# Redémarrez Nginx
systemctl reload nginx
```

---

### Étape 11 — Certificat SSL gratuit avec Let's Encrypt

```bash
# Installation de Certbot
apt install -y certbot python3-certbot-nginx

# Obtention du certificat SSL (remplacez le domaine et l'email)
certbot --nginx \
  -d maquis.mondomaine.tg \
  -d www.maquis.mondomaine.tg \
  --email votre@email.com \
  --agree-tos \
  --non-interactive

# Vérification du renouvellement automatique
certbot renew --dry-run
```

---

### Étape 12 — Configurer le pare-feu

```bash
# Autorisez SSH, HTTP et HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'

# Activez le pare-feu
ufw enable

# Vérification
ufw status
```

---

### Étape 13 — Sauvegardes automatiques de la base de données

```bash
# Créez le script de sauvegarde
mkdir -p /var/backups/maquisgest
nano /usr/local/bin/backup-maquisgest.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/maquisgest"
DB_NAME="maquisgest"
DB_USER="maquisgest_user"

# Sauvegarde PostgreSQL
PGPASSWORD="MotDePasseFort123!" pg_dump -U $DB_USER $DB_NAME \
  | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Suppression des sauvegardes de plus de 30 jours
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "✅ Sauvegarde réussie : db_$DATE.sql.gz"
```

```bash
# Rendez le script exécutable
chmod +x /usr/local/bin/backup-maquisgest.sh

# Ajoutez une tâche cron (sauvegarde quotidienne à 2h du matin)
crontab -e
# Ajoutez cette ligne :
0 2 * * * /usr/local/bin/backup-maquisgest.sh >> /var/log/maquisgest-backup.log 2>&1
```

---

### Vérification finale

```bash
# Statut de PM2
pm2 status

# Statut de Nginx
systemctl status nginx

# Statut de PostgreSQL
systemctl status postgresql

# Tester l'accès
curl -I https://maquis.mondomaine.tg
```

✅ Votre application est accessible sur **https://maquis.mondomaine.tg**

---

### Mise à jour de l'application

Pour déployer une nouvelle version :

```bash
cd /var/www/maquisgest

# Récupérez les dernières modifications
git pull origin main

# Installez les nouvelles dépendances si nécessaire
npm install

# Appliquez les migrations de base de données
export $(grep -v '^#' .env | xargs)
npm run db:push

# Reconstruisez l'application
npm run expo:static:build
npm run server:build

# Redémarrez le serveur sans interruption
pm2 reload maquisgest
```

---

## 📁 Structure du projet

```
Bar-Togo-Gestion/
├── app/                        # Application Expo (pages et navigation)
│   ├── (auth)/                 # Écrans d'authentification
│   └── (tabs)/                 # Onglets principaux
│       ├── index.tsx           # 📊 Tableau de bord
│       ├── inventaire.tsx      # 📦 Produits
│       ├── ventes.tsx          # 🛒 Ventes
│       ├── achats.tsx          # 🚚 Achats fournisseurs
│       ├── depenses.tsx        # 💳 Dépenses
│       ├── stock.tsx           # 🗂️ Gestion du stock
│       └── fournisseurs.tsx    # 🏢 Fournisseurs
├── server/                     # Backend Express.js
│   ├── index.ts                # Point d'entrée du serveur
│   ├── routes.ts               # Routes API REST
│   ├── db.ts                   # Connexion base de données
│   └── storage.ts              # Gestion des fichiers
├── shared/
│   └── schema.ts               # Schéma Drizzle ORM (modèles de données)
├── components/                 # Composants React Native réutilisables
├── context/                    # Contextes React (auth, etc.)
├── constants/                  # Couleurs, thèmes, constantes
├── assets/images/              # Icônes et images
├── static-build/               # Build web généré (Expo)
└── server_dist/                # Build serveur généré (esbuild)
```

---

## 🔧 Développement local

```bash
# 1. Clonez le projet
git clone https://github.com/hackolite/Bar-Togo-Gestion.git
cd Bar-Togo-Gestion

# 2. Installez les dépendances
npm install

# 3. Configurez la base de données locale
cp .env.example .env
# Éditez .env avec vos paramètres PostgreSQL locaux

# 4. Initialisez la base de données
npm run db:push

# 5. Démarrez le serveur backend
npm run server:dev

# 6. Dans un autre terminal, démarrez Expo
npm run start
```

---

## 🐛 Résolution de problèmes

| Problème | Solution |
|----------|----------|
| `DATABASE_URL` manquant | Vérifiez le fichier `.env` et que PostgreSQL est démarré |
| Port 5000 déjà utilisé | Modifiez `PORT` dans `.env` |
| Build web échoue | Vérifiez Node.js ≥ 18 et relancez `npm install` |
| PM2 ne démarre pas | Vérifiez `pm2 logs maquisgest` pour les erreurs |
| Nginx 502 Bad Gateway | Vérifiez que PM2 tourne : `pm2 status` |
| Certificat SSL échoue | Vérifiez que le domaine pointe vers l'IP du serveur |

---

## 📄 Licence

Ce projet est privé et propriétaire. Tous droits réservés © 2025 MaquisGest Togo.

---

<div align="center">

Fait avec ❤️ pour les commerçants togolais 🇹🇬

</div>
