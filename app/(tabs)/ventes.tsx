import { isLiquidGlassAvailable } from "expo-glass-effect";
import { showAlert } from "@/lib/alert";
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
  Alert,
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
      qc.invalidateQueries({ queryKey: ["/api/benefice-evolution"] });
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

const CSV_VENTES_EXEMPLE = `date,produit,quantite,prixUnitaire,note
2026-04-19,Flag Spéciale 65cl,8,800,Dimanche soir
2026-04-19,Castel Beer 65cl,5,800,Dimanche soir
2026-04-19,Guilele 65cl,4,750,
2026-04-19,Coca-Cola 33cl,3,400,
2026-04-19,Fanta Orange 33cl,2,400,
2026-04-19,Mojito,3,2000,Table VIP
2026-04-19,Cuba Libre,2,2000,
2026-04-19,Brochettes de bœuf (5 pics),2,2000,
2026-04-19,Alloco (portion),3,500,
2026-04-19,Poulet braisé (1/4),2,2500,
2026-04-19,Heineken 33cl,4,1000,
2026-04-19,Malta Guinness 33cl,2,500,
2026-04-19,Chips Crunchy,4,300,
2026-04-19,Arachides grillées (portion),5,300,
2026-04-19,Eau Minérale SBL 50cl,3,250,
2026-04-19,Piña Colada,2,2500,
2026-04-19,Sprite 33cl,3,400,
2026-04-19,Gin Tonic,2,2000,
2026-04-19,Fanta Citron 33cl,2,400,
2026-04-19,Guinness 50cl,3,1000,
2026-04-19,Riz sauce tomate,2,1500,
2026-04-19,Jus d'Orange (verre),2,500,
2026-04-19,Tequila Sunrise,2,2500,
2026-04-19,Desperados 33cl,2,1200,
2026-04-19,Schweppes Tonic 33cl,2,600,
2026-04-19,Vin Rouge (verre),2,1500,
2026-04-19,Hamburger,1,2000,
2026-04-19,Frites de pomme de terre,2,1000,
2026-04-19,Tilapia grillé,1,4000,Table 5
2026-04-19,Bissap maison (verre),3,400,
2026-04-20,Flag Spéciale 65cl,5,800,
2026-04-20,Castel Beer 65cl,3,800,
2026-04-20,Coca-Cola 33cl,4,400,
2026-04-20,Fanta Orange 33cl,2,400,
2026-04-20,Malta Guinness 33cl,2,500,
2026-04-20,Brochettes de bœuf (5 pics),1,2000,
2026-04-20,Alloco (portion),2,500,
2026-04-20,Chips Crunchy,3,300,
2026-04-20,Arachides grillées (portion),3,300,
2026-04-20,Eau Minérale SBL 50cl,4,250,
2026-04-20,Guilele 65cl,2,750,
2026-04-20,Mojito,1,2000,
2026-04-20,Sprite 33cl,2,400,
2026-04-20,Gésiers sautés (portion),1,1500,
2026-04-20,Flag Spéciale 33cl,3,500,
2026-04-20,Jus Ananas maison,2,500,
2026-04-20,Thé Vert (sachet),2,300,
2026-04-20,Café Nescafé,1,400,
2026-04-20,Biscuits Salés,2,200,
2026-04-20,Youki Citrus 33cl,3,350,
2026-04-21,Flag Spéciale 65cl,6,800,
2026-04-21,Castel Beer 65cl,4,800,
2026-04-21,Guilele 65cl,2,750,
2026-04-21,Coca-Cola 33cl,3,400,
2026-04-21,Fanta Citron 33cl,2,400,
2026-04-21,Malta Guinness 33cl,3,500,
2026-04-21,Heineken 33cl,2,1000,
2026-04-21,Alloco (portion),2,500,
2026-04-21,Brochettes de poulet (5 pics),2,1800,
2026-04-21,Chips Crunchy,3,300,
2026-04-21,Eau Minérale Omi 50cl,3,250,
2026-04-21,Mojito,2,2000,
2026-04-21,Youki Ananas 33cl,2,350,
2026-04-21,Jus d'Orange (verre),1,500,
2026-04-21,Sandwich club,1,1500,
2026-04-21,Riz sauce tomate,1,1500,
2026-04-21,Whisky JD 4cl,1,2000,
2026-04-21,Pastis Ricard 4cl,1,1000,
2026-04-21,Sardines grillées,1,2000,
2026-04-21,Gnamakoudji (verre),2,400,
2026-04-22,Flag Spéciale 65cl,7,800,
2026-04-22,Castel Beer 65cl,5,800,
2026-04-22,Guilele 65cl,3,750,
2026-04-22,Coca-Cola 33cl,4,400,
2026-04-22,Fanta Orange 33cl,3,400,
2026-04-22,Sprite 33cl,2,400,
2026-04-22,Mojito,2,2000,
2026-04-22,Heineken 33cl,3,1000,
2026-04-22,Guinness 50cl,2,1000,
2026-04-22,Brochettes de bœuf (5 pics),2,2000,
2026-04-22,Alloco (portion),2,500,
2026-04-22,Frites de pomme de terre,2,1000,
2026-04-22,Chips Crunchy,4,300,
2026-04-22,Eau Minérale SBL 50cl,3,250,
2026-04-22,Cuba Libre,2,2000,
2026-04-22,Malta Guinness 33cl,2,500,
2026-04-22,Youki Citrus 33cl,2,350,
2026-04-22,Rhum Negrita 4cl,2,500,
2026-04-22,Riz sauce tomate,2,1500,
2026-04-22,Jus Tamarin maison,2,400,
2026-04-22,Tilapia grillé,1,4000,
2026-04-22,Omelette,1,800,
2026-04-23,Flag Spéciale 65cl,8,800,
2026-04-23,Castel Beer 65cl,5,800,
2026-04-23,Guilele 65cl,3,750,
2026-04-23,Heineken 33cl,4,1000,
2026-04-23,Coca-Cola 33cl,3,400,
2026-04-23,Fanta Orange 33cl,2,400,
2026-04-23,Malta Guinness 33cl,3,500,
2026-04-23,Mojito,3,2000,
2026-04-23,Gin Tonic,2,2000,
2026-04-23,Brochettes de bœuf (5 pics),3,2000,
2026-04-23,Brochettes de poulet (5 pics),2,1800,
2026-04-23,Alloco (portion),3,500,
2026-04-23,Chips Crunchy,4,300,
2026-04-23,Arachides grillées (portion),4,300,
2026-04-23,Eau Minérale SBL 50cl,3,250,
2026-04-23,Sprite 33cl,2,400,
2026-04-23,Desperados 33cl,2,1200,
2026-04-23,Poulet braisé (1/4),2,2500,
2026-04-23,Riz sauce tomate,2,1500,
2026-04-23,Bissap maison (verre),3,400,
2026-04-23,Youki Ananas 33cl,2,350,
2026-04-23,Flag Spéciale 33cl,4,500,
2026-04-24,Flag Spéciale 65cl,12,800,Soirée vendredi
2026-04-24,Castel Beer 65cl,8,800,
2026-04-24,Guilele 65cl,6,750,
2026-04-24,Heineken 33cl,6,1000,
2026-04-24,Guinness 50cl,4,1000,
2026-04-24,Coca-Cola 33cl,5,400,
2026-04-24,Fanta Orange 33cl,4,400,
2026-04-24,Mojito,5,2000,Soirée vendredi
2026-04-24,Piña Colada,3,2500,
2026-04-24,Cuba Libre,3,2000,
2026-04-24,Tequila Sunrise,2,2500,
2026-04-24,Desperados 33cl,3,1200,
2026-04-24,Brochettes de bœuf (5 pics),4,2000,
2026-04-24,Brochettes de poulet (5 pics),3,1800,
2026-04-24,Alloco (portion),4,500,
2026-04-24,Poulet braisé (1/4),3,2500,
2026-04-24,Frites de pomme de terre,3,1000,
2026-04-24,Hamburger,2,2000,
2026-04-24,Chips Crunchy,5,300,
2026-04-24,Arachides grillées (portion),5,300,
2026-04-24,Eau Minérale SBL 50cl,4,250,
2026-04-24,Whisky JD 4cl,2,2000,
2026-04-24,Gin Tonic,3,2000,
2026-04-24,Schweppes Tonic 33cl,2,600,
2026-04-24,Malta Guinness 33cl,3,500,
2026-04-24,Vin Rouge (verre),3,1500,
2026-04-24,Riz sauce tomate,2,1500,
2026-04-24,Tilapia grillé,2,4000,
2026-04-25,Flag Spéciale 65cl,15,800,Samedi soir
2026-04-25,Castel Beer 65cl,10,800,
2026-04-25,Guilele 65cl,8,750,
2026-04-25,Heineken 33cl,8,1000,
2026-04-25,Guinness 50cl,5,1000,
2026-04-25,Desperados 33cl,5,1200,
2026-04-25,Coca-Cola 33cl,6,400,
2026-04-25,Fanta Orange 33cl,5,400,
2026-04-25,Fanta Citron 33cl,3,400,
2026-04-25,Sprite 33cl,4,400,
2026-04-25,Malta Guinness 33cl,4,500,
2026-04-25,Mojito,8,2000,Soirée samedi
2026-04-25,Piña Colada,5,2500,
2026-04-25,Cuba Libre,4,2000,
2026-04-25,Sex on the Beach,3,2500,
2026-04-25,Tequila Sunrise,4,2500,
2026-04-25,Gin Tonic,3,2000,
2026-04-25,Spritz Aperol,3,2500,
2026-04-25,Margarita,2,2500,
2026-04-25,Brochettes de bœuf (5 pics),6,2000,
2026-04-25,Brochettes de poulet (5 pics),5,1800,
2026-04-25,Poulet braisé (1/4),4,2500,
2026-04-25,Poulet braisé (1/2),2,5000,
2026-04-25,Alloco (portion),5,500,
2026-04-25,Frites de pomme de terre,4,1000,
2026-04-25,Hamburger,3,2000,
2026-04-25,Pizza Margherita (part),3,2500,
2026-04-25,Chips Crunchy,6,300,
2026-04-25,Arachides grillées (portion),6,300,
2026-04-25,Eau Minérale SBL 50cl,5,250,
2026-04-25,Whisky JD 4cl,3,2000,
2026-04-25,Whisky JB 4cl,2,1500,
2026-04-25,Vin Rouge (verre),4,1500,
2026-04-25,Vin Blanc (verre),2,1500,
2026-04-25,Schweppes Tonic 33cl,3,600,
2026-04-26,Flag Spéciale 65cl,10,800,Dimanche
2026-04-26,Castel Beer 65cl,7,800,
2026-04-26,Guilele 65cl,5,750,
2026-04-26,Heineken 33cl,5,1000,
2026-04-26,Guinness 50cl,3,1000,
2026-04-26,Coca-Cola 33cl,4,400,
2026-04-26,Fanta Orange 33cl,3,400,
2026-04-26,Sprite 33cl,3,400,
2026-04-26,Malta Guinness 33cl,3,500,
2026-04-26,Mojito,5,2000,
2026-04-26,Cuba Libre,3,2000,
2026-04-26,Piña Colada,3,2500,
2026-04-26,Brochettes de bœuf (5 pics),4,2000,
2026-04-26,Brochettes de poulet (5 pics),3,1800,
2026-04-26,Poulet braisé (1/4),3,2500,
2026-04-26,Alloco (portion),4,500,
2026-04-26,Attiéké + Poisson,2,2500,
2026-04-26,Frites de pomme de terre,3,1000,
2026-04-26,Chips Crunchy,5,300,
2026-04-26,Arachides grillées (portion),5,300,
2026-04-26,Eau Minérale SBL 50cl,4,250,
2026-04-26,Gin Tonic,3,2000,
2026-04-26,Desperados 33cl,3,1200,
2026-04-26,Schweppes Tonic 33cl,2,600,
2026-04-26,Jus d'Orange (verre),2,500,
2026-04-26,Bissap maison (verre),3,400,
2026-04-26,Vin Rouge (verre),2,1500,
2026-04-26,Tilapia grillé,2,4000,
2026-04-26,Hamburger,2,2000,
2026-04-26,Sardines grillées,1,2000`;

