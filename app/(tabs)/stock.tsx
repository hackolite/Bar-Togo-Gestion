import { isLiquidGlassAvailable } from "expo-glass-effect";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";

interface Produit {
  id: number;
  nom: string;
  emoji?: string;
  categorie: string;
  stock: number;
}

interface AchatFournisseur {
  id: number;
  produitId: number;
  quantite: number;
  date?: string;
}

interface VenteItem {
  produitId: number;
  quantite: number;
}

interface Vente {
  id: number;
  date?: string;
  items?: VenteItem[];
}

const CAT_EMOJIS: Record<string, string> = {
  Boissons: "🥤",
  Alcools: "🍺",
  Cocktails: "🍹",
  Nourriture: "🍽️",
  Autres: "📦",
};

export default function StockScreen() {
  const insets = useSafeAreaInsets();

  const { data: produits = [], isLoading: loadingProduits } = useQuery<Produit[]>({
    queryKey: ["/api/produits"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/produits");
      return res.json();
    },
  });

  const { data: achats = [] } = useQuery<AchatFournisseur[]>({
    queryKey: ["/api/achats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/achats");
      return res.json();
    },
  });

  const { data: ventes = [] } = useQuery<Vente[]>({
    queryKey: ["/api/ventes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ventes");
      return res.json();
    },
  });

  const entrantsByProduit = React.useMemo(() => {
    const map: Record<number, number> = {};
    achats.forEach((a) => {
      map[a.produitId] = (map[a.produitId] ?? 0) + a.quantite;
    });
    return map;
  }, [achats]);

  const sortantsByProduit = React.useMemo(() => {
    const map: Record<number, number> = {};
    ventes.forEach((v) => {
      (v.items ?? []).forEach((item) => {
        map[item.produitId] = (map[item.produitId] ?? 0) + item.quantite;
      });
    });
    return map;
  }, [ventes]);

  const totalEntrants = achats.reduce((s, a) => s + a.quantite, 0);
  const totalSortants = Object.values(sortantsByProduit).reduce((s, v) => s + v, 0);

  const latestMovementByProduit = React.useMemo(() => {
    const map: Record<number, number> = {};
    achats.forEach((a) => {
      const ts = a.date ? new Date(a.date).getTime() : 0;
      if (!map[a.produitId] || ts > map[a.produitId]) map[a.produitId] = ts;
    });
    ventes.forEach((v) => {
      const ts = v.date ? new Date(v.date).getTime() : 0;
      (v.items ?? []).forEach((item) => {
        if (!map[item.produitId] || ts > map[item.produitId]) map[item.produitId] = ts;
      });
    });
    return map;
  }, [achats, ventes]);

  const filteredProduits = React.useMemo(() => {
    return [...produits].sort((a, b) => {
      const da = latestMovementByProduit[a.id] ?? 0;
      const db = latestMovementByProduit[b.id] ?? 0;
      return db - da;
    });
  }, [produits, latestMovementByProduit]);

  const topInsets = isLiquidGlassAvailable() ? Math.max(insets.top, 67) : insets.top;

  const renderItem = ({ item }: { item: Produit }) => {
    const entrants = entrantsByProduit[item.id] ?? 0;
    const sortants = sortantsByProduit[item.id] ?? 0;
    const stockBas = item.stock > 0 && item.stock < 10;
    const rupture = item.stock === 0;
    const lastTs = latestMovementByProduit[item.id];
    const lastDateStr = lastTs
      ? new Date(lastTs).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.emojiBox}>
            <Text style={styles.emoji}>
              {item.emoji ?? CAT_EMOJIS[item.categorie] ?? "📦"}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.produitNom} numberOfLines={1}>{item.nom}</Text>
            <Text style={styles.categorie}>{item.categorie}</Text>
            {lastDateStr && (
              <Text style={styles.lastMovement} numberOfLines={1}>
                <Ionicons name="time-outline" size={10} color={Colors.textMuted} /> {lastDateStr}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.badge, { backgroundColor: Colors.success + "18" }]}>
            <Ionicons name="arrow-up" size={11} color={Colors.success} />
            <Text style={[styles.badgeText, { color: Colors.success }]}>{entrants}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: Colors.danger + "18" }]}>
            <Ionicons name="arrow-down" size={11} color={Colors.danger} />
            <Text style={[styles.badgeText, { color: Colors.danger }]}>{sortants}</Text>
          </View>
          <View
            style={[
              styles.stockBadge,
              {
                backgroundColor: rupture
                  ? Colors.danger
                  : stockBas
                  ? Colors.warning
                  : Colors.primary,
              },
            ]}
          >
            <Text style={styles.stockBadgeText}>{item.stock}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loadingProduits) {
    return (
      <View style={[styles.container, styles.loadingBox]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: topInsets + 16, backgroundColor: Colors.background }}>
        <View style={styles.headerAccent}>
          <View style={[styles.accentBar, { backgroundColor: Colors.primary }]} />
          <View style={[styles.accentBar, { backgroundColor: Colors.accent }]} />
          <View style={[styles.accentBar, { backgroundColor: Colors.blue }]} />
        </View>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Stock</Text>
            <Text style={styles.subtitle}>{produits.length} produit(s) · tri par mouvement récent</Text>
          </View>
        </View>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
          <Ionicons name="arrow-up-circle" size={22} color={Colors.success} />
          <View>
            <Text style={styles.summaryLabel}>Entrants</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>{totalEntrants}</Text>
          </View>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: Colors.danger }]}>
          <Ionicons name="arrow-down-circle" size={22} color={Colors.danger} />
          <View>
            <Text style={styles.summaryLabel}>Sortants</Text>
            <Text style={[styles.summaryValue, { color: Colors.danger }]}>{totalSortants}</Text>
          </View>
        </View>
      </View>

      {/* Column headers */}
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>Produit</Text>
        <View style={styles.listHeaderRight}>
          <Text style={[styles.listHeaderCol, { color: Colors.success }]}>↑ Entrée</Text>
          <Text style={[styles.listHeaderCol, { color: Colors.danger }]}>↓ Sortie</Text>
          <Text style={styles.listHeaderCol}>Stock</Text>
        </View>
      </View>

      <FlatList
        data={filteredProduits}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 118 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text style={styles.emptyText}>Aucun produit en stock</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingBox: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  summaryValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 4,
  },
  listHeaderText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  listHeaderRight: { flexDirection: "row", gap: 16 },
  listHeaderCol: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, minWidth: 44, textAlign: "center" },
  list: { paddingHorizontal: 16, gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  emojiBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emoji: { fontSize: 20 },
  produitNom: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  categorie: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 44,
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  stockBadge: {
    minWidth: 36,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  stockBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textAlign: "center" },
  lastMovement: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  headerAccent: { flexDirection: "row", height: 4, marginBottom: 14, marginHorizontal: 20, borderRadius: 2, overflow: "hidden" },
  accentBar: { flex: 1 },
});
