import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
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
  description?: string;
  categorie: string;
  prixAchat: string;
  prixVente: string;
  stock: number;
}

const CATEGORIES = ["Boissons", "Alcools", "Cocktails", "Nourriture", "Autres"];

const FOURNISSEURS = [
  { id: "bb_lome", label: "BB Lomé", icon: "business" as const, color: "#E9A818" },
  { id: "snb", label: "SNB", icon: "business" as const, color: "#2D6A4F" },
  { id: "marche", label: "Marché Local", icon: "storefront" as const, color: "#3A86FF" },
  { id: "autre", label: "Autre", icon: "ellipsis-horizontal-circle" as const, color: "#9CA3AF" },
];

function formatFCFA(v: string | number) {
  return new Intl.NumberFormat("fr-FR").format(Number(v)) + " FCFA";
}

// ── MODAL: NOUVEAU/MODIFIER PRODUIT ──
function ProduitModal({
  visible,
  onClose,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  initial?: Produit | null;
}) {
  const qc = useQueryClient();
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categorie, setCategorie] = useState(initial?.categorie ?? "Boissons");
  const [prixAchat, setPrixAchat] = useState(initial?.prixAchat?.toString() ?? "");
  const [prixVente, setPrixVente] = useState(initial?.prixVente?.toString() ?? "");
  const [stock, setStock] = useState(initial?.stock?.toString() ?? "0");
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (visible) {
      setNom(initial?.nom ?? "");
      setDescription(initial?.description ?? "");
      setCategorie(initial?.categorie ?? "Boissons");
      setPrixAchat(initial?.prixAchat?.toString() ?? "");
      setPrixVente(initial?.prixVente?.toString() ?? "");
      setStock(initial?.stock?.toString() ?? "0");
      setError("");
    }
  }, [visible, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body = { nom, description: description || undefined, categorie, prixAchat, prixVente, stock: parseInt(stock) || 0 };
      if (initial) {
        const res = await apiRequest("PUT", `/api/produits/${initial.id}`, body);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/produits", body);
        return res.json();
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const handleSave = () => {
    if (!nom || !prixAchat || !prixVente) {
      setError("Nom, prix d'achat et prix de vente sont obligatoires");
      return;
    }
    if (isNaN(Number(prixAchat)) || isNaN(Number(prixVente))) {
      setError("Les prix doivent être des nombres valides");
      return;
    }
    setError("");
    mutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={ms.container}>
        <View style={ms.handle} />
        <View style={ms.header}>
          <Text style={ms.title}>{initial ? "Modifier le produit" : "Nouveau produit"}</Text>
          <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={ms.body}>
            {error ? <View style={ms.errorBox}><Text style={ms.errorText}>{error}</Text></View> : null}
            <MField label="Nom du produit *">
              <TextInput style={ms.input} placeholder="Ex: Bière Flag 65cl" placeholderTextColor={Colors.textMuted} value={nom} onChangeText={setNom} />
            </MField>
            <MField label="Catégorie">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                  {CATEGORIES.map((c) => (
                    <Pressable key={c} style={[ms.chip, categorie === c && ms.chipActive]} onPress={() => setCategorie(c)}>
                      <Text style={[ms.chipText, categorie === c && ms.chipTextActive]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </MField>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <MField label="Prix achat (FCFA) *">
                  <TextInput style={ms.input} placeholder="500" placeholderTextColor={Colors.textMuted} value={prixAchat} onChangeText={setPrixAchat} keyboardType="numeric" />
                </MField>
              </View>
              <View style={{ flex: 1 }}>
                <MField label="Prix vente (FCFA) *">
                  <TextInput style={ms.input} placeholder="800" placeholderTextColor={Colors.textMuted} value={prixVente} onChangeText={setPrixVente} keyboardType="numeric" />
                </MField>
              </View>
            </View>
            <MField label="Stock initial">
              <TextInput style={ms.input} placeholder="0" placeholderTextColor={Colors.textMuted} value={stock} onChangeText={setStock} keyboardType="numeric" />
            </MField>
            <MField label="Description (optionnel)">
              <TextInput style={[ms.input, { height: 64, textAlignVertical: "top" }]} placeholder="Notes..." placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} multiline />
            </MField>
          </View>
        </ScrollView>
        <View style={ms.footer}>
          <Pressable style={({ pressed }) => [ms.saveBtn, { opacity: pressed ? 0.85 : 1 }]} onPress={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={ms.saveBtnText}>{initial ? "Enregistrer" : "Ajouter le produit"}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── MODAL: RÉAPPROVISIONNEMENT ──
function ReapproModal({
  visible,
  onClose,
  produit,
}: {
  visible: boolean;
  onClose: () => void;
  produit: Produit | null;
}) {
  const qc = useQueryClient();
  const [quantite, setQuantite] = useState("");
  const [fournisseur, setFournisseur] = useState("bb_lome");
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (visible) { setQuantite(""); setFournisseur("bb_lome"); setError(""); }
  }, [visible]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!produit) return;
      const res = await apiRequest("POST", `/api/produits/${produit.id}/reappro`, {
        quantite: Number(quantite),
        fournisseur: FOURNISSEURS.find((f) => f.id === fournisseur)?.label ?? "Autre",
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const handleSave = () => {
    if (!quantite || isNaN(Number(quantite)) || Number(quantite) <= 0) {
      setError("Veuillez saisir une quantité valide");
      return;
    }
    setError("");
    mutation.mutate();
  };

  if (!produit) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={ms.container}>
        <View style={ms.handle} />
        <View style={ms.header}>
          <Text style={ms.title}>Réapprovisionnement</Text>
          <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <View style={ms.body}>
            <View style={re.prodCard}>
              <Ionicons name="cube" size={22} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={re.prodNom}>{produit.nom}</Text>
                <Text style={re.prodStock}>Stock actuel : <Text style={{ color: produit.stock > 5 ? Colors.success : Colors.danger }}>{produit.stock}</Text></Text>
              </View>
            </View>

            {error ? <View style={ms.errorBox}><Text style={ms.errorText}>{error}</Text></View> : null}

            <MField label="Fournisseur">
              <View style={re.fournGrid}>
                {FOURNISSEURS.map((f) => (
                  <Pressable
                    key={f.id}
                    style={[re.fournCard, fournisseur === f.id && { borderColor: f.color, backgroundColor: f.color + "15" }]}
                    onPress={() => setFournisseur(f.id)}
                  >
                    <Ionicons name={f.icon} size={22} color={fournisseur === f.id ? f.color : Colors.textMuted} />
                    <Text style={[re.fournLabel, fournisseur === f.id && { color: f.color }]}>{f.label}</Text>
                    {fournisseur === f.id && (
                      <View style={[re.fournCheck, { backgroundColor: f.color }]}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </MField>

            <MField label="Quantité reçue">
              <View style={re.qtyRow}>
                <Pressable
                  style={re.qtyBtn}
                  onPress={() => setQuantite((v) => String(Math.max(0, Number(v) - 1)))}
                >
                  <Ionicons name="remove" size={20} color={Colors.primary} />
                </Pressable>
                <TextInput
                  style={re.qtyInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={quantite}
                  onChangeText={setQuantite}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <Pressable
                  style={re.qtyBtn}
                  onPress={() => { setQuantite((v) => String(Number(v) + 1)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Ionicons name="add" size={20} color={Colors.primary} />
                </Pressable>
              </View>
              {Number(quantite) > 0 && (
                <Text style={re.previewStock}>
                  Nouveau stock : <Text style={{ fontFamily: "Inter_700Bold", color: Colors.primary }}>{produit.stock + Number(quantite)}</Text>
                </Text>
              )}
            </MField>

            <View style={re.quickBtns}>
              {[6, 12, 24, 48].map((n) => (
                <Pressable key={n} style={re.quickBtn} onPress={() => setQuantite(String(n))}>
                  <Text style={re.quickBtnText}>+{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={ms.footer}>
          <Pressable style={({ pressed }) => [re.saveBtn, { opacity: pressed ? 0.85 : 1 }]} onPress={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="arrow-up-circle" size={20} color="#fff" /><Text style={ms.saveBtnText}>Confirmer le stock</Text></>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={ms.field}>
      <Text style={ms.label}>{label}</Text>
      {children}
    </View>
  );
}

const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginTop: 8, marginBottom: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  errorBox: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular" },
  body: { padding: 20, gap: 4 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  chipTextActive: { color: "#fff" },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});

const re = StyleSheet.create({
  prodCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.background, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  prodNom: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  prodStock: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  fournGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fournCard: { flex: 1, minWidth: "45%", flexDirection: "column", alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background, position: "relative" },
  fournLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textAlign: "center" },
  fournCheck: { position: "absolute", top: 8, right: 8, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  qtyInput: { flex: 1, fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 10, textAlign: "center" },
  previewStock: { marginTop: 8, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  quickBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  quickBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  quickBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
});

// ── ÉCRAN INVENTAIRE ──
export default function InventaireScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [reapproVisible, setReapproVisible] = useState(false);
  const [editing, setEditing] = useState<Produit | null>(null);
  const [reapproProduit, setReapproProduit] = useState<Produit | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const { data: produits = [], isLoading } = useQuery<Produit[]>({
    queryKey: ["/api/produits"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/produits");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/produits/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/produits"] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seed/produits", {});
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Produits chargés", `${data.count} produits par défaut ont été ajoutés.`);
    },
    onError: (e: any) => Alert.alert("Erreur", e.message),
  });

  const filtered = produits.filter((p) => {
    const matchSearch = p.nom.toLowerCase().includes(search.toLowerCase()) || p.categorie.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || p.categorie === catFilter;
    return matchSearch && matchCat;
  });

  const confirmDelete = (p: Produit) => {
    Alert.alert("Supprimer le produit", `Voulez-vous supprimer "${p.nom}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
    ]);
  };

  const openReappro = (p: Produit) => { setReapproProduit(p); setReapproVisible(true); };

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderItem = ({ item }: { item: Produit }) => {
    const marge = Number(item.prixVente) - Number(item.prixAchat);
    const margePercent = Number(item.prixAchat) > 0 ? ((marge / Number(item.prixAchat)) * 100).toFixed(0) : 0;
    const stockBas = item.stock <= 5;
    return (
      <View style={styles.produitCard}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => { setEditing(item); setModalVisible(true); }}
          onLongPress={() => confirmDelete(item)}
        >
          <View style={styles.produitTop}>
            <View style={styles.catBadge}>
              <Text style={styles.catBadgeText}>{item.categorie}</Text>
            </View>
            <View style={[styles.stockBadge, stockBas && styles.stockBadgeLow]}>
              <Text style={[styles.stockNum, stockBas && { color: Colors.danger }]}>{item.stock}</Text>
              <Text style={[styles.stockLabel, stockBas && { color: Colors.danger }]}>stock</Text>
            </View>
          </View>
          <Text style={styles.produitNom}>{item.nom}</Text>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Achat</Text>
              <Text style={styles.priceAchat}>{formatFCFA(item.prixAchat)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View>
              <Text style={styles.priceLabel}>Vente</Text>
              <Text style={styles.priceVente}>{formatFCFA(item.prixVente)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View>
              <Text style={styles.priceLabel}>Marge</Text>
              <Text style={[styles.marge, { color: marge >= 0 ? Colors.success : Colors.danger }]}>+{margePercent}%</Text>
            </View>
          </View>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.reapproBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => openReappro(item)}
        >
          <Ionicons name="arrow-up-circle" size={16} color={Colors.primary} />
          <Text style={styles.reapproBtnText}>Réappro</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInsets + 16 }]}>
        <Text style={styles.title}>Inventaire</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={({ pressed }) => [styles.addBtn, styles.addBtnSecondary, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => { setEditing(null); setModalVisible(true); }}
          >
            <Ionicons name="add" size={22} color={Colors.primary} />
          </Pressable>
        </View>
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        <Pressable style={[styles.catFilterBtn, !catFilter && styles.catFilterBtnActive]} onPress={() => setCatFilter(null)}>
          <Text style={[styles.catFilterText, !catFilter && styles.catFilterTextActive]}>Tous</Text>
        </Pressable>
        {CATEGORIES.map((c) => (
          <Pressable key={c} style={[styles.catFilterBtn, catFilter === c && styles.catFilterBtnActive]} onPress={() => setCatFilter(catFilter === c ? null : c)}>
            <Text style={[styles.catFilterText, catFilter === c && styles.catFilterTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="cube-outline" size={56} color={Colors.border} />
              <Text style={styles.emptyText}>{search || catFilter ? "Aucun résultat" : "Aucun produit"}</Text>
              {!search && !catFilter && produits.length === 0 && (
                <Pressable
                  style={({ pressed }) => [styles.seedBtn, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => {
                    Alert.alert(
                      "Charger les produits par défaut",
                      "Cela va ajouter environ 100 produits typiques d'un bar-restaurant togolais. Continuer ?",
                      [
                        { text: "Annuler", style: "cancel" },
                        { text: "Charger", onPress: () => seedMutation.mutate() },
                      ]
                    );
                  }}
                  disabled={seedMutation.isPending}
                >
                  {seedMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={18} color="#fff" />
                      <Text style={styles.seedBtnText}>Charger les produits par défaut</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          }
        />
      )}

      <ProduitModal visible={modalVisible} onClose={() => setModalVisible(false)} initial={editing} />
      <ReapproModal visible={reapproVisible} onClose={() => setReapproVisible(false)} produit={reapproProduit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.background },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  addBtnSecondary: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, shadowOpacity: 0 },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, gap: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, padding: 0 },
  catRow: { marginBottom: 12 },
  catFilterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  catFilterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catFilterText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  catFilterTextActive: { color: "#fff" },
  list: { paddingHorizontal: 20, gap: 10 },
  produitCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, gap: 10 },
  produitTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catBadge: { alignSelf: "flex-start", backgroundColor: Colors.background, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  catBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  produitNom: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  priceDivider: { width: 1, height: 24, backgroundColor: Colors.border },
  priceLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 2 },
  priceAchat: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  priceVente: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  marge: { fontSize: 12, fontFamily: "Inter_700Bold" },
  stockBadge: { alignItems: "center", justifyContent: "center", backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  stockBadgeLow: { borderColor: Colors.danger + "60", backgroundColor: Colors.danger + "10" },
  stockNum: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  stockLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  reapproBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.primary + "60", backgroundColor: Colors.primary + "08" },
  reapproBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 14 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  seedBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4, marginTop: 8 },
  seedBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
