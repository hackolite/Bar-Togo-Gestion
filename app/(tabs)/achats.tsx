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
  categorie: string;
  prixAchat: string;
  prixVente: string;
  stock: number;
}

interface Fournisseur {
  id: number;
  nom: string;
  telephone?: string;
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
  const [fournisseur, setFournisseur] = useState("");
  const [fournisseurId, setFournisseurId] = useState<number | null>(null);
  const [showFournisseurList, setShowFournisseurList] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"produit" | "details">("produit");

  const { data: fournisseurs = [] } = useQuery<Fournisseur[]>({
    queryKey: ["/api/fournisseurs"],
  });

  React.useEffect(() => {
    if (visible) {
      setSearch("");
      const prod = initialProduit ?? null;
      setSelectedProduit(prod);
      setQuantite("1");
      setPrixUnitaire(prod && prod.prixAchat !== "0" ? prod.prixAchat : "");
      setFournisseur("");
      setFournisseurId(null);
      setShowFournisseurList(false);
      setNote("");
      setError("");
      setStep(prod ? "details" : "produit");
    }
  }, [visible, initialProduit]);

  const filteredFournisseurs = fournisseurs.filter((f) =>
    f.nom.toLowerCase().includes(fournisseur.toLowerCase())
  );

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
      const body: Record<string, unknown> = {
        produitId: selectedProduit!.id,
        quantite: parseInt(quantite),
        prixUnitaire,
        fournisseur: fournisseur.trim() || "Autre",
        note: note || undefined,
        date: new Date().toISOString(),
      };
      if (fournisseurId) body.fournisseurId = fournisseurId;
      const res = await apiRequest("POST", "/api/achats", body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/achats"] });
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/benefice-evolution"] });
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

              <View style={am.field}>
                <Text style={am.label}>Fournisseur</Text>
                {fournisseurId ? (
                  <View style={am.fournisseurSelected}>
                    <View style={am.fournisseurAvatarSm}>
                      <Text style={am.fournisseurAvatarSmText}>{fournisseur.charAt(0)}</Text>
                    </View>
                    <Text style={am.fournisseurSelectedNom} numberOfLines={1}>{fournisseur}</Text>
                    <Pressable
                      onPress={() => { setFournisseur(""); setFournisseurId(null); setShowFournisseurList(false); }}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={am.fournisseurInputRow}>
                      <Ionicons name="business-outline" size={16} color={Colors.textMuted} style={{ marginLeft: 12 }} />
                      <TextInput
                        style={am.fournisseurInput}
                        placeholder="Saisir ou choisir un fournisseur..."
                        placeholderTextColor={Colors.textMuted}
                        value={fournisseur}
                        onChangeText={(t) => { setFournisseur(t); setFournisseurId(null); setShowFournisseurList(true); }}
                        onFocus={() => setShowFournisseurList(true)}
                        autoCapitalize="words"
                      />
                      {fournisseur ? (
                        <Pressable onPress={() => { setFournisseur(""); setFournisseurId(null); }} hitSlop={8} style={{ marginRight: 12 }}>
                          <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                        </Pressable>
                      ) : null}
                    </View>
                    {showFournisseurList && filteredFournisseurs.length > 0 && (
                      <View style={am.fournisseurDropdown}>
                        {filteredFournisseurs.slice(0, 5).map((f) => (
                          <Pressable
                            key={f.id}
                            style={({ pressed }) => [am.fournisseurOption, { opacity: pressed ? 0.8 : 1 }]}
                            onPress={() => {
                              setFournisseur(f.nom);
                              setFournisseurId(f.id);
                              setShowFournisseurList(false);
                            }}
                          >
                            <View style={am.fournisseurAvatarSm}>
                              <Text style={am.fournisseurAvatarSmText}>{f.nom.charAt(0)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={am.fournisseurOptionNom}>{f.nom}</Text>
                              {f.telephone ? <Text style={am.fournisseurOptionTel}>{f.telephone}</Text> : null}
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </>
                )}
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
  fournisseurInputRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, gap: 8 },
  fournisseurInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text, paddingVertical: 12, paddingHorizontal: 6 },
  fournisseurSelected: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.accent + "12", borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: Colors.accent + "30" },
  fournisseurSelectedNom: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  fournisseurDropdown: { marginTop: 6, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, overflow: "hidden" },
  fournisseurOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  fournisseurAvatarSm: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.accent + "20", alignItems: "center", justifyContent: "center" },
  fournisseurAvatarSmText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.accent },
  fournisseurOptionNom: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  fournisseurOptionTel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});

// ── ÉCRAN ACHATS (CATALOGUE) ──
const CSV_ACHATS_EXEMPLE = `date,produit,quantite,prixUnitaire,fournisseur,note
2024-01-03,Flag Spéciale 65cl,96,500,BB Lomé,Commande semaine 1
2024-01-03,Castel Beer 65cl,48,500,BB Lomé,Commande semaine 1
2024-01-03,Flag Spéciale 33cl,72,300,BB Lomé,Commande semaine 1
2024-01-03,Coca-Cola 33cl,48,250,Brasseries Lomé,
2024-01-03,Fanta Orange 33cl,48,250,Brasseries Lomé,
2024-01-10,Flag Spéciale 65cl,96,500,BB Lomé,Commande semaine 2
2024-01-10,Heineken 33cl,24,600,Importateur,
2024-01-10,Guilele 65cl,60,450,BB Lomé,
2024-01-17,Flag Spéciale 65cl,96,500,BB Lomé,
2024-01-17,Castel Beer 65cl,48,500,BB Lomé,
2024-01-17,Sprite 33cl,36,250,Brasseries Lomé,
2024-01-24,Flag Spéciale 65cl,96,500,BB Lomé,
2024-01-24,Malta Guinness 33cl,36,300,BB Lomé,
2024-01-31,Flag Spéciale 65cl,96,500,BB Lomé,
2024-01-31,Castel Beer 65cl,48,500,BB Lomé,
2024-02-07,Flag Spéciale 65cl,96,500,BB Lomé,
2024-02-07,Heineken 33cl,24,600,Importateur,
2024-02-07,Guilele 65cl,60,450,BB Lomé,
2024-02-14,Flag Spéciale 65cl,120,500,BB Lomé,Saint-Valentin
2024-02-14,Castel Beer 65cl,60,500,BB Lomé,Saint-Valentin
2024-02-14,Champagne (flûte),6,1500,Importateur,Saint-Valentin
2024-02-21,Flag Spéciale 65cl,96,500,BB Lomé,
2024-02-28,Flag Spéciale 65cl,96,500,BB Lomé,
2024-02-28,Coca-Cola 33cl,48,250,Brasseries Lomé,
2024-03-06,Flag Spéciale 65cl,96,500,BB Lomé,
2024-03-06,Castel Beer 65cl,48,500,BB Lomé,
2024-03-13,Flag Spéciale 65cl,96,500,BB Lomé,
2024-03-20,Flag Spéciale 65cl,96,500,BB Lomé,
2024-03-27,Flag Spéciale 65cl,96,500,BB Lomé,
2024-03-27,Heineken 33cl,24,600,Importateur,
2024-04-03,Flag Spéciale 65cl,96,500,BB Lomé,
2024-04-03,Castel Beer 65cl,48,500,BB Lomé,
2024-04-10,Flag Spéciale 65cl,96,500,BB Lomé,
2024-04-17,Flag Spéciale 65cl,96,500,BB Lomé,
2024-04-24,Flag Spéciale 65cl,96,500,BB Lomé,
2024-05-01,Flag Spéciale 65cl,144,500,BB Lomé,Fête du travail
2024-05-01,Castel Beer 65cl,96,500,BB Lomé,Fête du travail
2024-05-08,Flag Spéciale 65cl,96,500,BB Lomé,
2024-05-15,Flag Spéciale 65cl,96,500,BB Lomé,
2024-05-22,Flag Spéciale 65cl,96,500,BB Lomé,
2024-06-05,Flag Spéciale 65cl,96,500,BB Lomé,
2024-06-05,Castel Beer 65cl,48,500,BB Lomé,
2024-06-12,Flag Spéciale 65cl,96,500,BB Lomé,
2024-06-19,Flag Spéciale 65cl,96,500,BB Lomé,
2024-06-26,Flag Spéciale 65cl,96,500,BB Lomé,
2024-07-03,Flag Spéciale 65cl,96,500,BB Lomé,
2024-07-10,Flag Spéciale 65cl,96,500,BB Lomé,
2024-07-10,Guilele 65cl,60,450,BB Lomé,
2024-07-17,Flag Spéciale 65cl,96,500,BB Lomé,
2024-08-07,Flag Spéciale 65cl,96,500,BB Lomé,
2024-08-07,Castel Beer 65cl,48,500,BB Lomé,
2024-08-14,Flag Spéciale 65cl,96,500,BB Lomé,
2024-09-04,Flag Spéciale 65cl,96,500,BB Lomé,
2024-09-11,Flag Spéciale 65cl,96,500,BB Lomé,
2024-09-18,Heineken 33cl,24,600,Importateur,
2024-10-02,Flag Spéciale 65cl,96,500,BB Lomé,
2024-10-09,Flag Spéciale 65cl,96,500,BB Lomé,
2024-10-09,Castel Beer 65cl,48,500,BB Lomé,
2024-11-06,Flag Spéciale 65cl,96,500,BB Lomé,
2024-11-13,Flag Spéciale 65cl,96,500,BB Lomé,
2024-12-04,Flag Spéciale 65cl,144,500,BB Lomé,Fêtes de fin d'année
2024-12-04,Castel Beer 65cl,96,500,BB Lomé,Fêtes
2024-12-04,Heineken 33cl,48,600,Importateur,Fêtes
2024-12-04,Champagne (flûte),12,1500,Importateur,Fêtes
2024-12-18,Flag Spéciale 65cl,144,500,BB Lomé,Stock Noël
2024-12-18,Castel Beer 65cl,72,500,BB Lomé,Stock Noël
2025-01-08,Flag Spéciale 65cl,96,500,BB Lomé,
2025-01-08,Castel Beer 65cl,48,500,BB Lomé,
2025-01-15,Flag Spéciale 65cl,96,500,BB Lomé,
2025-02-05,Flag Spéciale 65cl,96,500,BB Lomé,
2025-02-12,Flag Spéciale 65cl,120,500,BB Lomé,Saint-Valentin stock`;

// ── MODAL: IMPORT CSV ACHATS ──
function ImportCSVAchatsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
      const res = await apiRequest("POST", "/api/achats/import-csv", { csvText, skipFirstLine });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/achats"] });
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/benefice-evolution"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(data);
      setStep("done");
    },
    onError: (e: any) => Alert.alert("Erreur", e.message),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={ica.container}>
        <View style={ica.handle} />
        <View style={ica.header}>
          <Text style={ica.title}>Importer des achats CSV</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[ica.body, { gap: 16 }]}>
            {step === "edit" && (
              <>
                <View style={ica.formatBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.accent} />
                    <Text style={[ica.formatTitle, { color: Colors.accent }]}>Format attendu :</Text>
                  </View>
                  <Text style={ica.formatCode}>date,produit,quantite,prixUnitaire,fournisseur,note</Text>
                  <Text style={[ica.formatCode, { color: Colors.textMuted, marginTop: 4 }]}>
                    date: YYYY-MM-DD · produit: nom exact{"\n"}fournisseur et note: optionnels
                  </Text>
                  <Pressable style={ica.exampleBtn} onPress={() => setCsvText(CSV_ACHATS_EXEMPLE)}>
                    <Ionicons name="flash-outline" size={14} color={Colors.accent} />
                    <Text style={[ica.exampleBtnText, { color: Colors.accent }]}>{"Charger les données d'exemple (70 achats)"}</Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable style={{ padding: 2 }} onPress={() => setSkipFirstLine(!skipFirstLine)}>
                    <Ionicons
                      name={skipFirstLine ? "checkbox" : "square-outline"}
                      size={18}
                      color={skipFirstLine ? Colors.accent : Colors.textMuted}
                    />
                  </Pressable>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text }}>
                    La 1ère ligne est un en-tête (ignorer)
                  </Text>
                </View>

                <View>
                  <Text style={ica.fieldLabel}>Collez votre CSV ici</Text>
                  <TextInput
                    style={ica.textarea}
                    multiline
                    value={csvText}
                    onChangeText={setCsvText}
                    placeholder={`date,produit,quantite,prixUnitaire,fournisseur,note\n2024-01-10,Flag Spéciale 65cl,96,500,BB Lomé,`}
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
                  <Ionicons name="eye-outline" size={18} color={Colors.accent} />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text }}>
                    Aperçu ({preview.length} lignes{preview.length === 10 ? "+" : ""})
                  </Text>
                </View>
                {preview.map((row, i) => (
                  <View key={i} style={ica.previewRow}>
                    <Text style={ica.previewDate}>{row[0] || "—"}</Text>
                    <Text style={ica.previewNom} numberOfLines={1}>{row[1] || "—"}</Text>
                    <Text style={ica.previewDetail}>x{row[2] || "0"} · {row[3] || "0"} FCFA/u · {row[4] || "Autre"}</Text>
                    {row[5] ? <Text style={ica.previewNote}>{row[5]}</Text> : null}
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
              <View style={ica.doneBox}>
                <Text style={{ fontSize: 48 }}>✅</Text>
                <Text style={ica.doneTitle}>{result.count} achat(s) importé(s)</Text>
                {result.errors.length > 0 && (
                  <View style={ica.errorsBox}>
                    <Text style={ica.errorsTitle}>{result.errors.length} erreur(s) :</Text>
                    {result.errors.map((e, i) => (
                      <Text key={i} style={ica.errorLine}>{e}</Text>
                    ))}
                  </View>
                )}
                <Pressable style={[ica.saveBtn, { marginTop: 12 }]} onPress={onClose}>
                  <Text style={ica.saveBtnText}>Fermer</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        {step !== "done" && (
          <View style={ica.footer}>
            {step === "edit" ? (
              <Pressable
                style={({ pressed }) => [ica.saveBtn, { opacity: pressed || !csvText.trim() ? 0.6 : 1 }]}
                onPress={parsePreview}
                disabled={!csvText.trim()}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" />
                <Text style={ica.saveBtnText}>Prévisualiser</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [ica.saveBtn, { opacity: pressed ? 0.85 : 1, backgroundColor: "#52B788" }]}
                onPress={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={ica.saveBtnText}>Importation...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                    <Text style={ica.saveBtnText}>Importer {preview.length} achat(s)</Text>
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

const ica = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginTop: 8, marginBottom: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  body: { padding: 20 },
  formatBox: { backgroundColor: Colors.accent + "0D", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.accent + "25" },
  formatTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  formatCode: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.text, fontVariant: ["tabular-nums"] },
  exampleBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.accent + "15" },
  exampleBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  textarea: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, padding: 14, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 180, maxHeight: 260 },
  previewRow: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  previewDate: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  previewNom: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  previewDetail: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.accent },
  previewNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  doneBox: { alignItems: "center", paddingVertical: 20, gap: 8 },
  doneTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  errorsBox: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, width: "100%", gap: 4 },
  errorsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.danger },
  errorLine: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.danger },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});

