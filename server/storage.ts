import {
  users,
  produits,
  ventes,
  venteItems,
  depenses,
  achatsFournisseurs,
  type User,
  type InsertUser,
  type Produit,
  type InsertProduit,
  type Vente,
  type VenteItem,
  type Depense,
  type InsertDepense,
  type AchatFournisseur,
  type InsertAchatFournisseur,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, inArray, lt } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProduits(userId: number): Promise<Produit[]>;
  getProduit(id: number): Promise<Produit | undefined>;
  createProduit(produit: InsertProduit & { userId: number }): Promise<Produit>;
  updateProduit(id: number, produit: Partial<InsertProduit>): Promise<Produit>;
  deleteProduit(id: number): Promise<void>;

  getVentes(userId: number): Promise<(Vente & { items: (VenteItem & { produit: Produit })[] })[]>;
  createVente(
    userId: number,
    note: string | undefined,
    items: { produitId: number; quantite: number; prixUnitaire: number }[]
  ): Promise<Vente>;

  getDepenses(userId: number): Promise<Depense[]>;
  createDepense(depense: InsertDepense & { userId: number }): Promise<Depense>;
  updateDepense(id: number, depense: Partial<InsertDepense>): Promise<Depense>;
  deleteDepense(id: number): Promise<void>;

  getAchatsFournisseurs(userId: number): Promise<(AchatFournisseur & { produit: Produit })[]>;
  createAchatFournisseur(achat: InsertAchatFournisseur & { userId: number }): Promise<AchatFournisseur & { produit: Produit }>;
  deleteAchatFournisseur(id: number): Promise<void>;

  getDashboardStats(userId: number): Promise<{
    ventesAujourdhui: number;
    depensesAujourdhui: number;
    beneficeAujourdhui: number;
    totalVentesHier: number;
    totalDepensesHier: number;
    topProduits: { nom: string; quantite: number; total: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProduits(userId: number): Promise<Produit[]> {
    return db.select().from(produits).where(eq(produits.userId, userId)).orderBy(produits.nom);
  }

  async getProduit(id: number): Promise<Produit | undefined> {
    const [p] = await db.select().from(produits).where(eq(produits.id, id));
    return p;
  }

  async createProduit(produit: InsertProduit & { userId: number }): Promise<Produit> {
    const [p] = await db.insert(produits).values(produit).returning();
    return p;
  }

  async updateProduit(id: number, data: Partial<InsertProduit>): Promise<Produit> {
    const [p] = await db.update(produits).set(data).where(eq(produits.id, id)).returning();
    return p;
  }

  async deleteProduit(id: number): Promise<void> {
    await db.delete(produits).where(eq(produits.id, id));
  }

  async getVentes(userId: number): Promise<(Vente & { items: (VenteItem & { produit: Produit })[] })[]> {
    const allVentes = await db.select().from(ventes).where(eq(ventes.userId, userId)).orderBy(desc(ventes.date));
    const result = [];
    for (const v of allVentes) {
      const items = await db
        .select({ item: venteItems, produit: produits })
        .from(venteItems)
        .innerJoin(produits, eq(venteItems.produitId, produits.id))
        .where(eq(venteItems.venteId, v.id));
      result.push({
        ...v,
        items: items.map((i) => ({ ...i.item, produit: i.produit })),
      });
    }
    return result;
  }

  async createVente(
    userId: number,
    note: string | undefined,
    items: { produitId: number; quantite: number; prixUnitaire: number }[]
  ): Promise<Vente> {
    const total = items.reduce((sum, i) => sum + i.quantite * i.prixUnitaire, 0);
    const [v] = await db
      .insert(ventes)
      .values({ userId, total: total.toString(), note })
      .returning();

    for (const item of items) {
      await db.insert(venteItems).values({
        venteId: v.id,
        produitId: item.produitId,
        quantite: item.quantite,
        prixUnitaire: item.prixUnitaire.toString(),
      });
      await db
        .update(produits)
        .set({ stock: sql`${produits.stock} - ${item.quantite}` })
        .where(eq(produits.id, item.produitId));
    }
    return v;
  }

  async getDepenses(userId: number): Promise<Depense[]> {
    return db.select().from(depenses).where(eq(depenses.userId, userId)).orderBy(desc(depenses.date));
  }

  async createDepense(depense: InsertDepense & { userId: number }): Promise<Depense> {
    const [d] = await db.insert(depenses).values(depense).returning();
    return d;
  }

  async updateDepense(id: number, data: Partial<InsertDepense>): Promise<Depense> {
    const [d] = await db.update(depenses).set(data).where(eq(depenses.id, id)).returning();
    return d;
  }

  async deleteDepense(id: number): Promise<void> {
    await db.delete(depenses).where(eq(depenses.id, id));
  }

  async getAchatsFournisseurs(userId: number): Promise<(AchatFournisseur & { produit: Produit })[]> {
    const rows = await db
      .select({ achat: achatsFournisseurs, produit: produits })
      .from(achatsFournisseurs)
      .innerJoin(produits, eq(achatsFournisseurs.produitId, produits.id))
      .where(eq(achatsFournisseurs.userId, userId))
      .orderBy(desc(achatsFournisseurs.date));
    return rows.map((r) => ({ ...r.achat, produit: r.produit }));
  }

  async createAchatFournisseur(
    achat: InsertAchatFournisseur & { userId: number }
  ): Promise<AchatFournisseur & { produit: Produit }> {
    const [a] = await db.insert(achatsFournisseurs).values(achat).returning();
    // Update stock
    await db
      .update(produits)
      .set({ stock: sql`${produits.stock} + ${achat.quantite}` })
      .where(eq(produits.id, achat.produitId));
    const [p] = await db.select().from(produits).where(eq(produits.id, achat.produitId));
    return { ...a, produit: p };
  }

  async deleteAchatFournisseur(id: number): Promise<void> {
    // Restore stock before deletion (clamp to 0 to avoid negative stock)
    const [achat] = await db.select().from(achatsFournisseurs).where(eq(achatsFournisseurs.id, id));
    if (achat) {
      await db
        .update(produits)
        .set({ stock: sql`GREATEST(0, ${produits.stock} - ${achat.quantite})` })
        .where(eq(produits.id, achat.produitId));
    }
    await db.delete(achatsFournisseurs).where(eq(achatsFournisseurs.id, id));
  }

  async reapprovisionner(id: number, quantite: number, fournisseur: string): Promise<Produit> {
    const [updated] = await db
      .update(produits)
      .set({ stock: sql`${produits.stock} + ${quantite}` })
      .where(eq(produits.id, id))
      .returning();
    return updated;
  }

  async getDashboardStats(userId: number) {
    const now = new Date();
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
      db.select({ cogs: sql<string>`coalesce(sum(${venteItems.quantite} * ${produits.prixAchat}::numeric), 0)` })
        .from(venteItems)
        .innerJoin(produits, eq(venteItems.produitId, produits.id))
        .innerJoin(ventes, eq(venteItems.venteId, ventes.id))
        .where(and(eq(ventes.userId, userId), gte(ventes.date, todayStart), lte(ventes.date, tomorrowStart))),
      // Top produits du jour
      db.select({
          nom: produits.nom,
          quantite: sql<number>`sum(${venteItems.quantite})`,
          total: sql<number>`sum(${venteItems.quantite} * ${venteItems.prixUnitaire})`,
        })
        .from(venteItems)
        .innerJoin(produits, eq(venteItems.produitId, produits.id))
        .innerJoin(ventes, eq(venteItems.venteId, ventes.id))
        .where(and(eq(ventes.userId, userId), gte(ventes.date, todayStart), lte(ventes.date, tomorrowStart)))
        .groupBy(produits.nom)
        .orderBy(desc(sql`sum(${venteItems.quantite} * ${venteItems.prixUnitaire})`))
        .limit(5),
      // Dépenses fixes du mois (loyer, électricité, eau, salaires)
      db.select({ montant: depenses.montant })
        .from(depenses)
        .where(and(
          eq(depenses.userId, userId),
          gte(depenses.date, startOfMonth),
          inArray(depenses.categorie, ["Loyer", "Électricité (CEET)", "Eau (TdE)", "Salaires"]),
        )),
      // Alertes stock < 10
      db.select({ id: produits.id, nom: produits.nom, stock: produits.stock, categorie: produits.categorie })
        .from(produits)
        .where(and(eq(produits.userId, userId), lt(produits.stock, 10)))
        .orderBy(produits.stock)
        .limit(15),
    ]);

    const ventesAujourdhui = ventesToday.reduce((s, v) => s + parseFloat(v.total as string), 0);
    const depensesAujourdhui = depensesToday.reduce((s, d) => s + parseFloat(d.montant as string), 0);
    const totalVentesHier = ventesHier.reduce((s, v) => s + parseFloat(v.total as string), 0);
    const totalDepensesHier = depensesHier.reduce((s, d) => s + parseFloat(d.montant as string), 0);
    const coutsVentesAujourdhui = parseFloat(cogsRow[0]?.cogs ?? "0");
    const beneficeNetAujourdhui = ventesAujourdhui - coutsVentesAujourdhui - depensesAujourdhui;
    const totalDepensesFixesMois = depensesFixesMois.reduce((s, d) => s + parseFloat(d.montant as string), 0);

    // Prévisionnel: calcul du montant à mettre de côté chaque jour
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysLeft = daysInMonth - dayOfMonth + 1;
    const provisionnementJournalier = daysInMonth > 0 ? Math.ceil(totalDepensesFixesMois / daysInMonth) : 0;
    const restantAMettreDecote = Math.max(0, totalDepensesFixesMois - depensesFixesMois
      .filter(() => true)
      .reduce((s, d) => s + parseFloat(d.montant as string), 0));

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
        dayOfMonth,
      },
      alertesStock: alertesStockRaw,
    };
  }
}

export const storage = new DatabaseStorage();
