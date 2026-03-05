# BarGest Togo - Application de gestion bar-restaurant

## Architecture
- **Frontend**: Expo (React Native) avec Expo Router (file-based routing)
- **Backend**: Express.js avec TypeScript (port 5000)
- **Base de données**: PostgreSQL (Replit DB) avec Drizzle ORM
- **Auth**: Sessions Express + bcryptjs (cookies)

## Structure des fichiers
```
app/
  _layout.tsx           # Root layout avec AuthProvider et QueryClientProvider
  (auth)/
    _layout.tsx         # Stack layout pour l'auth
    login.tsx           # Écran de connexion
    register.tsx        # Écran d'inscription
  (tabs)/
    _layout.tsx         # Tab bar (NativeTabs iOS 26+ / Tabs classique)
    index.tsx           # Dashboard (statistiques du jour)
    inventaire.tsx      # Inventaire produits (prix achat/vente FCFA)
    ventes.tsx          # Enregistrement et historique des ventes
    depenses.tsx        # Gestion des dépenses

context/
  auth.tsx              # Contexte d'authentification

server/
  index.ts              # Serveur Express
  routes.ts             # Routes API (/api/auth, /api/produits, /api/ventes, /api/depenses, /api/dashboard)
  storage.ts            # DatabaseStorage avec Drizzle
  db.ts                 # Connexion PostgreSQL

shared/
  schema.ts             # Schéma Drizzle (users, produits, ventes, venteItems, depenses)
```

## Routes API
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Utilisateur courant
- `GET/POST/PUT/DELETE /api/produits` - CRUD produits
- `GET/POST /api/ventes` - Ventes
- `GET/POST/PUT/DELETE /api/depenses` - Dépenses
- `GET /api/dashboard` - Statistiques du jour

## Thème & Design
- Palette: vert forêt (#2D6A4F), amber (#E9A818), fond clair (#F4F7F5)
- Police: Inter (400, 500, 600, 700)
- Design natif mobile inspiré d'Airbnb / Coinbase

## Packages installés (clés)
- `bcryptjs` + `@types/bcryptjs` - Hashage des mots de passe
- `express-session` + `connect-pg-simple` - Sessions persistantes en DB
- `drizzle-orm` + `pg` - ORM PostgreSQL

## Workflows
- **Start Backend**: `npm run server:dev` (port 5000)
- **Start Frontend**: `npm run expo:dev` (port 8081)
