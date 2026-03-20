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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";

interface Produit {
  id: number;
  nom: string;
  emoji?: string;
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

const FOURNISSEURS = [
  { id: "BB Lomé", label: "BB Lomé", icon: "business" as const, color: Colors.accent },
  { id: "SNB", label: "SNB", icon: "business" as const, color: Colors.primary },
  { id: "Marché Local", label: "Marché Local", icon: "storefront" as const, color: Colors.info },
  { id: "Autre", label: "Autre", icon: "ellipsis-horizontal-circle" as const, color: "#9CA3AF" },
];

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

function getFournisseur(id: string) {
  return FOURNISSEURS.find((f) => f.id === id) ?? FOURNISSEURS[FOURNISSEURS.length - 1];
}

function AchatModal({
  visible,
  onClose,
  produits,
}: {
  visible: boolean;
  onClose: () => void;
  produits: Produit[];
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [quantite, setQuantite] = useState("1");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [fournisseur, setFournisseur] = useState("BB Lomé");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"produit" | "details">("produit");

  React.useEffect(() => {
    if (visible) {
      setSearch("");
      setSelectedProduit(null);
      setQuantite("1");
      setPrixUnitaire("");
      setFournisseur("BB Lomé");
      setNote("");
      setError("");
      setStep("produit");
    }
  }, [visible]);

  const filteredProduits = produits.filter((p) =>
    p.nom.toLowerCase().includes(search.toLowerCase()) ||
    p.categorie.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectProduit = (p: Produit) => {
    setSelectedProduit(p);
    setPrixUnitaire(p.prixAchat);
    setStep("details");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        produitId: selectedProduit!.id,
        quantite: parseInt(quantite),
        prixUnitaire,
        fournisseur,
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
    if (!quantite || isNaN(Number(quantite)) || Number(quantite) <= 0) { setError("Quantité invalide"); return; }
    if (!prixUnitaire || isNaN(Number(prixUnitaire)) || Number(prixUnitaire) < 0) { setError("Prix unitaire invalide"); return; }
    setError("");
    mutation.mutate();
  };

  const total = selectedProduit
    ? Number(prixUnitaire || 0) * Number(quantite || 0)
    : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={am.container}>
        <View style={am.handle} />
        <View style={am.header}>
          <Pressable onPress={step === "details" ? () => setStep("produit") : onClose} hitSlop={10}>
            <Ionicons name={step === "details" ? "arrow-back" : "close"} size={24} color={Colors.textMuted} />
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
                    <Text style={{ fontSize: 22 }}>{item.emoji || "📦"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={am.produitNom}>{item.nom}</Text>
                    <Text style={am.produitMeta}>{item.categorie} · Stock: {item.stock}</Text>
                  </View>
                  <Text style={am.produitPrix}>{formatFCFA(item.prixAchat)}</Text>
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

              {/* Selected product summary */}
              <View style={am.selectedProduct}>
                <Text style={{ fontSize: 28 }}>{selectedProduit?.emoji || "📦"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={am.selectedNom}>{selectedProduit?.nom}</Text>
                  <Text style={am.selectedMeta}>{selectedProduit?.categorie} · Stock actuel: {selectedProduit?.stock}</Text>
                </View>
              </View>

              {/* Fournisseur */}
              <View style={am.field}>
                <Text style={am.label}>Fournisseur</Text>
                <View style={am.fournisseurGrid}>
                  {FOURNISSEURS.map((f) => (
                    <Pressable
                      key={f.id}
                      style={[am.fournisseurItem, fournisseur === f.id && { borderColor: f.color, backgroundColor: f.color + "15" }]}
                      onPress={() => setFournisseur(f.id)}
                    >
                      <Ionicons name={f.icon} size={18} color={fournisseur === f.id ? f.color : Colors.textMuted} />
                      <Text style={[am.fournisseurText, fournisseur === f.id && { color: f.color, fontFamily: "Inter_600SemiBold" }]}>
                        {f.label}
                      </Text>
                      {fournisseur === f.id && (
                        <View style={[am.check, { backgroundColor: f.color }]}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Quantité */}
              <View style={am.field}>
                <Text style={am.label}>Quantité achetée *</Text>
                <View style={am.qtyRow}>
                  <Pressable
                    style={am.qtyBtn}
                    onPress={() => setQuantite(String(Math.max(1, parseInt(quantite || "1") - 1)))}
                  >
                    <Ionicons name="remove" size={20} color={Colors.text} />
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
                    onPress={() => setQuantite(String(parseInt(quantite || "0") + 1))}
                  >
                    <Ionicons name="add" size={20} color={Colors.text} />
                  </Pressable>
                </View>
              </View>

              {/* Prix unitaire */}
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

              {/* Total */}
              {total > 0 && (
                <View style={am.totalBox}>
                  <Text style={am.totalLabel}>Total achat</Text>
                  <Text style={am.totalValue}>{formatFCFA(total)}</Text>
                </View>
              )}

              {/* Note */}
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
              {mutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={am.saveBtnText}>Enregistrer l&apos;achat</Text>}
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
  produitPrix: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  emptyBox: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  body: { padding: 20, gap: 4 },
  errorBox: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular" },
  selectedProduct: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.primary + "10", borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: Colors.primary + "30" },
  selectedNom: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  selectedMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  fournisseurGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fournisseurItem: { width: "47%", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background, position: "relative" },
  fournisseurText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted, flex: 1 },
  check: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  qtyInput: { flex: 1, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 12, fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  totalBox: { backgroundColor: Colors.primary + "10", borderRadius: 12, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderWidth: 1.5, borderColor: Colors.primary + "30" },
  totalLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.primary },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});

// ── ÉCRAN ACHATS FOURNISSEURS ──
export default function AchatsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [fournisseurFilter, setFournisseurFilter] = useState<string | null>(null);

  const { data: achats = [], isLoading: loadingAchats } = useQuery<AchatFournisseur[]>({
    queryKey: ["/api/achats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/achats");
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
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/achats/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/achats"] });
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const confirmDelete = (a: AchatFournisseur) => {
    Alert.alert(
      "Annuler cet achat",
      `Voulez-vous annuler l'achat de "${a.produit.nom}" (${a.quantite} unité(s)) ?\nLe stock sera recalculé en conséquence.`,
      [
        { text: "Non", style: "cancel" },
        { text: "Annuler l'achat", style: "destructive", onPress: () => deleteMutation.mutate(a.id) },
      ]
    );
  };

  const filtered = fournisseurFilter
    ? achats.filter((a) => a.fournisseur === fournisseurFilter)
    : achats;

  const totalJour = achats
    .filter((a) => new Date(a.date).toDateString() === new Date().toDateString())
    .reduce((s, a) => s + Number(a.prixUnitaire) * a.quantite, 0);

  const totalFiltered = filtered.reduce((s, a) => s + Number(a.prixUnitaire) * a.quantite, 0);

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderItem = ({ item }: { item: AchatFournisseur }) => {
    const f = getFournisseur(item.fournisseur);
    const total = Number(item.prixUnitaire) * item.quantite;
    return (
      <Pressable
        style={({ pressed }) => [as.card, { opacity: pressed ? 0.95 : 1 }]}
        onLongPress={() => confirmDelete(item)}
      >
        <View style={[as.iconBox, { backgroundColor: f.color + "20" }]}>
          <Text style={{ fontSize: 22 }}>{item.produit.emoji || "📦"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={as.produitNom}>{item.produit.nom}</Text>
          <View style={as.metaRow}>
            <Text style={[as.fournisseurLabel, { color: f.color }]}>{item.fournisseur}</Text>
            <Text style={as.dot}>·</Text>
            <Text style={as.metaText}>{item.quantite} unité(s)</Text>
            <Text style={as.dot}>·</Text>
            <Text style={as.metaText}>{formatDate(item.date)}</Text>
          </View>
          {item.note ? <Text style={as.noteText} numberOfLines={1}>{item.note}</Text> : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={as.totalText}>{formatFCFA(total)}</Text>
          <Text style={as.prixUnit}>{formatFCFA(item.prixUnitaire)}/u</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={as.container}>
      <View style={[as.header, { paddingTop: topInsets + 16 }]}>
        <View>
          <Text style={as.title}>Achats Fournisseurs</Text>
          <Text style={as.subtitle}>
            Aujourd&apos;hui:{" "}
            <Text style={{ fontFamily: "Inter_700Bold", color: Colors.primary }}>{formatFCFA(totalJour)}</Text>
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [as.addBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Fournisseur filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={as.filterRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        <Pressable
          style={[as.filterBtn, !fournisseurFilter && as.filterBtnActive]}
          onPress={() => setFournisseurFilter(null)}
        >
          <Text style={[as.filterText, !fournisseurFilter && as.filterTextActive]}>Tous</Text>
        </Pressable>
        {FOURNISSEURS.map((f) => (
          <Pressable
            key={f.id}
            style={[as.filterBtn, fournisseurFilter === f.id && { borderColor: f.color, backgroundColor: f.color + "20" }]}
            onPress={() => setFournisseurFilter(fournisseurFilter === f.id ? null : f.id)}
          >
            <Ionicons name={f.icon} size={13} color={fournisseurFilter === f.id ? f.color : Colors.textMuted} />
            <Text style={[as.filterText, fournisseurFilter === f.id && { color: f.color, fontFamily: "Inter_600SemiBold" }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {fournisseurFilter && (
        <View style={as.summaryBar}>
          <Text style={as.summaryText}>{filtered.length} achat(s)</Text>
          <Text style={as.summaryTotal}>{formatFCFA(totalFiltered)}</Text>
        </View>
      )}

      {loadingAchats ? (
        <View style={as.loadingBox}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[as.list, { paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={as.emptyBox}>
              <Ionicons name="cube-outline" size={48} color={Colors.border} />
              <Text style={as.emptyText}>
                {fournisseurFilter ? "Aucun achat pour ce fournisseur" : "Aucun achat fournisseur"}
              </Text>
              <Text style={as.emptySubText}>Appuyez sur + pour enregistrer un achat</Text>
            </View>
          }
        />
      )}

      <AchatModal visible={modalVisible} onClose={() => setModalVisible(false)} produits={produits} />
    </View>
  );
}

const as = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.background },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  filterRow: { marginBottom: 8 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  filterTextActive: { color: "#fff" },
  summaryBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  summaryText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  summaryTotal: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.primary },
  list: { paddingHorizontal: 20, gap: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  produitNom: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3, flexWrap: "wrap" },
  fournisseurLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  dot: { color: Colors.textMuted, fontSize: 12 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  noteText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 3 },
  totalText: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.primary },
  prixUnit: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textAlign: "center" },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
