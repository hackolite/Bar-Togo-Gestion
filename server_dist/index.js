var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  achatsFournisseurs: () => achatsFournisseurs,
  achatsFournisseursRelations: () => achatsFournisseursRelations,
  depenses: () => depenses,
  depensesRelations: () => depensesRelations,
  insertAchatFournisseurSchema: () => insertAchatFournisseurSchema,
  insertDepenseSchema: () => insertDepenseSchema,
  insertProduitSchema: () => insertProduitSchema,
  insertUserSchema: () => insertUserSchema,
  insertVenteSchema: () => insertVenteSchema,
  produits: () => produits,
  produitsRelations: () => produitsRelations,
  users: () => users,
  usersRelations: () => usersRelations,
  venteItems: () => venteItems,
  venteItemsRelations: () => venteItemsRelations,
  ventes: () => ventes,
  ventesRelations: () => ventesRelations
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  serial
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  nom: text("nom").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var produits = pgTable("produits", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  description: text("description"),
  emoji: text("emoji"),
  image: text("image"),
  ean: text("ean"),
  categorie: text("categorie").notNull().default("Boissons"),
  prixAchat: numeric("prix_achat", { precision: 12, scale: 2 }).notNull(),
  prixVente: numeric("prix_vente", { precision: 12, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var ventes = pgTable("ventes", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().default(sql`now()`),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var venteItems = pgTable("vente_items", {
  id: serial("id").primaryKey(),
  venteId: integer("vente_id").references(() => ventes.id, { onDelete: "cascade" }).notNull(),
  produitId: integer("produit_id").references(() => produits.id).notNull(),
  quantite: integer("quantite").notNull(),
  prixUnitaire: numeric("prix_unitaire", { precision: 12, scale: 2 }).notNull()
});
var depenses = pgTable("depenses", {
  id: serial("id").primaryKey(),
  libelle: text("libelle").notNull(),
  montant: numeric("montant", { precision: 12, scale: 2 }).notNull(),
  categorie: text("categorie").notNull().default("G\xE9n\xE9ral"),
  date: timestamp("date").notNull().default(sql`now()`),
  note: text("note"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var achatsFournisseurs = pgTable("achats_fournisseurs", {
  id: serial("id").primaryKey(),
  produitId: integer("produit_id").references(() => produits.id).notNull(),
  quantite: integer("quantite").notNull(),
  prixUnitaire: numeric("prix_unitaire", { precision: 12, scale: 2 }).notNull(),
  fournisseur: text("fournisseur").notNull().default("Autre"),
  date: timestamp("date").notNull().default(sql`now()`),
  note: text("note"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  produits: many(produits),
  ventes: many(ventes),
  depenses: many(depenses),
  achatsFournisseurs: many(achatsFournisseurs)
}));
var produitsRelations = relations(produits, ({ one, many }) => ({
  user: one(users, { fields: [produits.userId], references: [users.id] }),
  venteItems: many(venteItems),
  achatsFournisseurs: many(achatsFournisseurs)
}));
var ventesRelations = relations(ventes, ({ one, many }) => ({
  user: one(users, { fields: [ventes.userId], references: [users.id] }),
  items: many(venteItems)
}));
var venteItemsRelations = relations(venteItems, ({ one }) => ({
  vente: one(ventes, { fields: [venteItems.venteId], references: [ventes.id] }),
  produit: one(produits, {
    fields: [venteItems.produitId],
    references: [produits.id]
  })
}));
var depensesRelations = relations(depenses, ({ one }) => ({
  user: one(users, { fields: [depenses.userId], references: [users.id] })
}));
var achatsFournisseursRelations = relations(achatsFournisseurs, ({ one }) => ({
  user: one(users, { fields: [achatsFournisseurs.userId], references: [users.id] }),
  produit: one(produits, { fields: [achatsFournisseurs.produitId], references: [produits.id] })
}));
var insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  nom: true
});
var insertProduitSchema = createInsertSchema(produits).omit({
  id: true,
  userId: true,
  createdAt: true
}).extend({
  prixAchat: z.string().optional().default("0")
});
var insertVenteSchema = z.object({
  note: z.string().optional(),
  items: z.array(
    z.object({
      produitId: z.number(),
      quantite: z.number().min(1),
      prixUnitaire: z.number()
    })
  )
});
var insertDepenseSchema = createInsertSchema(depenses).omit({
  id: true,
  userId: true,
  createdAt: true
});
var insertAchatFournisseurSchema = createInsertSchema(achatsFournisseurs).omit({
  id: true,
  userId: true,
  createdAt: true
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, desc, and, gte, lte, sql as sql2, inArray, lt } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async getProduits(userId) {
    return db.select().from(produits).where(eq(produits.userId, userId)).orderBy(produits.nom);
  }
  async getProduit(id) {
    const [p] = await db.select().from(produits).where(eq(produits.id, id));
    return p;
  }
  async createProduit(produit) {
    const [p] = await db.insert(produits).values(produit).returning();
    return p;
  }
  async updateProduit(id, data) {
    const [p] = await db.update(produits).set(data).where(eq(produits.id, id)).returning();
    return p;
  }
  async deleteProduit(id) {
    await db.delete(produits).where(eq(produits.id, id));
  }
  async getVentes(userId) {
    const allVentes = await db.select().from(ventes).where(eq(ventes.userId, userId)).orderBy(desc(ventes.date));
    const result = [];
    for (const v of allVentes) {
      const items = await db.select({ item: venteItems, produit: produits }).from(venteItems).innerJoin(produits, eq(venteItems.produitId, produits.id)).where(eq(venteItems.venteId, v.id));
      result.push({
        ...v,
        items: items.map((i) => ({ ...i.item, produit: i.produit }))
      });
    }
    return result;
  }
  async createVente(userId, note, items) {
    const total = items.reduce((sum, i) => sum + i.quantite * i.prixUnitaire, 0);
    const [v] = await db.insert(ventes).values({ userId, total: total.toString(), note }).returning();
    for (const item of items) {
      await db.insert(venteItems).values({
        venteId: v.id,
        produitId: item.produitId,
        quantite: item.quantite,
        prixUnitaire: item.prixUnitaire.toString()
      });
      await db.update(produits).set({ stock: sql2`${produits.stock} - ${item.quantite}` }).where(eq(produits.id, item.produitId));
    }
    return v;
  }
  async getDepenses(userId) {
    return db.select().from(depenses).where(eq(depenses.userId, userId)).orderBy(desc(depenses.date));
  }
  async createDepense(depense) {
    const [d] = await db.insert(depenses).values(depense).returning();
    return d;
  }
  async updateDepense(id, data) {
    const [d] = await db.update(depenses).set(data).where(eq(depenses.id, id)).returning();
    return d;
  }
  async deleteDepense(id) {
    await db.delete(depenses).where(eq(depenses.id, id));
  }
  async getAchatsFournisseurs(userId) {
    const rows = await db.select({ achat: achatsFournisseurs, produit: produits }).from(achatsFournisseurs).innerJoin(produits, eq(achatsFournisseurs.produitId, produits.id)).where(eq(achatsFournisseurs.userId, userId)).orderBy(desc(achatsFournisseurs.date));
    return rows.map((r) => ({ ...r.achat, produit: r.produit }));
  }
  async createAchatFournisseur(achat) {
    const [a] = await db.insert(achatsFournisseurs).values(achat).returning();
    await db.update(produits).set({ stock: sql2`${produits.stock} + ${achat.quantite}` }).where(eq(produits.id, achat.produitId));
    const [p] = await db.select().from(produits).where(eq(produits.id, achat.produitId));
    return { ...a, produit: p };
  }
  async deleteAchatFournisseur(id) {
    const [achat] = await db.select().from(achatsFournisseurs).where(eq(achatsFournisseurs.id, id));
    if (achat) {
      await db.update(produits).set({ stock: sql2`GREATEST(0, ${produits.stock} - ${achat.quantite})` }).where(eq(produits.id, achat.produitId));
    }
    await db.delete(achatsFournisseurs).where(eq(achatsFournisseurs.id, id));
  }
  async reapprovisionner(id, quantite, fournisseur) {
    const [updated] = await db.update(produits).set({ stock: sql2`${produits.stock} + ${quantite}` }).where(eq(produits.id, id)).returning();
    return updated;
  }
  async getDashboardStats(userId) {
    const now = /* @__PURE__ */ new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [ventesToday, depensesToday, ventesHier, depensesHier, cogsRow, topProduitsRaw, depensesFixesMois, alertesStockRaw] = await Promise.all([
      db.select({ total: ventes.total }).from(ventes).where(and(eq(ventes.userId, userId), gte(ventes.date, todayStart), lte(ventes.date, tomorrowStart))),
      db.select({ montant: depenses.montant }).from(depenses).where(and(eq(depenses.userId, userId), gte(depenses.date, todayStart), lte(depenses.date, tomorrowStart))),
      db.select({ total: ventes.total }).from(ventes).where(and(eq(ventes.userId, userId), gte(ventes.date, yesterdayStart), lte(ventes.date, todayStart))),
      db.select({ montant: depenses.montant }).from(depenses).where(and(eq(depenses.userId, userId), gte(depenses.date, yesterdayStart), lte(depenses.date, todayStart))),
      // COGS: coût d'achat des produits vendus aujourd'hui
      db.select({ cogs: sql2`coalesce(sum(${venteItems.quantite} * ${produits.prixAchat}::numeric), 0)` }).from(venteItems).innerJoin(produits, eq(venteItems.produitId, produits.id)).innerJoin(ventes, eq(venteItems.venteId, ventes.id)).where(and(eq(ventes.userId, userId), gte(ventes.date, todayStart), lte(ventes.date, tomorrowStart))),
      // Top produits du jour
      db.select({
        nom: produits.nom,
        quantite: sql2`sum(${venteItems.quantite})`,
        total: sql2`sum(${venteItems.quantite} * ${venteItems.prixUnitaire})`
      }).from(venteItems).innerJoin(produits, eq(venteItems.produitId, produits.id)).innerJoin(ventes, eq(venteItems.venteId, ventes.id)).where(and(eq(ventes.userId, userId), gte(ventes.date, todayStart), lte(ventes.date, tomorrowStart))).groupBy(produits.nom).orderBy(desc(sql2`sum(${venteItems.quantite} * ${venteItems.prixUnitaire})`)).limit(5),
      // Dépenses fixes du mois (loyer, électricité, eau, salaires)
      db.select({ montant: depenses.montant }).from(depenses).where(and(
        eq(depenses.userId, userId),
        gte(depenses.date, startOfMonth),
        inArray(depenses.categorie, ["Loyer", "\xC9lectricit\xE9 (CEET)", "Eau (TdE)", "Salaires"])
      )),
      // Alertes stock < 10
      db.select({ id: produits.id, nom: produits.nom, stock: produits.stock, categorie: produits.categorie }).from(produits).where(and(eq(produits.userId, userId), lt(produits.stock, 10))).orderBy(produits.stock).limit(15)
    ]);
    const ventesAujourdhui = ventesToday.reduce((s, v) => s + parseFloat(v.total), 0);
    const depensesAujourdhui = depensesToday.reduce((s, d) => s + parseFloat(d.montant), 0);
    const totalVentesHier = ventesHier.reduce((s, v) => s + parseFloat(v.total), 0);
    const totalDepensesHier = depensesHier.reduce((s, d) => s + parseFloat(d.montant), 0);
    const coutsVentesAujourdhui = parseFloat(cogsRow[0]?.cogs ?? "0");
    const beneficeNetAujourdhui = ventesAujourdhui - coutsVentesAujourdhui - depensesAujourdhui;
    const totalDepensesFixesMois = depensesFixesMois.reduce((s, d) => s + parseFloat(d.montant), 0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysLeft = daysInMonth - dayOfMonth + 1;
    const provisionnementJournalier = daysInMonth > 0 ? Math.ceil(totalDepensesFixesMois / daysInMonth) : 0;
    const restantAMettreDecote = Math.max(0, totalDepensesFixesMois - depensesFixesMois.filter(() => true).reduce((s, d) => s + parseFloat(d.montant), 0));
    return {
      ventesAujourdhui,
      depensesAujourdhui,
      coutsVentesAujourdhui,
      beneficeNetAujourdhui,
      totalVentesHier,
      totalDepensesHier,
      topProduits: topProduitsRaw.map((p) => ({ nom: p.nom, quantite: Number(p.quantite), total: Number(p.total) })),
      previsionnel: {
        totalDepensesFixesMois,
        provisionnementJournalier,
        daysLeft,
        daysInMonth,
        dayOfMonth
      },
      alertesStock: alertesStockRaw
    };
  }
  async getAnalytics(userId) {
    const rows = await db.select({
      venteId: ventes.id,
      date: ventes.date,
      revenue: sql2`sum(${venteItems.quantite} * ${venteItems.prixUnitaire}::numeric)`,
      quantity: sql2`sum(${venteItems.quantite})`,
      margin: sql2`sum(${venteItems.quantite} * (${venteItems.prixUnitaire}::numeric - COALESCE(${produits.prixAchat}::numeric, 0)))`,
      hour: sql2`extract(hour from ${ventes.date})`,
      dayOfWeek: sql2`extract(dow from ${ventes.date})`
    }).from(ventes).innerJoin(venteItems, eq(venteItems.venteId, ventes.id)).innerJoin(produits, eq(venteItems.produitId, produits.id)).where(eq(ventes.userId, userId)).groupBy(ventes.id, ventes.date).orderBy(desc(ventes.date));
    return rows.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date).split("T")[0],
      revenue: parseFloat(r.revenue ?? "0"),
      quantity: parseInt(r.quantity ?? "0", 10),
      margin: parseFloat(r.margin ?? "0"),
      hour: Number(r.hour),
      dayOfWeek: Number(r.dayOfWeek)
    }));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import * as fs from "fs";
import * as path from "path";
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non authentifi\xE9" });
  }
  next();
}
var PRODUITS_DEFAUT = [
  // ── BOISSONS SOFTS ──
  { nom: "Coca-Cola 33cl", emoji: "\u{1F964}", ean: "5449000000996", categorie: "Boissons", prixAchat: "250", prixVente: "400", stock: 50 },
  { nom: "Coca-Cola 50cl", emoji: "\u{1F964}", ean: "5449000014832", categorie: "Boissons", prixAchat: "350", prixVente: "500", stock: 50 },
  { nom: "Fanta Orange 33cl", emoji: "\u{1F34A}", ean: "5449000133328", categorie: "Boissons", prixAchat: "250", prixVente: "400", stock: 48 },
  { nom: "Fanta Citron 33cl", emoji: "\u{1F34B}", ean: "5449000018502", categorie: "Boissons", prixAchat: "250", prixVente: "400", stock: 36 },
  { nom: "Sprite 33cl", emoji: "\u{1F49A}", ean: "5449000228949", categorie: "Boissons", prixAchat: "250", prixVente: "400", stock: 40 },
  { nom: "Mirinda Orange 33cl", emoji: "\u{1F34A}", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 30 },
  { nom: "Mirinda Citron 33cl", emoji: "\u{1F34B}", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 30 },
  { nom: "Pepsi 33cl", emoji: "\u{1F964}", ean: "4060800010527", categorie: "Boissons", prixAchat: "220", prixVente: "400", stock: 24 },
  { nom: "7UP 33cl", emoji: "\u{1FAE7}", ean: "4060800010541", categorie: "Boissons", prixAchat: "220", prixVente: "400", stock: 24 },
  { nom: "Malta Guinness 33cl", emoji: "\u{1F33E}", ean: "5011546003729", categorie: "Boissons", prixAchat: "300", prixVente: "500", stock: 36 },
  { nom: "Youki Citrus 33cl", emoji: "\u{1F34B}", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 48 },
  { nom: "Youki Ananas 33cl", emoji: "\u{1F34D}", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 48 },
  { nom: "Youki Pomme 33cl", emoji: "\u{1F34F}", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 36 },
  { nom: "Youki Raisin 33cl", emoji: "\u{1F347}", categorie: "Boissons", prixAchat: "200", prixVente: "350", stock: 24 },
  { nom: "Schweppes Tonic 33cl", emoji: "\u{1FAE7}", ean: "5449000131324", categorie: "Boissons", prixAchat: "350", prixVente: "600", stock: 20 },
  { nom: "Schweppes Citrus 33cl", emoji: "\u{1F34B}", ean: "5449000244079", categorie: "Boissons", prixAchat: "350", prixVente: "600", stock: 20 },
  { nom: "Top Ananas 33cl", emoji: "\u{1F34D}", categorie: "Boissons", prixAchat: "180", prixVente: "300", stock: 30 },
  { nom: "Top Citron 33cl", emoji: "\u{1F34B}", categorie: "Boissons", prixAchat: "180", prixVente: "300", stock: 30 },
  // ── EAUX ──
  { nom: "Eau Min\xE9rale SBL 50cl", emoji: "\u{1F4A7}", categorie: "Boissons", prixAchat: "150", prixVente: "250", stock: 60 },
  { nom: "Eau Min\xE9rale SBL 1.5L", emoji: "\u{1F4A7}", categorie: "Boissons", prixAchat: "350", prixVente: "500", stock: 30 },
  { nom: "Eau Min\xE9rale Omi 50cl", emoji: "\u{1F4A7}", categorie: "Boissons", prixAchat: "150", prixVente: "250", stock: 60 },
  { nom: "Eau Min\xE9rale Omi 1.5L", emoji: "\u{1F4A7}", categorie: "Boissons", prixAchat: "350", prixVente: "500", stock: 24 },
  { nom: "Eau Gazeuse 50cl", emoji: "\u{1FAE7}", ean: "3123340012103", categorie: "Boissons", prixAchat: "400", prixVente: "700", stock: 20 },
  // ── JUS MAISON ──
  { nom: "Jus d'Orange (verre)", emoji: "\u{1F34A}", categorie: "Boissons", prixAchat: "100", prixVente: "500", stock: 0 },
  { nom: "Jus Ananas maison", emoji: "\u{1F34D}", categorie: "Boissons", prixAchat: "100", prixVente: "500", stock: 0 },
  { nom: "Bissap maison (verre)", emoji: "\u{1F33A}", categorie: "Boissons", prixAchat: "80", prixVente: "400", stock: 0 },
  { nom: "Gnamakoudji (verre)", emoji: "\u{1FADA}", categorie: "Boissons", prixAchat: "80", prixVente: "400", stock: 0 },
  { nom: "Jus Tamarin maison", emoji: "\u{1F375}", categorie: "Boissons", prixAchat: "80", prixVente: "400", stock: 0 },
  { nom: "Sobolo maison (verre)", emoji: "\u{1F338}", categorie: "Boissons", prixAchat: "80", prixVente: "400", stock: 0 },
  // ── CAFÉS / THÉS ──
  { nom: "Caf\xE9 Expresso", emoji: "\u2615", categorie: "Boissons", prixAchat: "100", prixVente: "500", stock: 0 },
  { nom: "Caf\xE9 Nescaf\xE9", emoji: "\u2615", ean: "7613035443426", categorie: "Boissons", prixAchat: "100", prixVente: "400", stock: 0 },
  { nom: "Th\xE9 Vert (sachet)", emoji: "\u{1F375}", categorie: "Boissons", prixAchat: "50", prixVente: "300", stock: 20 },
  { nom: "Infusion locale", emoji: "\u{1F33F}", categorie: "Boissons", prixAchat: "50", prixVente: "300", stock: 0 },
  // ── BIÈRES (BB LOMÉ / SNB) ──
  { nom: "Flag Sp\xE9ciale 65cl", emoji: "\u{1F37A}", ean: "6161001007001", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 96 },
  { nom: "Flag Sp\xE9ciale 33cl", emoji: "\u{1F37A}", ean: "6161001007002", categorie: "Alcools", prixAchat: "300", prixVente: "500", stock: 72 },
  { nom: "Castel Beer 65cl", emoji: "\u{1F37A}", ean: "6161001007003", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 72 },
  { nom: "Castel Beer 33cl", emoji: "\u{1F37A}", ean: "6161001007004", categorie: "Alcools", prixAchat: "300", prixVente: "500", stock: 48 },
  { nom: "Guilele 65cl", emoji: "\u{1F37A}", ean: "6161001007005", categorie: "Alcools", prixAchat: "450", prixVente: "750", stock: 60 },
  { nom: "Guilele 33cl", emoji: "\u{1F37A}", ean: "6161001007006", categorie: "Alcools", prixAchat: "280", prixVente: "500", stock: 48 },
  { nom: "Awooyo 65cl", emoji: "\u{1F37A}", ean: "6161001007007", categorie: "Alcools", prixAchat: "450", prixVente: "750", stock: 48 },
  { nom: "33 Export 65cl", emoji: "\u{1F37A}", ean: "6141030010001", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 48 },
  { nom: "Star Beer 65cl", emoji: "\u2B50", ean: "6001007054012", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 36 },
  { nom: "TCB 65cl", emoji: "\u{1F37A}", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 36 },
  { nom: "Beaufort 65cl", emoji: "\u{1F37A}", categorie: "Alcools", prixAchat: "500", prixVente: "800", stock: 24 },
  { nom: "Guinness 50cl", emoji: "\u{1F5A4}", ean: "5011546602808", categorie: "Alcools", prixAchat: "600", prixVente: "1000", stock: 36 },
  { nom: "Heineken 33cl", emoji: "\u{1F7E2}", ean: "8714800038448", categorie: "Alcools", prixAchat: "600", prixVente: "1000", stock: 24 },
  { nom: "Desperados 33cl", emoji: "\u{1F37A}", ean: "3119780098781", categorie: "Alcools", prixAchat: "700", prixVente: "1200", stock: 24 },
  { nom: "Becks 33cl", emoji: "\u{1F37A}", ean: "5010296004095", categorie: "Alcools", prixAchat: "700", prixVente: "1200", stock: 12 },
  { nom: "Amstel 33cl", emoji: "\u{1F37A}", ean: "8714800012014", categorie: "Alcools", prixAchat: "600", prixVente: "1000", stock: 12 },
  // ── SPIRITUEUX ──
  { nom: "Rhum Negrita 4cl", emoji: "\u{1F943}", ean: "3491570001602", categorie: "Alcools", prixAchat: "200", prixVente: "500", stock: 0 },
  { nom: "Rhum Negrita 20cl", emoji: "\u{1F943}", categorie: "Alcools", prixAchat: "1500", prixVente: "2500", stock: 6 },
  { nom: "Rhum Diplomatico 4cl", emoji: "\u{1F943}", categorie: "Alcools", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Whisky JD 4cl", emoji: "\u{1F943}", ean: "5099873038765", categorie: "Alcools", prixAchat: "800", prixVente: "2000", stock: 0 },
  { nom: "Whisky JB 4cl", emoji: "\u{1F943}", categorie: "Alcools", prixAchat: "600", prixVente: "1500", stock: 0 },
  { nom: "Whisky Ballantine's 4cl", emoji: "\u{1F943}", ean: "5010106112051", categorie: "Alcools", prixAchat: "600", prixVente: "1500", stock: 0 },
  { nom: "Vodka Smirnoff 4cl", emoji: "\u{1F378}", ean: "5010106061942", categorie: "Alcools", prixAchat: "500", prixVente: "1200", stock: 0 },
  { nom: "Gordon's Gin 4cl", emoji: "\u{1F378}", ean: "5000289925569", categorie: "Alcools", prixAchat: "500", prixVente: "1200", stock: 0 },
  { nom: "Pastis Ricard 4cl", emoji: "\u{1F31F}", ean: "3033660006000", categorie: "Alcools", prixAchat: "400", prixVente: "1000", stock: 0 },
  { nom: "Campari 4cl", emoji: "\u{1F534}", ean: "8002230000012", categorie: "Alcools", prixAchat: "500", prixVente: "1200", stock: 0 },
  { nom: "Baileys 4cl", emoji: "\u{1F36E}", ean: "5011013100016", categorie: "Alcools", prixAchat: "700", prixVente: "1500", stock: 0 },
  { nom: "Schnapps Apfelkorn 4cl", emoji: "\u{1F34F}", categorie: "Alcools", prixAchat: "400", prixVente: "800", stock: 0 },
  { nom: "Liqueur Amaretto 4cl", emoji: "\u{1F352}", categorie: "Alcools", prixAchat: "500", prixVente: "1200", stock: 0 },
  { nom: "Tequila 4cl", emoji: "\u{1F335}", categorie: "Alcools", prixAchat: "600", prixVente: "1500", stock: 0 },
  // ── VINS ──
  { nom: "Vin Rouge (verre)", emoji: "\u{1F377}", categorie: "Alcools", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Vin Blanc (verre)", emoji: "\u{1F942}", categorie: "Alcools", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Vin Ros\xE9 (verre)", emoji: "\u{1F338}", categorie: "Alcools", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Champagne (fl\xFBte)", emoji: "\u{1F37E}", categorie: "Alcools", prixAchat: "1500", prixVente: "4000", stock: 0 },
  { nom: "Prosecco (verre)", emoji: "\u{1F942}", categorie: "Alcools", prixAchat: "1000", prixVente: "3000", stock: 0 },
  // ── COCKTAILS ──
  { nom: "Mojito", emoji: "\u{1F343}", categorie: "Cocktails", prixAchat: "500", prixVente: "2000", stock: 0 },
  { nom: "Daiquiri", emoji: "\u{1F353}", categorie: "Cocktails", prixAchat: "500", prixVente: "2000", stock: 0 },
  { nom: "Pi\xF1a Colada", emoji: "\u{1F34D}", categorie: "Cocktails", prixAchat: "600", prixVente: "2500", stock: 0 },
  { nom: "Sex on the Beach", emoji: "\u{1F3D6}\uFE0F", categorie: "Cocktails", prixAchat: "600", prixVente: "2500", stock: 0 },
  { nom: "Blue Lagoon", emoji: "\u{1F30A}", categorie: "Cocktails", prixAchat: "500", prixVente: "2000", stock: 0 },
  { nom: "Tequila Sunrise", emoji: "\u{1F305}", categorie: "Cocktails", prixAchat: "600", prixVente: "2500", stock: 0 },
  { nom: "Cuba Libre", emoji: "\u{1F1E8}\u{1F1FA}", categorie: "Cocktails", prixAchat: "500", prixVente: "2000", stock: 0 },
  { nom: "Gin Tonic", emoji: "\u{1FAD7}", categorie: "Cocktails", prixAchat: "600", prixVente: "2000", stock: 0 },
  { nom: "Spritz Aperol", emoji: "\u{1F7E0}", categorie: "Cocktails", prixAchat: "700", prixVente: "2500", stock: 0 },
  { nom: "Margarita", emoji: "\u{1F379}", categorie: "Cocktails", prixAchat: "600", prixVente: "2500", stock: 0 },
  // ── NOURRITURE ──
  { nom: "Arachides grill\xE9es (portion)", emoji: "\u{1F95C}", categorie: "Nourriture", prixAchat: "100", prixVente: "300", stock: 0 },
  { nom: "Chips Crunchy", emoji: "\u{1F954}", ean: "6281003019351", categorie: "Nourriture", prixAchat: "150", prixVente: "300", stock: 30 },
  { nom: "Biscuits Sal\xE9s", emoji: "\u{1F36A}", categorie: "Nourriture", prixAchat: "100", prixVente: "200", stock: 24 },
  { nom: "Omelette", emoji: "\u{1F373}", categorie: "Nourriture", prixAchat: "300", prixVente: "800", stock: 0 },
  { nom: "Brochettes de b\u0153uf (5 pics)", emoji: "\u{1F362}", categorie: "Nourriture", prixAchat: "800", prixVente: "2000", stock: 0 },
  { nom: "Brochettes de poulet (5 pics)", emoji: "\u{1F357}", categorie: "Nourriture", prixAchat: "700", prixVente: "1800", stock: 0 },
  { nom: "Alloco (portion)", emoji: "\u{1F34C}", categorie: "Nourriture", prixAchat: "200", prixVente: "500", stock: 0 },
  { nom: "G\xE9siers saut\xE9s (portion)", emoji: "\u{1F356}", categorie: "Nourriture", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Sardines grill\xE9es", emoji: "\u{1F41F}", categorie: "Nourriture", prixAchat: "800", prixVente: "2000", stock: 0 },
  { nom: "Tilapia grill\xE9", emoji: "\u{1F420}", categorie: "Nourriture", prixAchat: "1500", prixVente: "4000", stock: 0 },
  { nom: "Poulet brais\xE9 (1/4)", emoji: "\u{1F357}", categorie: "Nourriture", prixAchat: "1000", prixVente: "2500", stock: 0 },
  { nom: "Poulet brais\xE9 (1/2)", emoji: "\u{1F357}", categorie: "Nourriture", prixAchat: "2000", prixVente: "5000", stock: 0 },
  { nom: "Atti\xE9k\xE9 + Poisson", emoji: "\u{1F35A}", categorie: "Nourriture", prixAchat: "1000", prixVente: "2500", stock: 0 },
  { nom: "Riz sauce tomate", emoji: "\u{1F345}", categorie: "Nourriture", prixAchat: "500", prixVente: "1500", stock: 0 },
  { nom: "Sandwich club", emoji: "\u{1F96A}", categorie: "Nourriture", prixAchat: "600", prixVente: "1500", stock: 0 },
  { nom: "Hot-dog", emoji: "\u{1F32D}", categorie: "Nourriture", prixAchat: "400", prixVente: "1000", stock: 0 },
  { nom: "Hamburger", emoji: "\u{1F354}", categorie: "Nourriture", prixAchat: "700", prixVente: "2000", stock: 0 },
  { nom: "Frites de pomme de terre", emoji: "\u{1F35F}", categorie: "Nourriture", prixAchat: "300", prixVente: "1000", stock: 0 },
  { nom: "Pizza Margherita (part)", emoji: "\u{1F355}", categorie: "Nourriture", prixAchat: "800", prixVente: "2500", stock: 0 },
  { nom: "Salade Ni\xE7oise", emoji: "\u{1F957}", categorie: "Nourriture", prixAchat: "600", prixVente: "2000", stock: 0 },
  // ── CHICHA / CIGARETTES ──
  { nom: "Chicha / Narguil\xE9 (session)", emoji: "\u{1F4A8}", categorie: "Autres", prixAchat: "2000", prixVente: "5000", stock: 0 },
  { nom: "Cigarette Marlboro (unit\xE9)", emoji: "\u{1F6AC}", ean: "4025700002008", categorie: "Autres", prixAchat: "150", prixVente: "300", stock: 40 },
  { nom: "Cigarette Dunhill (unit\xE9)", emoji: "\u{1F6AC}", ean: "5000148019005", categorie: "Autres", prixAchat: "200", prixVente: "400", stock: 20 },
  { nom: "Cigarillo (unit\xE9)", emoji: "\u{1F6AC}", categorie: "Autres", prixAchat: "300", prixVente: "600", stock: 10 }
];
async function registerRoutes(app2) {
  const PgStore = connectPgSimple(session);
  app2.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "bar-resto-togo-secret-2024",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1e3 }
    })
  );
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Cet email est d\xE9j\xE0 utilis\xE9" });
      }
      const hashed = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({ ...data, password: hashed });
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, nom: user.nom });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, nom: user.nom });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Non authentifi\xE9" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Utilisateur introuvable" });
    res.json({ id: user.id, email: user.email, nom: user.nom });
  });
  app2.post("/api/upload", requireAuth, async (req, res) => {
    try {
      const { base64, mimeType } = req.body;
      if (!base64 || !mimeType) {
        return res.status(400).json({ message: "base64 et mimeType requis" });
      }
      const ext = mimeType === "image/png" ? "png" : "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, filename);
      const buffer = Buffer.from(base64, "base64");
      fs.writeFileSync(filePath, buffer);
      res.json({ url: `/uploads/${filename}` });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.session.userId);
      res.json(stats);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const data = await storage.getAnalytics(req.session.userId);
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/produits", requireAuth, async (req, res) => {
    res.json(await storage.getProduits(req.session.userId));
  });
  app2.post("/api/produits", requireAuth, async (req, res) => {
    try {
      const data = insertProduitSchema.parse(req.body);
      res.json(await storage.createProduit({ ...data, userId: req.session.userId }));
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.put("/api/produits/:id", requireAuth, async (req, res) => {
    try {
      const data = insertProduitSchema.partial().parse(req.body);
      res.json(await storage.updateProduit(parseInt(req.params.id), data));
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.delete("/api/produits/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteProduit(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.post("/api/produits/:id/reappro", requireAuth, async (req, res) => {
    try {
      const { quantite, fournisseur } = req.body;
      if (!quantite || isNaN(Number(quantite)) || Number(quantite) <= 0) {
        return res.status(400).json({ message: "Quantit\xE9 invalide" });
      }
      const updated = await storage.reapprovisionner(
        parseInt(req.params.id),
        Number(quantite),
        fournisseur || "Autre"
      );
      res.json(updated);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.post("/api/seed/produits", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getProduits(req.session.userId);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Des produits existent d\xE9j\xE0" });
      }
      const created = [];
      for (const p of PRODUITS_DEFAUT) {
        const prod = await storage.createProduit({ ...p, userId: req.session.userId });
        created.push(prod);
      }
      res.json({ count: created.length, message: `${created.length} produits cr\xE9\xE9s` });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/produits/import-csv", requireAuth, async (req, res) => {
    try {
      const { csvText, skipFirstLine = true } = req.body;
      if (!csvText) return res.status(400).json({ message: "csvText requis" });
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
      const dataLines = skipFirstLine ? lines.slice(1) : lines;
      const created = [];
      const errors = [];
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const [nom, categorie, ean, prixAchat, prixVente, stockStr] = cols;
        if (!nom || !prixAchat || !prixVente) {
          errors.push(`Ligne ${i + 2}: nom, prixAchat et prixVente obligatoires`);
          continue;
        }
        if (isNaN(Number(prixAchat)) || isNaN(Number(prixVente))) {
          errors.push(`Ligne ${i + 2}: prix invalides`);
          continue;
        }
        const VALID_CAT = ["Boissons", "Alcools", "Cocktails", "Nourriture", "Autres"];
        const cat = VALID_CAT.includes(categorie) ? categorie : "Autres";
        const prod = await storage.createProduit({
          nom,
          categorie: cat,
          ean: ean || void 0,
          prixAchat,
          prixVente,
          stock: parseInt(stockStr) || 0,
          userId: req.session.userId
        });
        created.push(prod);
      }
      res.json({ count: created.length, errors, message: `${created.length} produit(s) import\xE9(s)${errors.length ? `, ${errors.length} erreur(s)` : ""}` });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/ventes", requireAuth, async (req, res) => {
    res.json(await storage.getVentes(req.session.userId));
  });
  app2.post("/api/ventes", requireAuth, async (req, res) => {
    try {
      const data = insertVenteSchema.parse(req.body);
      res.json(await storage.createVente(req.session.userId, data.note, data.items));
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.get("/api/depenses", requireAuth, async (req, res) => {
    res.json(await storage.getDepenses(req.session.userId));
  });
  app2.post("/api/depenses", requireAuth, async (req, res) => {
    try {
      const data = insertDepenseSchema.parse(req.body);
      res.json(await storage.createDepense({ ...data, userId: req.session.userId }));
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.put("/api/depenses/:id", requireAuth, async (req, res) => {
    try {
      const data = insertDepenseSchema.partial().parse(req.body);
      res.json(await storage.updateDepense(parseInt(req.params.id), data));
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.delete("/api/depenses/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteDepense(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.get("/api/achats", requireAuth, async (req, res) => {
    res.json(await storage.getAchatsFournisseurs(req.session.userId));
  });
  app2.post("/api/achats", requireAuth, async (req, res) => {
    try {
      const data = insertAchatFournisseurSchema.parse(req.body);
      res.json(await storage.createAchatFournisseur({ ...data, userId: req.session.userId }));
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.delete("/api/achats/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAchatFournisseur(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  });
  app2.post("/api/ventes/import-csv", requireAuth, async (req, res) => {
    try {
      const { csvText, skipFirstLine = true } = req.body;
      if (!csvText) return res.status(400).json({ message: "csvText requis" });
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
      const dataLines = skipFirstLine ? lines.slice(1) : lines;
      const userProduits = await storage.getProduits(req.session.userId);
      const created = [];
      const errors = [];
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const [dateStr, produitNom, quantiteStr, prixStr, note] = cols;
        if (!produitNom || !quantiteStr || !prixStr) {
          errors.push(`Ligne ${i + 2}: produit, quantite et prixUnitaire obligatoires`);
          continue;
        }
        const produit = userProduits.find(
          (p) => p.nom.toLowerCase() === produitNom.toLowerCase()
        );
        if (!produit) {
          errors.push(`Ligne ${i + 2}: produit "${produitNom}" introuvable`);
          continue;
        }
        const quantite = parseInt(quantiteStr);
        const prixUnitaire = Number(prixStr);
        if (isNaN(quantite) || quantite < 1) {
          errors.push(`Ligne ${i + 2}: quantit\xE9 invalide`);
          continue;
        }
        if (isNaN(prixUnitaire) || prixUnitaire < 0) {
          errors.push(`Ligne ${i + 2}: prix invalide`);
          continue;
        }
        const date = dateStr ? new Date(dateStr) : /* @__PURE__ */ new Date();
        if (isNaN(date.getTime())) {
          errors.push(`Ligne ${i + 2}: date invalide (format YYYY-MM-DD attendu)`);
          continue;
        }
        const total = quantite * prixUnitaire;
        const [v] = await db.insert(ventes).values({ userId: req.session.userId, total: total.toString(), note: note || void 0, date }).returning();
        await db.insert(venteItems).values({
          venteId: v.id,
          produitId: produit.id,
          quantite,
          prixUnitaire: prixUnitaire.toString()
        });
        created.push(v);
      }
      res.json({
        count: created.length,
        errors,
        message: `${created.length} vente(s) import\xE9e(s)${errors.length ? `, ${errors.length} erreur(s)` : ""}`
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/achats/import-csv", requireAuth, async (req, res) => {
    try {
      const { csvText, skipFirstLine = true } = req.body;
      if (!csvText) return res.status(400).json({ message: "csvText requis" });
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
      const dataLines = skipFirstLine ? lines.slice(1) : lines;
      const userProduits = await storage.getProduits(req.session.userId);
      const created = [];
      const errors = [];
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const [dateStr, produitNom, quantiteStr, prixStr, fournisseur, note] = cols;
        if (!produitNom || !quantiteStr || !prixStr) {
          errors.push(`Ligne ${i + 2}: produit, quantite et prixUnitaire obligatoires`);
          continue;
        }
        const produit = userProduits.find(
          (p) => p.nom.toLowerCase() === produitNom.toLowerCase()
        );
        if (!produit) {
          errors.push(`Ligne ${i + 2}: produit "${produitNom}" introuvable`);
          continue;
        }
        const quantite = parseInt(quantiteStr);
        const prixUnitaire = Number(prixStr);
        if (isNaN(quantite) || quantite < 1) {
          errors.push(`Ligne ${i + 2}: quantit\xE9 invalide`);
          continue;
        }
        if (isNaN(prixUnitaire) || prixUnitaire < 0) {
          errors.push(`Ligne ${i + 2}: prix invalide`);
          continue;
        }
        const date = dateStr ? new Date(dateStr) : /* @__PURE__ */ new Date();
        if (isNaN(date.getTime())) {
          errors.push(`Ligne ${i + 2}: date invalide (format YYYY-MM-DD attendu)`);
          continue;
        }
        const [a] = await db.insert(achatsFournisseurs).values({
          userId: req.session.userId,
          produitId: produit.id,
          quantite,
          prixUnitaire: prixUnitaire.toString(),
          fournisseur: fournisseur || "Autre",
          note: note || void 0,
          date
        }).returning();
        created.push(a);
      }
      res.json({
        count: created.length,
        errors,
        message: `${created.length} achat(s) import\xE9(s)${errors.length ? `, ${errors.length} erreur(s)` : ""}`
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs2 from "fs";
import * as path2 from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs2.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs2.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs2.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs2.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path2.resolve(process.cwd(), "assets")));
  app2.use("/uploads", express.static(path2.resolve(process.cwd(), "uploads")));
  app2.use(express.static(path2.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
