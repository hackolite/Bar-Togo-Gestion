import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";

// ── TYPES ──────────────────────────────────────────────────────────────────────

interface VenteItem {
  produitId: number;
  quantite: number;
  prixUnitaire: string;
  produit: { nom: string; emoji?: string };
}

interface VenteRecord {
  id: number;
  date: string;
  total: string;
  note?: string;
  items: VenteItem[];
}

interface DepenseRecord {
  id: number;
  date: string;
  libelle: string;
  montant: string;
  categorie: string;
  note?: string;
}

interface AchatRecord {
  id: number;
  date: string;
  quantite: number;
  prixUnitaire: string;
  fournisseur: string;
  note?: string;
  produit: { nom: string; emoji?: string };
}

type TransactionType = "vente" | "achat" | "depense";

interface HistoryEntry {
  key: string;
  type: TransactionType;
  date: string;
  label: string;
  amount: number;
  detail: string;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function formatFCFA(amount: number): string {
  if (amount >= 1_000_000)
    return (amount / 1_000_000).toFixed(1).replace(".", ",") + " M FCFA";
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_CONFIG: Record<TransactionType, { label: string; icon: string; color: string }> = {
  vente: { label: "Vente", icon: "💰", color: Colors.primary },
  achat: { label: "Achat", icon: "📦", color: Colors.info },
  depense: { label: "Dépense", icon: "💸", color: Colors.danger },
};

// ── KPI CARD ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  color: string;
  icon: string;
}

function KpiCard({ label, value, color, icon }: KpiCardProps) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <Text style={styles.kpiIcon}>{icon}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function HistoriqueScreen() {
  const insets = useSafeAreaInsets();

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [dateFrom, setDateFrom] = useState<string>(
    thirtyDaysAgo.toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState<string>(
    today.toISOString().split("T")[0]
  );

  const { data: ventes, isLoading: loadingVentes, error: errorVentes } = useQuery<VenteRecord[]>({
    queryKey: ["/api/ventes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ventes");
      return res.json();
    },
  });

  const { data: depenses, isLoading: loadingDepenses, error: errorDepenses } = useQuery<DepenseRecord[]>({
    queryKey: ["/api/depenses"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/depenses");
      return res.json();
    },
  });

  const { data: achats, isLoading: loadingAchats, error: errorAchats } = useQuery<AchatRecord[]>({
    queryKey: ["/api/achats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/achats");
      return res.json();
    },
  });

  const isLoading = loadingVentes || loadingDepenses || loadingAchats;
  const error = errorVentes || errorDepenses || errorAchats;

  // ── FILTERING & COMBINING ──