export default function AchatsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  const { data: produits = [] } = useQuery<Produit[]>({
    queryKey: ["/api/produits"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/produits");
      return res.json();
    },
  });

  const { data: achats = [], isLoading } = useQuery<AchatFournisseur[]>({
    queryKey: ["/api/achats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/achats");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/achats/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/achats"] });
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/benefice-evolution"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const confirmDelete = (a: AchatFournisseur) => {
    Alert.alert(
      "Supprimer l'achat",
      `Voulez-vous supprimer cet achat de ${formatFCFA(Number(a.prixUnitaire) * a.quantite)} ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => deleteMutation.mutate(a.id) },
      ]
    );
  };

  const totalJour = React.useMemo(() => {
    const today = new Date().toDateString();
    return achats
      .filter((a) => new Date(a.date).toDateString() === today)
      .reduce((s, a) => s + Number(a.prixUnitaire) * a.quantite, 0);
  }, [achats]);

  const filteredAchats = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return achats
      .filter((a) => {
        if (!q) return true;
        return (
          a.produit.nom.toLowerCase().includes(q) ||
          (a.fournisseur && a.fournisseur.toLowerCase().includes(q))
        );
      })
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [achats, search]);

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderAchat = ({ item }: { item: AchatFournisseur }) => {
    const total = Number(item.prixUnitaire) * item.quantite;
    const produit = item.produit;
    return (
      <View style={styles.achatCard}>
        <View style={styles.achatHeader}>
          <View style={styles.achatIconBox}>
            <Ionicons name="cart" size={18} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.achatDate}>{formatDate(item.date)}</Text>
            {item.fournisseur ? (
              <Text style={styles.achatFournisseur}>🏪 {item.fournisseur}</Text>
            ) : null}
          </View>
          <Text style={styles.achatTotal}>{formatFCFA(total)}</Text>
          <Pressable
            onPress={() => confirmDelete(item)}
            hitSlop={8}
            style={{ marginLeft: 8, padding: 4 }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </Pressable>
        </View>
        <View style={styles.achatDivider} />
        <View style={styles.achatBody}>
          <View style={styles.achatRow}>
            <Text style={styles.achatProdNom} numberOfLines={1}>
              {produit?.emoji || (produit?.categorie && CAT_EMOJIS[produit.categorie]) || "📦"}{" "}
              {produit?.nom ?? "Produit supprimé"}
            </Text>
            <Text style={styles.achatQty}>×{item.quantite}</Text>
            <Text style={styles.achatPrix}>{formatFCFA(item.prixUnitaire)}/u</Text>
          </View>
          {item.note ? <Text style={styles.achatNote}>{item.note}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInsets + 16 }]}>
        <View>
          <Text style={styles.title}>Achats</Text>
          <Text style={styles.subtitle}>Aujourd'hui: {formatFCFA(totalJour)}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={({ pressed }) => [styles.importBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => setCsvModalVisible(true)}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={Colors.accent} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par produit ou fournisseur..."
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

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredAchats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAchat}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 118 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="cart-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>
                {search ? "Aucun résultat" : "Aucun achat"}
              </Text>
              <Text style={styles.emptySubText}>
                Appuyez sur + pour enregistrer un achat
              </Text>
            </View>
          }
        />
      )}

      <AchatModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        produits={produits}
      />
      <ImportCSVAchatsModal
        visible={csvModalVisible}
        onClose={() => setCsvModalVisible(false)}
      />
    </View>
  );
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.background,
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
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accent + "15",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.accent + "40",
  },
  searchRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface,
    marginHorizontal: 20, marginBottom: 12, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, padding: 0 },
  list: { paddingHorizontal: 20, gap: 12 },
  achatCard: {
    backgroundColor: Colors.surface, borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  achatHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  achatIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.background, alignItems: "center", justifyContent: "center",
  },
  achatDate: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  achatFournisseur: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  achatTotal: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.accent },
  achatDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  achatBody: { padding: 12, gap: 4 },
  achatRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  achatProdNom: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text },
  achatQty: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  achatPrix: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  achatNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
