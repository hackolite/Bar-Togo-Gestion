import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";

interface Produit {
  id: number;
  nom: string;
  emoji?: string;
  image?: string;
  ean?: string;
  prixVente: string;
  stock: number;
  categorie: string;
}

function getImageUrl(path: string): string {
  try {
    const base = getApiUrl();
    return new URL(path, base).toString();
  } catch {
    return path;
  }
}

const CAT_EMOJIS_V: Record<string, string> = {
  Boissons: "🥤",
  Alcools: "🍺",
  Cocktails: "🍹",
  Nourriture: "🍽️",
  Autres: "📦",
};

interface VenteItem {
  produitId: number;
  quantite: number;
  prixUnitaire: number;
}

interface VenteRecord {
  id: number;
  date: string;
  total: string;
  note?: string;
  items: { id: number; quantite: number; prixUnitaire: string; produit: Produit }[];
}

function formatFCFA(v: string | number) {
  return new Intl.NumberFormat("fr-FR").format(Number(v)) + " FCFA";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NouvelleVenteModal({
  visible,
  onClose,
  produits,
}: {
  visible: boolean;
  onClose: () => void;
  produits: Produit[];
}) {
  const qc = useQueryClient();
  const [panier, setPanier] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [prodSearch, setProdSearch] = useState("");

  React.useEffect(() => {
    if (visible) {
      setPanier({});
      setNote("");
      setError("");
      setProdSearch("");
    }
  }, [visible]);

  const total = Object.entries(panier).reduce((sum, [produitId, qty]) => {
    const p = produits.find((x) => x.id === Number(produitId));
    return sum + (p ? qty * Number(p.prixVente) : 0);
  }, 0);

  const incrementer = (id: number) => {
    setPanier((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const decrementer = (id: number) => {
    setPanier((prev) => {
      const newQty = (prev[id] ?? 0) - 1;
      if (newQty <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(panier).map(([produitId, quantite]) => {
        const p = produits.find((x) => x.id === Number(produitId))!;
        return { produitId: Number(produitId), quantite, prixUnitaire: Number(p.prixVente) };
      });
      const res = await apiRequest("POST", "/api/ventes", { note: note || undefined, items });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ventes"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const handleVendre = () => {
    if (Object.keys(panier).length === 0) {
      setError("Ajoutez au moins un produit");
      return;
    }
    setError("");
    mutation.mutate();
  };

  const produitsFiltres = prodSearch.trim()
    ? produits.filter((p) => {
        const q = prodSearch.toLowerCase();
        return (
          p.nom.toLowerCase().includes(q) ||
          p.categorie.toLowerCase().includes(q) ||
          (p.ean && p.ean.toLowerCase().includes(q))
        );
      })
    : produits;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={nv.container}>
        <View style={nv.handle} />
        <View style={nv.header}>
          <Text style={nv.title}>Nouvelle vente</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </Pressable>
        </View>

        {error ? (
          <View style={nv.errorBox}>
            <Text style={nv.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={nv.searchBar}>
          <Ionicons name="search-outline" size={15} color={Colors.textMuted} />
          <TextInput
            style={nv.searchInput}
            placeholder="Rechercher par nom ou code EAN..."
            placeholderTextColor={Colors.textMuted}
            value={prodSearch}
            onChangeText={setProdSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {prodSearch ? (
            <Pressable onPress={() => setProdSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={nv.body}>
            <Text style={nv.sectionLabel}>
              Sélectionner les produits
              {prodSearch ? ` · ${produitsFiltres.length} résultat(s)` : ""}
            </Text>
            {produitsFiltres.length === 0 && (
              <View style={nv.emptySearch}>
                <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
                <Text style={nv.emptySearchText}>Aucun produit trouvé</Text>
                <Text style={nv.emptySearchSub}>Essayez un autre terme ou code EAN</Text>
              </View>
            )}
            {produitsFiltres.map((p) => {
              const inPanier = (panier[p.id] ?? 0) > 0;
              return (
                <Pressable
                  key={p.id}
                  style={[nv.prodRow, inPanier && nv.prodRowActive]}
                  onPress={() => incrementer(p.id)}
                >
                  <View style={nv.prodThumb}>
                    {p.image ? (
                      <Image source={{ uri: getImageUrl(p.image) }} style={nv.prodImg} resizeMode="cover" />
                    ) : (
                      <Text style={nv.prodEmojiText}>{p.emoji ?? CAT_EMOJIS_V[p.categorie] ?? "📦"}</Text>
                    )}
                    {p.stock < 10 && (
                      <View style={nv.stockWarn}>
                        <Text style={nv.stockWarnText}>{p.stock}</Text>
                      </View>
                    )}
                  </View>
                  <View style={nv.prodInfo}>
                    <Text style={nv.prodNom} numberOfLines={2}>{p.nom}</Text>
                    <Text style={nv.prodPrix}>{formatFCFA(p.prixVente)}</Text>
                  </View>
                  <View style={nv.counter}>
                    <Pressable
                      style={[nv.counterBtn, !(panier[p.id] > 0) && nv.counterBtnDisabled]}
                      onPress={(e) => { e.stopPropagation?.(); decrementer(p.id); }}
                      disabled={!(panier[p.id] > 0)}
                    >
                      <Ionicons name="remove" size={16} color={panier[p.id] > 0 ? Colors.primary : Colors.textMuted} />
                    </Pressable>
                    <Text style={nv.counterQty}>{panier[p.id] ?? 0}</Text>
                    <Pressable style={nv.counterBtn} onPress={(e) => { e.stopPropagation?.(); incrementer(p.id); }}>
                      <Ionicons name="add" size={16} color={Colors.primary} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}

            <Text style={[nv.sectionLabel, { marginTop: 16 }]}>Note (optionnel)</Text>
            <TextInput
              style={nv.noteInput}
              placeholder="Commentaire sur la vente..."
              placeholderTextColor={Colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>
        </ScrollView>

        <View style={nv.footer}>
          <View style={nv.totalRow}>
            <Text style={nv.totalLabel}>Total</Text>
            <Text style={nv.totalValue}>{formatFCFA(total)}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [nv.validerBtn, { opacity: pressed ? 0.85 : 1 }, total === 0 && nv.validerBtnDisabled]}
            onPress={handleVendre}
            disabled={mutation.isPending || total === 0}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={nv.validerBtnText}>Valider la vente</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const nv = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: "center",
    marginTop: 8, marginBottom: 4,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  errorBox: {
    backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12,
    marginHorizontal: 20, marginTop: 12,
  },
  errorText: { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular" },
  body: { padding: 20, gap: 4 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  prodRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, marginBottom: 4,
    borderWidth: 1.5, borderColor: "transparent",
  },
  prodRowActive: { backgroundColor: Colors.primary + "08", borderColor: Colors.primary + "30" },
  prodThumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" },
  prodImg: { width: 44, height: 44, borderRadius: 12 },
  prodEmojiText: { fontSize: 22 },
  stockWarn: { position: "absolute", bottom: 0, right: 0, backgroundColor: Colors.danger, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stockWarnText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  prodInfo: { flex: 1 },
  prodNom: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text, lineHeight: 20 },
  prodPrix: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary, marginTop: 2 },
  counter: { flexDirection: "row", alignItems: "center", gap: 12 },
  counterBtn: {
    width: 32, height: 32, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  counterBtnDisabled: { borderColor: Colors.border },
  counterQty: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, minWidth: 20, textAlign: "center" },
  noteInput: {
    backgroundColor: Colors.background,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text,
    minHeight: 60, textAlignVertical: "top",
  },
  footer: {
    padding: 20, borderTopWidth: 1, borderTopColor: Colors.border, gap: 12,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  totalValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  validerBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  validerBtnDisabled: { opacity: 0.5 },
  validerBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 4, marginTop: 4, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, padding: 0 },
  emptySearch: { alignItems: "center", paddingVertical: 36, gap: 10 },
  emptySearchText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySearchSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});

export default function VentesScreen() {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  const { data: ventes = [], isLoading: loadingVentes } = useQuery<VenteRecord[]>({
    queryKey: ["/api/ventes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ventes");
      return res.json();
    },
  });

  const { data: produits = [] } = useQuery<Produit[]>({
    queryKey: ["/api/produits"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/produits");
      return res.json();
    },
  });

  const totalJour = ventes
    .filter((v) => {
      const d = new Date(v.date);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    })
    .reduce((s, v) => s + Number(v.total), 0);

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderVente = ({ item }: { item: VenteRecord }) => (
    <View style={vs.venteCard}>
      <View style={vs.venteHeader}>
        <View style={vs.venteIconBox}>
          <Ionicons name="receipt" size={18} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={vs.venteDate}>{formatDate(item.date)}</Text>
          {item.note ? <Text style={vs.venteNote}>{item.note}</Text> : null}
        </View>
        <Text style={vs.venteTotal}>{formatFCFA(item.total)}</Text>
      </View>
      <View style={vs.venteDivider} />
      <View style={vs.venteItems}>
        {item.items.map((it) => (
          <View key={it.id} style={vs.venteItem}>
            <Text style={vs.venteItemNom}>{it.produit.nom}</Text>
            <Text style={vs.venteItemQty}>x{it.quantite}</Text>
            <Text style={vs.venteItemTotal}>
              {formatFCFA(Number(it.prixUnitaire) * it.quantite)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={vs.container}>
      <View style={[vs.header, { paddingTop: topInsets + 16 }]}>
        <View>
          <Text style={vs.title}>Ventes</Text>
          <Text style={vs.subtitle}>Aujourd'hui: {formatFCFA(totalJour)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [vs.addBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {loadingVentes ? (
        <View style={vs.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={ventes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderVente}
          contentContainerStyle={[
            vs.list,
            { paddingBottom: Platform.OS === "web" ? 118 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={vs.emptyBox}>
              <Ionicons name="cart-outline" size={48} color={Colors.border} />
              <Text style={vs.emptyText}>Aucune vente</Text>
              <Text style={vs.emptySubText}>Appuyez sur + pour enregistrer</Text>
            </View>
          }
        />
      )}

      <NouvelleVenteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        produits={produits}
      />
    </View>
  );
}

const vs = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.background,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  list: { paddingHorizontal: 20, gap: 12 },
  venteCard: {
    backgroundColor: Colors.surface, borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  venteHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 16,
  },
  venteIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.background, alignItems: "center", justifyContent: "center",
  },
  venteDate: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  venteNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  venteTotal: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.primary },
  venteDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  venteItems: { padding: 12, gap: 8 },
  venteItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  venteItemNom: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text },
  venteItemQty: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted, marginRight: 12 },
  venteItemTotal: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
