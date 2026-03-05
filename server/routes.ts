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
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Non authentifié" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Utilisateur introuvable" });
    res.json({ id: user.id, email: user.email, nom: user.nom });
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.session.userId!);
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/produits", requireAuth, async (req, res) => {
    const list = await storage.getProduits(req.session.userId!);
    res.json(list);
  });

  app.post("/api/produits", requireAuth, async (req, res) => {
    try {
      const data = insertProduitSchema.parse(req.body);
      const p = await storage.createProduit({ ...data, userId: req.session.userId! });
      res.json(p);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/produits/:id", requireAuth, async (req, res) => {
    try {
      const data = insertProduitSchema.partial().parse(req.body);
      const p = await storage.updateProduit(parseInt(req.params.id), data);
      res.json(p);
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

  app.get("/api/ventes", requireAuth, async (req, res) => {
    const list = await storage.getVentes(req.session.userId!);
    res.json(list);
  });

  app.post("/api/ventes", requireAuth, async (req, res) => {
    try {
      const data = insertVenteSchema.parse(req.body);
      const v = await storage.createVente(req.session.userId!, data.note, data.items);
      res.json(v);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/depenses", requireAuth, async (req, res) => {
    const list = await storage.getDepenses(req.session.userId!);
    res.json(list);
  });

  app.post("/api/depenses", requireAuth, async (req, res) => {
    try {
      const data = insertDepenseSchema.parse(req.body);
      const d = await storage.createDepense({ ...data, userId: req.session.userId! });
      res.json(d);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/depenses/:id", requireAuth, async (req, res) => {
    try {
      const data = insertDepenseSchema.partial().parse(req.body);
      const d = await storage.updateDepense(parseInt(req.params.id), data);
      res.json(d);
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
