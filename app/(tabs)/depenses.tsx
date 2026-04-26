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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";

interface Depense {
  id: number;
  libelle: string;
  montant: string;
  categorie: string;
  recurrence: "ponctuelle" | "mensuelle";
  date: string;
  note?: string;
}

const CATEGORIES_DEPENSE = [
  { id: "Salaires", label: "Salaires", icon: "people" as const, color: "#8B5CF6", desc: "Personnel, employés" },
  { id: "Loyer", label: "Loyer", icon: "home" as const, color: "#F97316", desc: "Location des locaux" },
  { id: "Électricité (CEET)", label: "Électricité (CEET)", icon: "flash" as const, color: Colors.accent, desc: "Facture CEET" },
  { id: "Eau (TdE)", label: "Eau (TdE)", icon: "water" as const, color: Colors.info, desc: "Facture TdE" },
  { id: "Transport", label: "Transport", icon: "car" as const, color: "#6B7280", desc: "Livraisons, déplacements" },
  { id: "Entretien", label: "Entretien", icon: "construct" as const, color: "#0F766E", desc: "Réparations, nettoyage" },
  { id: "Impôts & Taxes", label: "Impôts & Taxes", icon: "document-text" as const, color: "#DC2626", desc: "Taxes, patentes" },
  { id: "Général", label: "Général", icon: "ellipsis-horizontal-circle" as const, color: "#9CA3AF", desc: "Autres dépenses" },
];