// ── MODAL: IMPORT CSV VENTES ──
function ImportCSVVentesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [csvText, setCsvText] = useState("");
  const [skipFirstLine, setSkipFirstLine] = useState(true);
  const [preview, setPreview] = useState<string[][]>([]);
  const [result, setResult] = useState<{ count: number; errors: string[] } | null>(null);
  const [step, setStep] = useState<"edit" | "preview" | "done">("edit");

  React.useEffect(() => {
    if (visible) {
      setCsvText("");
      setPreview([]);
      setResult(null);
      setStep("edit");
    }
  }, [visible]);

  const parsePreview = () => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    const dataLines = skipFirstLine ? lines.slice(1) : lines;
    const parsed = dataLines.slice(0, 10).map((l) =>
      l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    );
    setPreview(parsed);
    setStep("preview");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ventes/import-csv", { csvText, skipFirstLine });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/ventes"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/benefice-evolution"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(data);
      setStep("done");
    },
    onError: (e: any) => showAlert("Erreur", e.message),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={icv.container}>
        <View style={icv.handle} />
        <View style={icv.header}>
          <Text style={icv.title}>Importer des ventes CSV</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[icv.body, { gap: 16 }]}>
            {step === "edit" && (
              <>
                <View style={icv.formatBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                    <Text style={icv.formatTitle}>Format attendu :</Text>
                  </View>
                  <Text style={icv.formatCode}>date,produit,quantite,prixUnitaire,note</Text>
                  <Text style={[icv.formatCode, { color: Colors.textMuted, marginTop: 4 }]}>
                    date: YYYY-MM-DD (ex: 2024-03-15){"\n"}produit: nom exact du produit
                  </Text>
                  <Pressable style={icv.exampleBtn} onPress={() => setCsvText(CSV_VENTES_EXEMPLE)}>
                    <Ionicons name="flash-outline" size={14} color={Colors.primary} />
                    <Text style={icv.exampleBtnText}>{"Charger les données d'exemple (207 ventes)"}</Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable
                    style={{ padding: 2 }}
                    onPress={() => setSkipFirstLine(!skipFirstLine)}
                  >
                    <Ionicons
                      name={skipFirstLine ? "checkbox" : "square-outline"}
                      size={18}
                      color={skipFirstLine ? Colors.primary : Colors.textMuted}
                    />
                  </Pressable>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text }}>
                    La 1ère ligne est un en-tête (ignorer)
                  </Text>
                </View>

                <View>
                  <Text style={icv.fieldLabel}>Collez votre CSV ici</Text>
                  <TextInput
                    style={icv.textarea}
                    multiline
                    value={csvText}
                    onChangeText={setCsvText}
                    placeholder={`date,produit,quantite,prixUnitaire,note\n2024-01-15,Flag Spéciale 65cl,4,800,Table 5`}
                    placeholderTextColor={Colors.textMuted}
                    textAlignVertical="top"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            {step === "preview" && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="eye-outline" size={18} color={Colors.primary} />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text }}>
                    Aperçu ({preview.length} lignes{preview.length === 10 ? "+" : ""})
                  </Text>
                </View>
                {preview.map((row, i) => (
                  <View key={i} style={icv.previewRow}>
                    <Text style={icv.previewDate}>{row[0] || "—"}</Text>
                    <Text style={icv.previewNom} numberOfLines={1}>{row[1] || "—"}</Text>
                    <Text style={icv.previewDetail}>x{row[2] || "0"} · {row[3] || "0"} FCFA</Text>
                    {row[4] ? <Text style={icv.previewNote}>{row[4]}</Text> : null}
                  </View>
                ))}
                <Pressable
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
                  onPress={() => setStep("edit")}
                >
                  <Ionicons name="arrow-back" size={16} color={Colors.textMuted} />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted }}>Modifier</Text>
                </Pressable>
              </>
            )}

            {step === "done" && result && (
              <View style={icv.doneBox}>
                <Text style={{ fontSize: 48 }}>✅</Text>
                <Text style={icv.doneTitle}>{result.count} vente(s) importée(s)</Text>
                {result.errors.length > 0 && (
                  <View style={icv.errorsBox}>
                    <Text style={icv.errorsTitle}>{result.errors.length} erreur(s) :</Text>
                    {result.errors.map((e, i) => (
                      <Text key={i} style={icv.errorLine}>{e}</Text>
                    ))}
                  </View>
                )}
                <Pressable style={[icv.saveBtn, { marginTop: 12 }]} onPress={onClose}>
                  <Text style={icv.saveBtnText}>Fermer</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        {step !== "done" && (
          <View style={icv.footer}>
            {step === "edit" ? (
              <Pressable
                style={({ pressed }) => [icv.saveBtn, { opacity: pressed || !csvText.trim() ? 0.6 : 1 }]}
                onPress={parsePreview}
                disabled={!csvText.trim()}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" />
                <Text style={icv.saveBtnText}>Prévisualiser</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [icv.saveBtn, { opacity: pressed ? 0.85 : 1, backgroundColor: "#52B788" }]}
                onPress={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={icv.saveBtnText}>Importation...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                    <Text style={icv.saveBtnText}>Importer {preview.length} vente(s)</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const icv = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginTop: 8, marginBottom: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  body: { padding: 20 },
  formatBox: { backgroundColor: Colors.primary + "0D", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.primary + "25" },
  formatTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  formatCode: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.text, fontVariant: ["tabular-nums"] },
  exampleBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.primary + "15" },
  exampleBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  textarea: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, padding: 14, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 180, maxHeight: 260 },
  previewRow: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  previewDate: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  previewNom: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  previewDetail: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.primary },
  previewNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  doneBox: { alignItems: "center", paddingVertical: 20, gap: 8 },
  doneTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  errorsBox: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, width: "100%", gap: 4 },
  errorsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.danger },
  errorLine: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.danger },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});

export default function VentesScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [csvModalVisible, setCsvModalVisible] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ventes/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ventes"] });
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/benefice-evolution"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const confirmDelete = (v: VenteRecord) => {
    showAlert(
      "Supprimer la vente",
      `Voulez-vous supprimer cette vente de ${formatFCFA(v.total)} ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => deleteMutation.mutate(v.id) },
      ]
    );
  };

  const totalJour = ventes
    .filter((v) => {
      const d = new Date(v.date);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    })
    .reduce((s, v) => s + Number(v.total), 0);

  const topInsets = isLiquidGlassAvailable() ? Math.max(insets.top, 67) : insets.top;

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
        <Pressable
          onPress={() => confirmDelete(item)}
          hitSlop={8}
          style={{ marginLeft: 8, padding: 4 }}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
        </Pressable>
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
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={({ pressed }) => [vs.importBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => setCsvModalVisible(true)}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [vs.addBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
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
      <ImportCSVVentesModal
        visible={csvModalVisible}
        onClose={() => setCsvModalVisible(false)}
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
  importBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary + "15",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.primary + "40",
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