  const entries = useMemo<HistoryEntry[]>(() => {
    const parseDate = (s: string): Date | null => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const from = parseDate(dateFrom);
    const to = parseDate(dateTo + "T23:59:59");

    const inRange = (dateStr: string) => {
      const d = new Date(dateStr);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    };

    const result: HistoryEntry[] = [];

    for (const v of ventes ?? []) {
      if (!inRange(v.date)) continue;
      const prodNames = v.items.map((it) =>
        `${it.produit.emoji ?? ""} ${it.produit.nom} ×${it.quantite}`.trim()
      ).join(", ");
      result.push({
        key: `vente-${v.id}`,
        type: "vente",
        date: v.date,
        label: prodNames || `Vente #${v.id}`,
        amount: Number(v.total),
        detail: v.note ?? "",
      });
    }

    for (const d of depenses ?? []) {
      if (!inRange(d.date)) continue;
      result.push({
        key: `depense-${d.id}`,
        type: "depense",
        date: d.date,
        label: d.libelle,
        amount: Number(d.montant),
        detail: d.categorie,
      });
    }

    for (const a of achats ?? []) {
      if (!inRange(a.date)) continue;
      result.push({
        key: `achat-${a.id}`,
        type: "achat",
        date: a.date,
        label: `${a.produit.emoji ?? ""} ${a.produit.nom} ×${a.quantite}`.trim(),
        amount: Number(a.prixUnitaire) * a.quantite,
        detail: a.fournisseur,
      });
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ventes, depenses, achats, dateFrom, dateTo]);

  // ── TOTALS ──

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => ({
        ventes: acc.ventes + (e.type === "vente" ? e.amount : 0),
        achats: acc.achats + (e.type === "achat" ? e.amount : 0),
        depenses: acc.depenses + (e.type === "depense" ? e.amount : 0),
      }),
      { ventes: 0, achats: 0, depenses: 0 }
    );
  }, [entries]);

  // ── RENDER ──

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement de l'historique…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>
          Erreur lors du chargement des données.{"\n"}
          {(error as Error).message}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Historique</Text>
        <Text style={styles.headerSub}>Toutes les transactions</Text>
      </View>

      {/* ── DATE FILTER ── */}
      <View style={styles.section}>
        <SectionHeader title="Période" />
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Du</Text>
            <TextInput
              style={styles.filterInput}
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Au</Text>
            <TextInput
              style={styles.filterInput}
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
            />
          </View>
        </View>
      </View>

      {/* ── KPI CARDS ── */}
      <View style={styles.section}>
        <SectionHeader title="Résumé de la période" />
        <View style={styles.kpiRow}>
          <KpiCard
            label="Ventes"
            value={formatFCFA(totals.ventes)}
            color={Colors.primary}
            icon="💰"
          />
          <KpiCard
            label="Achats"
            value={formatFCFA(totals.achats)}
            color={Colors.info}
            icon="📦"
          />
          <KpiCard
            label="Dépenses"
            value={formatFCFA(totals.depenses)}
            color={Colors.danger}
            icon="💸"
          />
        </View>
      </View>

      {/* ── HISTORY TABLE ── */}
      <View style={styles.section}>
        <SectionHeader title={`Transactions (${entries.length})`} />
        <View style={styles.tableCard}>
          {/* Header row */}
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1 }]}>Type</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 3 }]}>Libellé</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Montant</Text>
          </View>
          {entries.length === 0 ? (
            <View style={styles.tableEmptyRow}>
              <Text style={styles.emptyText}>Aucune transaction sur cette période</Text>
            </View>
          ) : (
            entries.map((entry, i) => {
              const cfg = TYPE_CONFIG[entry.type];
              return (
                <View
                  key={entry.key}
                  style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
                >
                  <View style={[styles.typeBadge, { backgroundColor: cfg.color + "1A", flex: 1 }]}>
                    <Text style={[styles.typeBadgeText, { color: cfg.color }]}>
                      {cfg.icon} {cfg.label}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {formatDateTime(entry.date)}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellLabel, { flex: 3 }]} numberOfLines={2}>
                    {entry.label}
                    {entry.detail ? (
                      <Text style={styles.tableCellDetail}>{"\n"}{entry.detail}</Text>
                    ) : null}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableCellNumeric,
                      { flex: 2, color: entry.type === "vente" ? Colors.primary : Colors.danger },
                    ]}
                  >
                    {entry.type === "vente" ? "+" : "-"}{formatFCFA(entry.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  // ── HEADER ──
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // ── SECTION ──
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  // ── FILTER ──
  filterRow: {
    flexDirection: "row",
    gap: 12,
  },
  filterField: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  filterInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
  },
  // ── KPI ──
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
  },
  // ── TABLE ──
  tableCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tableHeaderRow: {
    backgroundColor: Colors.background,
  },
  tableRowAlt: {
    backgroundColor: "#F9FBF9",
  },
  tableEmptyRow: {
    padding: 24,
    alignItems: "center",
  },
  tableCell: {
    fontSize: 12,
    color: Colors.text,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  tableCellNumeric: {
    textAlign: "right",
    fontWeight: "600",
    fontSize: 12,
  },
  tableCellLabel: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 17,
  },
  tableCellDetail: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  // ── TYPE BADGE ──
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
