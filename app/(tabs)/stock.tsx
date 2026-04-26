import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
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
}

interface VenteItem {
  produitId: number;
  quantite: number;
}

interface Vente {
  id: number;
  items?: VenteItem[];
}

type StockFilter = "tous" | "bas" | "rupture";

const CAT_EMOJIS: Record<string, string> = {
  Boissons: "🥤",
  Alcools: "🍺",
  Cocktails: "🍹",
  Nourriture: "🍽️",
  Autres: "📦",
};

export default function StockScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<StockFilter>("tous");

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
  const enRupture = produits.filter((p) => p.stock === 0).length;
  const stockBasCount = produits.filter((p) => p.stock > 0 && p.stock < 10).length;

  const filteredProduits = React.useMemo(() => {
    let p = [...produits].sort((a, b) => a.nom.localeCompare(b.nom));
    if (filter === "bas") p = p.filter((x) => x.stock > 0 && x.stock < 10);
    if (filter === "rupture") p = p.filter((x) => x.stock === 0);
    return p;
  }, [produits, filter]);

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderItem = ({ item }: { item: Produit }) => {
    const entrants = entrantsByProduit[item.id] ?? 0;
    const sortants = sortantsByProduit[item.id] ?? 0;
    const stockBas = item.stock > 0 && item.stock < 10;
    const rupture = item.stock === 0;

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
      <View style={[styles.header, { paddingTop: topInsets + 16 }]}>
        <View>
          <Text style={styles.title}>Stock</Text>
          <Text style={styles.subtitle}>{produits.length} produit(s)</Text>
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

      {(enRupture > 0 || stockBasCount > 0) && (
        <View style={styles.alertRow}>
          {enRupture > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: Colors.danger + "15", borderColor: Colors.danger + "40" }]}>
              <Ionicons name="alert-circle" size={14} color={Colors.danger} />
              <Text style={[styles.alertText, { color: Colors.danger }]}>
                {enRupture} rupture(s)
              </Text>
            </View>
          )}
          {stockBasCount > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: Colors.warning + "15", borderColor: Colors.warning + "40" }]}>
              <Ionicons name="warning" size={14} color={Colors.warning} />
              <Text style={[styles.alertText, { color: Colors.warning }]}>
                {stockBasCount} stock(s) bas
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {(
          [
            ["tous", "Tous"],
            ["bas", "Stock bas"],
            ["rupture", "Rupture"],
          ] as [StockFilter, string][]
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

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
            <Text style={styles.emptyText}>
              {filter === "tous"
                ? "Aucun produit"
                : filter === "bas"
                ? "Aucun produit en stock bas"
                : "Aucune rupture de stock"}
            </Text>
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
  alertRow: { flexDirection: "row", gap: 8, marginHorizontal: 20, marginBottom: 10 },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  alertText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterRow: { marginBottom: 8 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  filterTextActive: { color: "#fff" },
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
});