function formatFCFA(v: string | number) {
  return new Intl.NumberFormat("fr-FR").format(Number(v)) + " FCFA";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getCat(id: string) {
  return CATEGORIES_DEPENSE.find((c) => c.id === id) ?? CATEGORIES_DEPENSE[CATEGORIES_DEPENSE.length - 1];
}

function DepenseModal({
  visible,
  onClose,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  initial?: Depense | null;
}) {
  const qc = useQueryClient();
  const [libelle, setLibelle] = useState(initial?.libelle ?? "");
  const [montant, setMontant] = useState(initial?.montant?.toString() ?? "");
  const [categorie, setCategorie] = useState(initial?.categorie ?? "Général");
  const [recurrence, setRecurrence] = useState<"ponctuelle" | "mensuelle">(initial?.recurrence ?? "ponctuelle");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (visible) {
      setLibelle(initial?.libelle ?? "");
      setMontant(initial?.montant?.toString() ?? "");
      setCategorie(initial?.categorie ?? "Général");
      setRecurrence(initial?.recurrence ?? (initial ? "ponctuelle" : "ponctuelle"));
      setNote(initial?.note ?? "");
      setError("");
    }
  }, [visible, initial]);

  // Suggérer "mensuelle" automatiquement quand on choisit Loyer / Eau / Electricité / Salaires
  const CATS_MENSUELLES_PAR_DEFAUT = ["Loyer", "Eau (TdE)", "Électricité (CEET)", "Salaires"];
  const handleSelectCategorie = (id: string) => {
    setCategorie(id);
    if (!initial && CATS_MENSUELLES_PAR_DEFAUT.includes(id)) {
      setRecurrence("mensuelle");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const body = { libelle, montant, categorie, recurrence, note: note || undefined, date: new Date().toISOString() };
      if (initial) {
        const res = await apiRequest("PUT", `/api/depenses/${initial.id}`, body);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/depenses", body);
        return res.json();
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/depenses"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/benefice-evolution"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const handleSave = () => {
    if (!libelle || !montant) { setError("Libellé et montant sont obligatoires"); return; }
    if (isNaN(Number(montant)) || Number(montant) <= 0) { setError("Le montant doit être un nombre positif"); return; }
    setError("");
    mutation.mutate();
  };

  const selectedCat = getCat(categorie);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={dm.container}>
        <View style={dm.handle} />
        <View style={dm.header}>
          <Text style={dm.title}>{initial ? "Modifier la dépense" : "Nouvelle dépense"}</Text>
          <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={dm.body}>
            {error ? <View style={dm.errorBox}><Text style={dm.errorText}>{error}</Text></View> : null}

            <View style={dm.field}>
              <Text style={dm.label}>Catégorie</Text>
              <View style={dm.catGrid}>
                {CATEGORIES_DEPENSE.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[dm.catItem, categorie === c.id && { borderColor: c.color, backgroundColor: c.color + "15" }]}
                    onPress={() => handleSelectCategorie(c.id)}
                  >
                    <Ionicons name={c.icon} size={20} color={categorie === c.id ? c.color : Colors.textMuted} />
                    <Text style={[dm.catItemText, categorie === c.id && { color: c.color, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                      {c.label}
                    </Text>
                    {categorie === c.id && (
                      <View style={[dm.catCheck, { backgroundColor: c.color }]}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
              {selectedCat && (
                <View style={[dm.catHint, { borderLeftColor: selectedCat.color }]}>
                  <Text style={[dm.catHintText, { color: selectedCat.color }]}>{selectedCat.desc}</Text>
                </View>
              )}
            </View>

            <View style={dm.field}>
              <Text style={dm.label}>Récurrence</Text>
              <View style={dm.recRow}>
                <Pressable
                  onPress={() => setRecurrence("ponctuelle")}
                  style={[dm.recBtn, recurrence === "ponctuelle" && dm.recBtnActive]}
                >
                  <Ionicons name="calendar-outline" size={16} color={recurrence === "ponctuelle" ? Colors.primary : Colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={[dm.recLabel, recurrence === "ponctuelle" && { color: Colors.primary }]}>Ponctuelle</Text>
                    <Text style={dm.recHint}>Une seule fois</Text>
                  </View>
                  {recurrence === "ponctuelle" && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
                </Pressable>
                <Pressable
                  onPress={() => setRecurrence("mensuelle")}
                  style={[dm.recBtn, recurrence === "mensuelle" && dm.recBtnActiveAccent]}
                >
                  <Ionicons name="repeat" size={16} color={recurrence === "mensuelle" ? Colors.accent : Colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={[dm.recLabel, recurrence === "mensuelle" && { color: Colors.accent }]}>Mensuelle</Text>
                    <Text style={dm.recHint}>Tous les mois (amortie/jour)</Text>
                  </View>
                  {recurrence === "mensuelle" && <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />}
                </Pressable>
              </View>
            </View>

            <View style={dm.field}>
              <Text style={dm.label}>Libellé *</Text>
              <TextInput
                style={dm.input}
                placeholder={categorie === "Salaires" ? "Ex: Salaire barman juillet" : "Décrire la dépense..."}
                placeholderTextColor={Colors.textMuted}
                value={libelle}
                onChangeText={setLibelle}
                autoCapitalize="sentences"
              />
            </View>

            <View style={dm.field}>
              <Text style={dm.label}>Montant (FCFA) *</Text>
              <TextInput
                style={dm.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={montant}
                onChangeText={setMontant}
                keyboardType="numeric"
              />
            </View>

            <View style={dm.field}>
              <Text style={dm.label}>Note (optionnel)</Text>
              <TextInput
                style={[dm.input, { height: 70, textAlignVertical: "top" }]}
                placeholder="Commentaire..."
                placeholderTextColor={Colors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </View>
          </View>
        </ScrollView>
        <View style={dm.footer}>
          <Pressable style={({ pressed }) => [dm.saveBtn, { opacity: pressed ? 0.85 : 1 }]} onPress={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={dm.saveBtnText}>{initial ? "Enregistrer" : "Ajouter la dépense"}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
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
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catItem: { width: "47%", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background, position: "relative" },
  catItemText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted, flex: 1 },
  catCheck: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catHint: { marginTop: 8, paddingLeft: 10, borderLeftWidth: 3, borderRadius: 2 },
  catHintText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  recRow: { gap: 8 },
  recBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  recBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "10" },
  recBtnActiveAccent: { borderColor: Colors.accent, backgroundColor: Colors.accent + "15" },
  recLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  recHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.danger, borderRadius: 14, paddingVertical: 16, alignItems: "center", shadowColor: Colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});

// ── ÉCRAN DÉPENSES ──
export default function DepensesScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Depense | null>(null);
  const [catFilter, setCatFilter] = useState<string | null>(null);

  const { data: depenses = [], isLoading } = useQuery<Depense[]>({
    queryKey: ["/api/depenses"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/depenses");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/depenses/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/depenses"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/benefice-evolution"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const confirmDelete = (d: Depense) => {
    showAlert("Supprimer la dépense", `Voulez-vous supprimer "${d.libelle}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => deleteMutation.mutate(d.id) },
    ]);
  };

  const filtered = catFilter ? depenses.filter((d) => d.categorie === catFilter) : depenses;

  const totalJour = depenses.filter((d) => {
    const date = new Date(d.date);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }).reduce((s, d) => s + Number(d.montant), 0);

  const totalFiltered = filtered.reduce((s, d) => s + Number(d.montant), 0);

  const topInsets = isLiquidGlassAvailable() ? Math.max(insets.top, 67) : insets.top;

  const renderItem = ({ item }: { item: Depense }) => {
    const cat = getCat(item.categorie);
    const isMensuelle = item.recurrence === "mensuelle";
    return (
      <Pressable
        style={({ pressed }) => [ds.depCard, { opacity: pressed ? 0.95 : 1 }, isMensuelle && { borderLeftWidth: 4, borderLeftColor: Colors.accent }]}
        onPress={() => { setEditing(item); setModalVisible(true); }}
        onLongPress={() => confirmDelete(item)}
      >
        <View style={[ds.depIcon, { backgroundColor: cat.color + "20" }]}>
          <Ionicons name={cat.icon} size={20} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={ds.depLibelle}>{item.libelle}</Text>
            {isMensuelle && (
              <View style={ds.badgeMensuelle}>
                <Ionicons name="repeat" size={10} color={Colors.accent} />
                <Text style={ds.badgeMensuelleText}>Mensuelle</Text>
              </View>
            )}
          </View>
          <View style={ds.depMeta}>
            <Text style={[ds.depCat, { color: cat.color }]}>{item.categorie}</Text>
            <Text style={ds.dot}>·</Text>
            <Text style={ds.depDate}>{formatDate(item.date)}</Text>
          </View>
          {item.note ? <Text style={ds.depNote} numberOfLines={1}>{item.note}</Text> : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={ds.depMontant}>{formatFCFA(item.montant)}</Text>
          {isMensuelle && (
            <Text style={ds.depMontantHint}>
              ≈ {formatFCFA(Math.round(Number(item.montant) / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()))} / jour
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={ds.container}>
      <View style={[ds.header, { paddingTop: topInsets + 16 }]}>
        <View>
          <Text style={ds.title}>Dépenses</Text>
          <Text style={ds.subtitle}>
            Aujourd'hui: <Text style={{ fontFamily: "Inter_700Bold", color: Colors.danger }}>{formatFCFA(totalJour)}</Text>
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [ds.addBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => { setEditing(null); setModalVisible(true); }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ds.catRow} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        <Pressable style={[ds.catFilterBtn, !catFilter && ds.catFilterBtnActive]} onPress={() => setCatFilter(null)}>
          <Text style={[ds.catFilterText, !catFilter && ds.catFilterTextActive]}>Toutes</Text>
        </Pressable>
        {CATEGORIES_DEPENSE.map((c) => (
          <Pressable
            key={c.id}
            style={[ds.catFilterBtn, catFilter === c.id && { borderColor: c.color, backgroundColor: c.color + "20" }]}
            onPress={() => setCatFilter(catFilter === c.id ? null : c.id)}
          >
            <Ionicons name={c.icon} size={13} color={catFilter === c.id ? c.color : Colors.textMuted} />
            <Text style={[ds.catFilterText, catFilter === c.id && { color: c.color, fontFamily: "Inter_600SemiBold" }]}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {catFilter && (
        <View style={ds.summaryBar}>
          <Text style={ds.summaryText}>{filtered.length} dépense(s)</Text>
          <Text style={ds.summaryTotal}>{formatFCFA(totalFiltered)}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={ds.loadingBox}><ActivityIndicator color={Colors.danger} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[ds.list, { paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={ds.emptyBox}>
              <Ionicons name="card-outline" size={48} color={Colors.border} />
              <Text style={ds.emptyText}>{catFilter ? "Aucune dépense dans cette catégorie" : "Aucune dépense"}</Text>
              <Text style={ds.emptySubText}>Appuyez sur + pour ajouter</Text>
            </View>
          }
        />
      )}

      <DepenseModal visible={modalVisible} onClose={() => setModalVisible(false)} initial={editing} />
    </View>
  );
}

const ds = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.background },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.danger, alignItems: "center", justifyContent: "center", shadowColor: Colors.danger, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  catRow: { marginBottom: 8 },
  catFilterBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  catFilterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catFilterText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  catFilterTextActive: { color: "#fff" },
  summaryBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  summaryText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  summaryTotal: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.danger },
  list: { paddingHorizontal: 20, gap: 10 },
  depCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  depIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  depLibelle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  depMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  depCat: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dot: { color: Colors.textMuted, fontSize: 12 },
  depDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  depNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 3 },
  depMontant: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.danger, flexShrink: 0 },
  depMontantHint: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.accent, marginTop: 2 },
  badgeMensuelle: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: Colors.accent + "20" },
  badgeMensuelleText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.accent },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, textAlign: "center" },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
