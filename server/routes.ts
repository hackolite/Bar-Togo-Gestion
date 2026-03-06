import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertProduitSchema,
  insertVenteSchema,
  insertDepenseSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non authentifié" });
  }
  next();
}

const PRODUITS_DEFAUT = [
  // ── BOISSONS SOFTS ──
  { nom: "Coca-Cola 33cl", emoji: "🥤", categorie: "Boissons", prixAchat: "250", prixVente: "400", stock: 50 },
  { nom: "Coca-Cola 50cl", emoji: "🥤", categorie: "Boissons", prixAchat: "350", prixVente: "500", stock: 50 },
  { nom: "Fanta Orange 33cl", emoji: "🍊", categorie: "Boissons", prixAchat: "250", prixVente: "400", stock: 48 },
  { nom: "Fanta Citron 33cl", emoji: "🍋", categorie: "Boissons", prixAchat: "250", prixVente: "400", stock: 36 },
  { nom: "Sprite 33cl", emoji: "💚", categorie: "Boissons", prixAchat: "250", prixVente: "400", stock: 40 },
  { nom: "Mirinda Orange 33cl", emoji: "🍊", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 30 },
  { nom: "Mirinda Citron 33cl", emoji: "🍋", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 30 },
  { nom: "Pepsi 33cl", emoji: "🥤", categorie: "Boissons", prixAchat: "220", prixVente: "400", stock: 24 },
  { nom: "7UP 33cl", emoji: "🫧", categorie: "Boissons", prixAchat: "220", prixVente: "400", stock: 24 },
  { nom: "Malta Guinness 33cl", emoji: "🌾", categorie: "Boissons", prixAchat: "300", prixVente: "500", stock: 36 },
  { nom: "Youki Citrus 33cl", emoji: "🍋", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 48 },
  { nom: "Youki Ananas 33cl", emoji: "🍍", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 48 },
  { nom: "Youki Pomme 33cl", emoji: "🍏", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 36 },
  { nom: "Youki Raisin 33cl", emoji: "🍇", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 24 },
  { nom: "Schweppes Tonic 33cl", emoji: "🫧", categorie: "Boissons", prixAchat: "350", prixVente: "600", stock: 20 },
  { nom: "Schweppes Citrus 33cl", emoji: "🍋", categorie: "Boissons", prixAchat: "350", prixVente: "600", stock: 20 },
  { nom: "Top Ananas 33cl", emoji: "🍍", categorie: "Boissons", prixAchat: "180", prixVente: "300", stock: 30 },
  { nom: "Top Citron 33cl", emoji: "🍋", categorie: "Boissons", prixAchat: "180", prixVente: "300", stock: 30 },
  // ── EAUX ──
  { nom: "Eau Minérale SBL 50cl", emoji: "💧", categorie: "Boissons", prixAchat: "150", prixVente: "250", stock: 60 },
  { nom: "Eau Minérale SBL 1.5L", emoji: "💧", categorie: "Boissons", prixAchat: "350", prixVente: "500", stock: 30 },
  { nom: "Eau Minérale Omi 50cl", emoji: "💧", categorie: "Boissons", prixAchat: "150", prixVente: "250", stock: 60 },
  { nom: "Eau Minérale Omi 1.5L", emoji: "💧", categorie: "Boissons", prixAchat: "350", prixVente: "500", stock: 24 },
  { nom: "Eau Gazeuse 50cl", emoji: "🫧", categorie: "Boissons", prixAchat: "400", prixVente: "700", stock: 20 },
  // ── JUS MAISON ──
  { nom: "Jus d'Orange (verre)", emoji: "🍊", categorie: "Boissons", prixAchat: "100", prixVente: "500", stock: 0 },
  { nom: "Jus Ananas maison", emoji: "🍍", categorie: "Boissons", prixAchat: "100", prixVente: "500", stock: 0 },
  { nom: "Bissap maison (verre)", emoji: "🌺", categorie: "Boissons", prixAchat: "80", prixVente: "400", stock: 0 },
  { nom: "Gnamakoudji (verre)", emoji: "🫚", categorie: "Boissons", prixAchat: "80", prixVente: "400", stock: 0 },
  { nom: "Jus Tamarin maison", emoji: "🍵", categorie: "Boissons", prixAchat: "80", prixVente: "400", stock: 0 },
  { nom: "Sobolo maison (verre)", emoji: "🌸", categorie: "Boissons", prixAchat: "80", prixVente: "400", stock: 0 },
  // ── CAFÉS / THÉS ──
  { nom: "Café Expresso", emoji: "☕", categorie: "Boissons", prixAchat: "100", prixVente: "500", stock: 0 },
  { nom: "Café Nescafé", emoji: "☕", categorie: "Boissons", prixAchat: "100", prixVente: "400", stock: 0 },
  { nom: "Thé Vert (sachet)", emoji: "🍵", categorie: "Boissons", prixAchat: "50", prixVente: "300", stock: 20 },
  { nom: "Infusion locale", emoji: "🌿", categorie: "Boissons", prixAchat: "50", prixVente: "300", stock: 0 },
  // ── BIÈRES (BB LOMÉ / SNB) ──
  { nom: "Flag Spéciale 65cl", emoji: "🍺", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 96 },
  { nom: "Flag Spéciale 33cl", emoji: "🍺", categorie: "Alcools", prixAchat: "300", prixVente: "500", stock: 72 },
  { nom: "Castel Beer 65cl", emoji: "🍺", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 72 },
  { nom: "Castel Beer 33cl", emoji: "🍺", categorie: "Alcools", prixAchat: "300", prixVente: "500", stock: 48 },
  { nom: "Guilele 65cl", emoji: "🍺", categorie: "Alcools", prixAchat: "450", prixVente: "750", stock: 60 },
  { nom: "Guilele 33cl", emoji: "🍺", categorie: "Alcools", prixAchat: "280", prixVente: "500", stock: 48 },
  { nom: "Awooyo 65cl", emoji: "🍺", categorie: "Alcools", prixAchat: "450", prixVente: "750", stock: 48 },
  { nom: "33 Export 65cl", emoji: "🍺", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 48 },
  { nom: "Star Beer 65cl", emoji: "⭐", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 36 },
  { nom: "TCB 65cl", emoji: "🍺", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 36 },
  { nom: "Beaufort 65cl", emoji: "🍺", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 24 },
  { nom: "Guinness 50cl", emoji: "🖤", categorie: "Alcools", prixAchat: "600", prixVente: "1000", stock: 36 },
  { nom: "Heineken 33cl", emoji: "🟢", categorie: "Alcools", prixAchat: "600", prixVente: "1000", stock: 24 },
  { nom: "Desperados 33cl", emoji: "🍺", categorie: "Alcools", prixAchat: "700", prixVente: "1200", stock: 24 },
  { nom: "Becks 33cl", emoji: "🍺", categorie: "Alcools", prixAchat: "700", prixVente: "1200", stock: 12 },
  { nom: "Amstel 33cl", emoji: "🍺", categorie: "Alcools", prixAchat: "600", prixVente: "1000", stock: 12 },
  // ── SPIRITUEUX ──
  { nom: "Rhum Negrita 4cl", emoji: "🥃", categorie: "Alcools", prixAchat: "200", prixVente: "500", stock: 0 },
  { nom: "Rhum Negrita 20cl", emoji: "🥃", categorie: "Alcools", prixAchat: "1500", prixVente: "2500", stock: 6 },
  { nom: "Rhum Diplomatico 4cl", emoji: "🥃", categorie: "Alcools", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Whisky JD 4cl", emoji: "🥃", categorie: "Alcools", prixAchat: "800", prixVente: "2000", stock: 0 },
  { nom: "Whisky JB 4cl", emoji: "🥃", categorie: "Alcools", prixAchat: "600", prixVente: "1500", stock: 0 },
  { nom: "Whisky Ballantine's 4cl", emoji: "🥃", categorie: "Alcools", prixAchat: "600", prixVente: "1500", stock: 0 },
  { nom: "Vodka Smirnoff 4cl", emoji: "🍸", categorie: "Alcools", prixAchat: "500", prixVente: "1200", stock: 0 },
  { nom: "Gordon's Gin 4cl", emoji: "🍸", categorie: "Alcools", prixAchat: "500", prixVente: "1200", stock: 0 },
  { nom: "Pastis Ricard 4cl", emoji: "🌟", categorie: "Alcools", prixAchat: "400", prixVente: "1000", stock: 0 },
  { nom: "Campari 4cl", emoji: "🔴", categorie: "Alcools", prixAchat: "500", prixVente: "1200", stock: 0 },
  { nom: "Baileys 4cl", emoji: "🍮", categorie: "Alcools", prixAchat: "700", prixVente: "1500", stock: 0 },
  { nom: "Schnapps Apfelkorn 4cl", emoji: "🍏", categorie: "Alcools", prixAchat: "400", prixVente: "800", stock: 0 },
  { nom: "Liqueur Amaretto 4cl", emoji: "🍒", categorie: "Alcools", prixAchat: "500", prixVente: "1200", stock: 0 },
  { nom: "Tequila 4cl", emoji: "🌵", categorie: "Alcools", prixAchat: "600", prixVente: "1500", stock: 0 },
  // ── VINS ──
  { nom: "Vin Rouge (verre)", emoji: "🍷", categorie: "Alcools", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Vin Blanc (verre)", emoji: "🥂", categorie: "Alcools", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Vin Rosé (verre)", emoji: "🌸", categorie: "Alcools", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Champagne (flûte)", emoji: "🍾", categorie: "Alcools", prixAchat: "1500", prixVente: "4000", stock: 0 },
  { nom: "Prosecco (verre)", emoji: "🥂", categorie: "Alcools", prixAchat: "1000", prixVente: "3000", stock: 0 },
  // ── COCKTAILS ──
  { nom: "Mojito", emoji: "🍃", categorie: "Cocktails", prixAchat: "500", prixVente: "2000", stock: 0 },
  { nom: "Daiquiri", emoji: "🍓", categorie: "Cocktails", prixAchat: "500", prixVente: "2000", stock: 0 },
  { nom: "Piña Colada", emoji: "🍍", categorie: "Cocktails", prixAchat: "600", prixVente: "2500", stock: 0 },
  { nom: "Sex on the Beach", emoji: "🏖️", categorie: "Cocktails", prixAchat: "600", prixVente: "2500", stock: 0 },
  { nom: "Blue Lagoon", emoji: "🌊", categorie: "Cocktails", prixAchat: "500", prixVente: "2000", stock: 0 },
  { nom: "Tequila Sunrise", emoji: "🌅", categorie: "Cocktails", prixAchat: "600", prixVente: "2500", stock: 0 },
  { nom: "Cuba Libre", emoji: "🇨🇺", categorie: "Cocktails", prixAchat: "500", prixVente: "2000", stock: 0 },
  { nom: "Gin Tonic", emoji: "🫗", categorie: "Cocktails", prixAchat: "600", prixVente: "2000", stock: 0 },
  { nom: "Spritz Aperol", emoji: "🟠", categorie: "Cocktails", prixAchat: "700", prixVente: "2500", stock: 0 },
  { nom: "Margarita", emoji: "🍹", categorie: "Cocktails", prixAchat: "600", prixVente: "2500", stock: 0 },
  // ── NOURRITURE ──
  { nom: "Arachides grillées (portion)", emoji: "🥜", categorie: "Nourriture", prixAchat: "100", prixVente: "300", stock: 0 },
  { nom: "Chips Crunchy", emoji: "🥔", categorie: "Nourriture", prixAchat: "150", prixVente: "300", stock: 30 },
  { nom: "Biscuits Salés", emoji: "🍪", categorie: "Nourriture", prixAchat: "100", prixVente: "200", stock: 24 },
  { nom: "Omelette", emoji: "🍳", categorie: "Nourriture", prixAchat: "300", prixVente: "800", stock: 0 },
  { nom: "Brochettes de bœuf (5 pics)", emoji: "🍢", categorie: "Nourriture", prixAchat: "800", prixVente: "2000", stock: 0 },
  { nom: "Brochettes de poulet (5 pics)", emoji: "🍗", categorie: "Nourriture", prixAchat: "700", prixVente: "1800", stock: 0 },
  { nom: "Alloco (portion)", emoji: "🍌", categorie: "Nourriture", prixAchat: "200", prixVente: "500", stock: 0 },
  { nom: "Gésiers sautés (portion)", emoji: "🍖", categorie: "Nourriture", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Sardines grillées", emoji: "🐟", categorie: "Nourriture", prixAchat: "800", prixVente: "2000", stock: 0 },
  { nom: "Tilapia grillé", emoji: "🐠", categorie: "Nourriture", prixAchat: "1500", prixVente: "4000", stock: 0 },
  { nom: "Poulet braisé (1/4)", emoji: "🍗", categorie: "Nourriture", prixAchat: "1000", prixVente: "2500", stock: 0 },
  { nom: "Poulet braisé (1/2)", emoji: "🍗", categorie: "Nourriture", prixAchat: "2000", prixVente: "5000", stock: 0 },
  { nom: "Attiéké + Poisson", emoji: "🍚", categorie: "Nourriture", prixAchat: "1000", prixVente: "2500", stock: 0 },
  { nom: "Riz sauce tomate", emoji: "🍅", categorie: "Nourriture", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Sandwich club", emoji: "🥪", categorie: "Nourriture", prixAchat: "600", prixVente: "1500", stock: 0 },
  { nom: "Hot-dog", emoji: "🌭", categorie: "Nourriture", prixAchat: "400", prixVente: "1000", stock: 0 },
  { nom: "Hamburger", emoji: "🍔", categorie: "Nourriture", prixAchat: "700", prixVente: "2000", stock: 0 },
  { nom: "Frites de pomme de terre", emoji: "🍟", categorie: "Nourriture", prixAchat: "300", prixVente: "1000", stock: 0 },
  { nom: "Pizza Margherita (part)", emoji: "🍕", categorie: "Nourriture", prixAchat: "800", prixVente: "2500", stock: 0 },
  { nom: "Salade Niçoise", emoji: "🥗", categorie: "Nourriture", prixAchat: "600", prixVente: "2000", stock: 0 },
  // ── CHICHA / CIGARETTES ──
  { nom: "Chicha / Narguilé (session)", emoji: "💨", categorie: "Autres", prixAchat: "2000", prixVente: "5000", stock: 0 },
  { nom: "Cigarette Marlboro (unité)", emoji: "🚬", categorie: "Autres", prixAchat: "150", prixVente: "300", stock: 40 },
  { nom: "Cigarette Dunhill (unité)", emoji: "🚬", categorie: "Autres", prixAchat: "200", prixVente: "400", stock: 20 },
  { nom: "Cigarillo (unité)", emoji: "🚬", categorie: "Autres", prixAchat: "300", prixVente: "600", stock: 10 },
];

export async function registerRoutes(app: Express): Promise<Server> {
  const PgStore = connectPgSimple(session);

  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "bar-resto-togo-secret-2024",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 },
    })
  );

  // ── AUTH ──
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }
      const hashed = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({ ...data, password: hashed });
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, nom: user.nom });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, nom: user.nom });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Non authentifié" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Utilisateur introuvable" });
    res.json({ id: user.id, email: user.email, nom: user.nom });
  });

  // ── DASHBOARD ──
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.session.userId!);
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── PRODUITS ──
  app.get("/api/produits", requireAuth, async (req, res) => {
    res.json(await storage.getProduits(req.session.userId!));
  });

  app.post("/api/produits", requireAuth, async (req, res) => {
    try {
      const data = insertProduitSchema.parse(req.body);
      res.json(await storage.createProduit({ ...data, userId: req.session.userId! }));
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/produits/:id", requireAuth, async (req, res) => {
    try {
      const data = insertProduitSchema.partial().parse(req.body);
      res.json(await storage.updateProduit(parseInt(req.params.id), data));
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/produits/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteProduit(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ── RÉAPPROVISIONNEMENT ──
  app.post("/api/produits/:id/reappro", requireAuth, async (req, res) => {
    try {
      const { quantite, fournisseur } = req.body;
      if (!quantite || isNaN(Number(quantite)) || Number(quantite) <= 0) {
        return res.status(400).json({ message: "Quantité invalide" });
      }
      const updated = await storage.reapprovisionner(
        parseInt(req.params.id),
        Number(quantite),
        fournisseur || "Autre"
      );
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ── SEED PRODUITS PAR DÉFAUT ──
  app.post("/api/seed/produits", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getProduits(req.session.userId!);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Des produits existent déjà" });
      }
      const created = [];
      for (const p of PRODUITS_DEFAUT) {
        const prod = await storage.createProduit({ ...p, userId: req.session.userId! });
        created.push(prod);
      }
      res.json({ count: created.length, message: `${created.length} produits créés` });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── VENTES ──
  app.get("/api/ventes", requireAuth, async (req, res) => {
    res.json(await storage.getVentes(req.session.userId!));
  });

  app.post("/api/ventes", requireAuth, async (req, res) => {
    try {
      const data = insertVenteSchema.parse(req.body);
      res.json(await storage.createVente(req.session.userId!, data.note, data.items));
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ── DÉPENSES ──
  app.get("/api/depenses", requireAuth, async (req, res) => {
    res.json(await storage.getDepenses(req.session.userId!));
  });

  app.post("/api/depenses", requireAuth, async (req, res) => {
    try {
      const data = insertDepenseSchema.parse(req.body);
      res.json(await storage.createDepense({ ...data, userId: req.session.userId! }));
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/depenses/:id", requireAuth, async (req, res) => {
    try {
      const data = insertDepenseSchema.partial().parse(req.body);
      res.json(await storage.updateDepense(parseInt(req.params.id), data));
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/depenses/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteDepense(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
