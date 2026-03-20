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
  categorie: string;
  prixAchat: string;
  prixVente: string;
  stock: number;
}

interface AchatFournisseur {
  id: number;
  produitId: number;
  quantite: number;
  prixUnitaire: string;
  fournisseur: string;
  date: string;
  note?: string;
  produit: Produit;
}

const CATEGORIES = ["Boissons", "Alcools", "Cocktails", "Nourriture", "Autres"];

const CAT_COLORS: Record<string, string> = {
  Boissons: "#3A86FF",
  Alcools: "#8B5CF6",
  Cocktails: "#EC4899",
  Nourriture: "#F97316",
  Autres: "#6B7280",
};

const CAT_EMOJIS: Record<string, string> = {
  Boissons: "🥤",
  Alcools: "🍺",
  Cocktails: "🍹",
  Nourriture: "🍽️",
  Autres: "📦",
};

function formatFCFA(v: string | number) {
  return new Intl.NumberFormat("fr-FR").format(Number(v)) + " FCFA";
}

function getImageUrl(path: string): string {
  try {
    const base = getApiUrl();
    return new URL(path, base).toString();
  } catch {
    return path;
  }
}

// ── MODAL: NOUVEL ACHAT ──
function AchatModal({
  visible,
  onClose,
  produits,
  initialProduit,
}: {
  visible: boolean;
  onClose: () => void;
  produits: Produit[];
  initialProduit?: Produit | null;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [quantite, setQuantite] = useState("1");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"produit" | "details">("produit");

  React.useEffect(() => {
    if (visible) {
      setSearch("");
      const prod = initialProduit ?? null;
      setSelectedProduit(prod);
      setQuantite("1");
      setPrixUnitaire(prod && prod.prixAchat !== "0" ? prod.prixAchat : "");
      setNote("");
      setError("");
      setStep(prod ? "details" : "produit");
    }
  }, [visible, initialProduit]);

  const filteredProduits = produits.filter(
    (p) =>
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.categorie.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectProduit = (p: Produit) => {
    setSelectedProduit(p);
    setPrixUnitaire(p.prixAchat !== "0" ? p.prixAchat : "");
    setStep("details");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        produitId: selectedProduit!.id,
        quantite: parseInt(quantite),
        prixUnitaire,
        fournisseur: "Autre",
        note: note || undefined,
        date: new Date().toISOString(),
      };
      const res = await apiRequest("POST", "/api/achats", body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/achats"] });
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const handleSave = () => {
    if (!selectedProduit) { setError("Sélectionnez un produit"); return; }
    if (!quantite || isNaN(Number(quantite)) || Number(quantite) <= 0) {
      setError("Quantité invalide"); return;
    }
    if (!prixUnitaire || isNaN(Number(prixUnitaire)) || Number(prixUnitaire) < 0) {
      setError("Prix unitaire invalide"); return;
    }
    setError("");
    mutation.mutate();
  };

  const total = Number(prixUnitaire || 0) * Number(quantite || 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={am.container}>
        <View style={am.handle} />
        <View style={am.header}>
          <Pressable
            onPress={step === "details" && !initialProduit ? () => setStep("produit") : onClose}
            hitSlop={10}
          >
            <Ionicons
              name={step === "details" && !initialProduit ? "arrow-back" : "close"}
              size={24}
              color={Colors.textMuted}
            />
          </Pressable>
          <Text style={am.title}>
            {step === "produit" ? "Choisir un produit" : "Détails de l'achat"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {step === "produit" ? (
          <>
            <View style={am.searchBox}>
              <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={am.searchInput}
                placeholder="Rechercher un produit..."
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
            </View>
            <FlatList
              data={filteredProduits}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 8 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [am.produitItem, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => handleSelectProduit(item)}
                >
                  <View style={am.produitEmoji}>
                    <Text style={{ fontSize: 22 }}>
                      {item.emoji || CAT_EMOJIS[item.categorie] || "📦"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={am.produitNom}>{item.nom}</Text>
                    <Text style={am.produitMeta}>{item.categorie} · Stock: {item.stock}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={am.emptyBox}>
                  <Text style={am.emptyText}>Aucun produit trouvé</Text>
                </View>
              }
            />
          </>
        ) : (
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={am.body}>
              {error ? <View style={am.errorBox}><Text style={am.errorText}>{error}</Text></View> : null}

              <View style={am.selectedProduct}>
                {selectedProduit?.image ? (
                  <Image source={{ uri: getImageUrl(selectedProduit.image) }} style={am.selectedImage} />
                ) : (
                  <Text style={{ fontSize: 28 }}>
                    {selectedProduit?.emoji || CAT_EMOJIS[selectedProduit?.categorie ?? ""] || "📦"}
                  </Text>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={am.selectedNom}>{selectedProduit?.nom}</Text>
                  <Text style={am.selectedMeta}>
                    {selectedProduit?.categorie} · Stock actuel: {selectedProduit?.stock}
                  </Text>
                </View>
              </View>

              <View style={am.field}>
                <Text style={am.label}>Quantité achetée *</Text>
                <View style={am.qtyRow}>
                  <Pressable
                    style={am.qtyBtn}
                    onPress={() => {
                      setQuantite(String(Math.max(1, parseInt(quantite || "1") - 1)));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons name="remove" size={20} color={Colors.primary} />
                  </Pressable>
                  <TextInput
                    style={am.qtyInput}
                    value={quantite}
                    onChangeText={setQuantite}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                  <Pressable
                    style={am.qtyBtn}
                    onPress={() => {
                      setQuantite(String(parseInt(quantite || "0") + 1));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                  </Pressable>
                </View>
                <View style={am.quickBtns}>
                  {[6, 12, 24, 48].map((n) => (
                    <Pressable key={n} style={am.quickBtn} onPress={() => setQuantite(String(n))}>
                      <Text style={am.quickBtnText}>+{n}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={am.field}>
                <Text style={am.label}>Prix unitaire d&apos;achat (FCFA) *</Text>
                <TextInput
                  style={am.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={prixUnitaire}
                  onChangeText={setPrixUnitaire}
                  keyboardType="numeric"
                />
              </View>

              {total > 0 && (
                <View style={am.totalBox}>
                  <Text style={am.totalLabel}>Total achat</Text>
                  <Text style={am.totalValue}>{formatFCFA(total)}</Text>
                </View>
              )}

              <View style={am.field}>
                <Text style={am.label}>Note (optionnel)</Text>
                <TextInput
                  style={[am.input, { height: 70, textAlignVertical: "top" }]}
                  placeholder="Commentaire..."
                  placeholderTextColor={Colors.textMuted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                />
              </View>
            </View>
          </ScrollView>
        )}

        {step === "details" && (
          <View style={am.footer}>
            <Pressable
              style={({ pressed }) => [am.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={am.saveBtnText}>Enregistrer l&apos;achat</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginTop: 8, marginBottom: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  searchBox: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginVertical: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  produitItem: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1.5, borderColor: Colors.border },
  produitEmoji: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  produitNom: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  produitMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  emptyBox: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  body: { padding: 20, gap: 4 },
  errorBox: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular" },
  selectedProduct: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.primary + "10", borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: Colors.primary + "30" },
  selectedImage: { width: 48, height: 48, borderRadius: 12 },
  selectedNom: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  selectedMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  qtyInput: { flex: 1, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 12, fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  quickBtns: { flexDirection: "row", gap: 10, marginTop: 10 },
  quickBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  quickBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  totalBox: { backgroundColor: Colors.primary + "10", borderRadius: 12, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderWidth: 1.5, borderColor: Colors.primary + "30" },
  totalLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.primary },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});

// ── ÉCRAN ACHATS (CATALOGUE) ──
export default function AchatsScreen() {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const { data: produits = [], isLoading } = useQuery<Produit[]>({
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

  const totalRecuParProduit = React.useMemo(() => {
    const map: Record<number, number> = {};
    achats.forEach((a) => {
      map[a.produitId] = (map[a.produitId] ?? 0) + a.quantite;
    });
    return map;
  }, [achats]);

  const filtered = produits.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.nom.toLowerCase().includes(q) ||
      p.categorie.toLowerCase().includes(q);
    const matchCat = !catFilter || p.categorie === catFilter;
    return matchSearch && matchCat;
  });

  const openAchat = (p: Produit) => {
    setSelectedProduit(p);
    setModalVisible(true);
  };

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderItem = ({ item }: { item: Produit }) => {
    const stockBas = item.stock < 10;
    const catColor = CAT_COLORS[item.categorie] ?? Colors.primary;
    const totalRecu = totalRecuParProduit[item.id] ?? 0;
    const hasImage = !!item.image;

    return (
      <View style={styles.produitCard}>
        <Pressable style={{ flex: 1 }} onPress={() => openAchat(item)}>
          <View style={styles.cardInner}>
            <View style={styles.mediaContainer}>
              {hasImage ? (
                <Image
                  source={{ uri: getImageUrl(item.image!) }}
                  style={styles.produitImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.emojiContainer, { backgroundColor: catColor + "18" }]}>
                  <Text style={styles.emojiLarge}>
                    {item.emoji ?? CAT_EMOJIS[item.categorie] ?? "📦"}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.stockOverlay,
                  { backgroundColor: stockBas ? Colors.danger : Colors.success },
                ]}
              >
                <Text style={styles.stockOverlayText}>{item.stock}</Text>
              </View>
            </View>

            <View style={styles.infoContainer}>
              <View
                style={[
                  styles.catBadge,
                  { borderColor: catColor + "50", backgroundColor: catColor + "10" },
                ]}
              >
                <Text style={[styles.catBadgeText, { color: catColor }]}>
                  {item.categorie}
                </Text>
              </View>
              <Text style={styles.produitNom} numberOfLines={2}>
                {item.nom}
              </Text>
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Vente</Text>
                  <Text style={styles.priceVente}>{formatFCFA(item.prixVente)}</Text>
                </View>
                <View style={styles.priceDivider} />
                <View>
                  <Text style={styles.priceLabel}>Reçu total</Text>
                  <Text style={styles.priceRecu}>{totalRecu} u.</Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.achatBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => openAchat(item)}
        >
          <Ionicons name="cart" size={16} color={Colors.primary} />
          <Text style={styles.achatBtnText}>Acheter</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInsets + 16 }]}>
        <View>
          <Text style={styles.title}>Achats</Text>
          <Text style={styles.subtitle}>{produits.length} produit(s) disponible(s)</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => {
            setSelectedProduit(null);
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        <Pressable
          style={[styles.catFilterBtn, !catFilter && styles.catFilterBtnActive]}
          onPress={() => setCatFilter(null)}
        >
          <Text style={[styles.catFilterText, !catFilter && styles.catFilterTextActive]}>
            Tous
          </Text>
        </Pressable>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            style={[styles.catFilterBtn, catFilter === c && styles.catFilterBtnActive]}
            onPress={() => setCatFilter(catFilter === c ? null : c)}
          >
            <Text style={styles.catFilterEmojiSmall}>{CAT_EMOJIS[c]}</Text>
            <Text style={[styles.catFilterText, catFilter === c && styles.catFilterTextActive]}>
              {c}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 118 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 52 }}>🛒</Text>
              <Text style={styles.emptyText}>
                {search || catFilter ? "Aucun résultat" : "Aucun produit"}
              </Text>
              <Text style={styles.emptySubText}>
                Ajoutez des produits dans le catalogue pour pouvoir les acheter
              </Text>
            </View>
          }
        />
      )}

      <AchatModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedProduit(null);
        }}
        produits={produits}
        initialProduit={selectedProduit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.background },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  addBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, gap: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, padding: 0 },
  catRow: { marginBottom: 12 },
  catFilterBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  catFilterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catFilterText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  catFilterTextActive: { color: "#fff" },
  catFilterEmojiSmall: { fontSize: 13 },
  list: { paddingHorizontal: 16, gap: 12 },
  produitCard: { backgroundColor: Colors.surface, borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  cardInner: { flexDirection: "row" },
  mediaContainer: { width: 90, position: "relative" },
  produitImage: { width: 90, height: 90 },
  emojiContainer: { width: 90, height: 90, alignItems: "center", justifyContent: "center" },
  emojiLarge: { fontSize: 36 },
  stockOverlay: { position: "absolute", bottom: 6, right: 6, minWidth: 26, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  stockOverlayText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  infoContainer: { flex: 1, padding: 12, gap: 6, justifyContent: "center" },
  catBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  catBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  produitNom: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, lineHeight: 20 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  priceDivider: { width: 1, height: 20, backgroundColor: Colors.border },
  priceLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 1 },
  priceVente: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  priceRecu: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.accent },
  achatBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.primary + "06" },
  achatBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 20 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
});
