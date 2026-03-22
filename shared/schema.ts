import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  nom: text("nom").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const produits = pgTable("produits", {
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
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ventes = pgTable("ventes", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().default(sql`now()`),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const venteItems = pgTable("vente_items", {
  id: serial("id").primaryKey(),
  venteId: integer("vente_id")
    .references(() => ventes.id, { onDelete: "cascade" })
    .notNull(),
  produitId: integer("produit_id")
    .references(() => produits.id)
    .notNull(),
  quantite: integer("quantite").notNull(),
  prixUnitaire: numeric("prix_unitaire", { precision: 12, scale: 2 }).notNull(),
});

export const depenses = pgTable("depenses", {
  id: serial("id").primaryKey(),
  libelle: text("libelle").notNull(),
  montant: numeric("montant", { precision: 12, scale: 2 }).notNull(),
  categorie: text("categorie").notNull().default("Général"),
  date: timestamp("date").notNull().default(sql`now()`),
  note: text("note"),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fournisseurs = pgTable("fournisseurs", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  telephone: text("telephone"),
  email: text("email"),
  adresse: text("adresse"),
  note: text("note"),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const achatsFournisseurs = pgTable("achats_fournisseurs", {
  id: serial("id").primaryKey(),
  produitId: integer("produit_id")
    .references(() => produits.id)
    .notNull(),
  fournisseurId: integer("fournisseur_id").references(() => fournisseurs.id),
  quantite: integer("quantite").notNull(),
  prixUnitaire: numeric("prix_unitaire", { precision: 12, scale: 2 }).notNull(),
  fournisseur: text("fournisseur").notNull().default("Autre"),
  date: timestamp("date").notNull().default(sql`now()`),
  note: text("note"),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  produits: many(produits),
  ventes: many(ventes),
  depenses: many(depenses),
  achatsFournisseurs: many(achatsFournisseurs),
  fournisseurs: many(fournisseurs),
}));

export const fournisseursRelations = relations(fournisseurs, ({ one, many }) => ({
  user: one(users, { fields: [fournisseurs.userId], references: [users.id] }),
  achats: many(achatsFournisseurs),
}));

export const produitsRelations = relations(produits, ({ one, many }) => ({
  user: one(users, { fields: [produits.userId], references: [users.id] }),
  venteItems: many(venteItems),
  achatsFournisseurs: many(achatsFournisseurs),
}));

export const ventesRelations = relations(ventes, ({ one, many }) => ({
  user: one(users, { fields: [ventes.userId], references: [users.id] }),
  items: many(venteItems),
}));

export const venteItemsRelations = relations(venteItems, ({ one }) => ({
  vente: one(ventes, { fields: [venteItems.venteId], references: [ventes.id] }),
  produit: one(produits, {
    fields: [venteItems.produitId],
    references: [produits.id],
  }),
}));

export const depensesRelations = relations(depenses, ({ one }) => ({
  user: one(users, { fields: [depenses.userId], references: [users.id] }),
}));

export const achatsFournisseursRelations = relations(achatsFournisseurs, ({ one }) => ({
  user: one(users, { fields: [achatsFournisseurs.userId], references: [users.id] }),
  produit: one(produits, { fields: [achatsFournisseurs.produitId], references: [produits.id] }),
  fournisseurRel: one(fournisseurs, { fields: [achatsFournisseurs.fournisseurId], references: [fournisseurs.id] }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  nom: true,
});

export const insertProduitSchema = createInsertSchema(produits).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  prixAchat: z.string().optional().default("0"),
});

export const insertVenteSchema = z.object({
  note: z.string().optional(),
  items: z.array(
    z.object({
      produitId: z.number(),
      quantite: z.number().min(1),
      prixUnitaire: z.number(),
    })
  ),
});

export const insertDepenseSchema = createInsertSchema(depenses).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  date: z.coerce.date().optional(),
});

export const insertAchatFournisseurSchema = createInsertSchema(achatsFournisseurs).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  date: z.coerce.date().optional(),
});

export const insertFournisseurSchema = createInsertSchema(fournisseurs).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Produit = typeof produits.$inferSelect;
export type Vente = typeof ventes.$inferSelect;
export type VenteItem = typeof venteItems.$inferSelect;
export type Depense = typeof depenses.$inferSelect;
export type AchatFournisseur = typeof achatsFournisseurs.$inferSelect;
export type Fournisseur = typeof fournisseurs.$inferSelect;
export type InsertProduit = z.infer<typeof insertProduitSchema>;
export type InsertVente = z.infer<typeof insertVenteSchema>;
export type InsertDepense = z.infer<typeof insertDepenseSchema>;
export type InsertAchatFournisseur = z.infer<typeof insertAchatFournisseurSchema>;
export type InsertFournisseur = z.infer<typeof insertFournisseurSchema>;
