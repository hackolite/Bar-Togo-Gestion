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
  date: string;
  note?: string;
}

const CATEGORIES_DEPENSE = [
  "Approvisionnement",
  "Salaires",
  "Loyer",
  "Electricité",
  "Eau",
  "Transport",
  "Entretien",
  "Général",
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

const CAT_ICONS: Record<string, string> = {
  Approvisionnement: "cube",
  Salaires: "people",
  Loyer: "home",
  Electricité: "flash",
  Eau: "water",
  Transport: "car",
  Entretien: "construct",
  Général: "ellipsis-horizontal-circle",
};

const CAT_COLORS: Record<string, string> = {
  Approvisionnement: Colors.primary,
  Salaires: "#8B5CF6",
  Loyer: "#F97316",
  Electricité: Colors.accent,
  Eau: Colors.info,
  Transport: "#6B7280",
  Entretien: "#0F766E",
  Général: "#9CA3AF",
};

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
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (visible) {
      setLibelle(initial?.libelle ?? "");
      setMontant(initial?.montant?.toString() ?? "");
      setCategorie(initial?.categorie ?? "Général");
      setNote(initial?.note ?? "");
      setError("");
    }
  }, [visible, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body = { libelle, montant, categorie, note: note || undefined, date: new Date().toISOString() };
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const handleSave = () => {
    if (!libelle || !montant) {
      setError("Libellé et montant sont obligatoires");
      return;
    }
    if (isNaN(Number(montant)) || Number(montant) <= 0) {
      setError("Le montant doit être un nombre positif");
      return;
    }
    setError("");
    mutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={dm.container}>
        <View style={dm.handle} />
        <View style={dm.header}>
          <Text style={dm.title}>{initial ? "Modifier la dépense" : "Nouvelle dépense"}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={dm.body}>
            {error ? (
              <View style={dm.errorBox}>
                <Text style={dm.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={dm.field}>
              <Text style={dm.label}>Libellé *</Text>
              <TextInput
                style={dm.input}
                placeholder="Ex: Achat de boissons"
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
              <Text style={dm.label}>Catégorie</Text>
              <View style={dm.catGrid}>
                {CATEGORIES_DEPENSE.map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      dm.catItem,
                      categorie === c && { borderColor: CAT_COLORS[c] ?? Colors.primary, backgroundColor: (CAT_COLORS[c] ?? Colors.primary) + "15" },
                    ]}
                    onPress={() => setCategorie(c)}
                  >
                    <Ionicons
                      name={(CAT_ICONS[c] ?? "ellipsis-horizontal-circle") as any}
                      size={18}
                      color={categorie === c ? (CAT_COLORS[c] ?? Colors.primary) : Colors.textMuted}
                    />
                    <Text style={[dm.catItemText, categorie === c && { color: CAT_COLORS[c] ?? Colors.primary }]}>
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
          <Pressable
            style={({ pressed }) => [dm.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={dm.saveBtnText}>{initial ? "Enregistrer" : "Ajouter la dépense"}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
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
    backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorText: { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular" },
  body: { padding: 20, gap: 4 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catItem: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  catItemText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: {
    backgroundColor: Colors.danger, borderRadius: 14, paddingVertical: 16,
    alignItems: "center",
    shadowColor: Colors.danger, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});

export default function DepensesScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Depense | null>(null);

  const { data: depenses = [], isLoading } = useQuery<Depense[]>({
    queryKey: ["/api/depenses"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/depenses");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/depenses/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/depenses"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const confirmDelete = (d: Depense) => {
    Alert.alert(
      "Supprimer la dépense",
      `Voulez-vous supprimer "${d.libelle}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => deleteMutation.mutate(d.id) },
      ]
    );
  };

  const totalJour = depenses
    .filter((d) => {
      const date = new Date(d.date);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    })
    .reduce((s, d) => s + Number(d.montant), 0);

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderItem = ({ item }: { item: Depense }) => {
    const color = CAT_COLORS[item.categorie] ?? Colors.textMuted;
    const icon = (CAT_ICONS[item.categorie] ?? "ellipsis-horizontal-circle") as any;
    return (
      <Pressable
        style={({ pressed }) => [ds.depCard, { opacity: pressed ? 0.95 : 1 }]}
        onPress={() => { setEditing(item); setModalVisible(true); }}
        onLongPress={() => confirmDelete(item)}
      >
        <View style={[ds.depIcon, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ds.depLibelle}>{item.libelle}</Text>
          <View style={ds.depMeta}>
            <Text style={[ds.depCat, { color }]}>{item.categorie}</Text>
            <Text style={ds.depDate}>{formatDate(item.date)}</Text>
          </View>
          {item.note ? <Text style={ds.depNote}>{item.note}</Text> : null}
        </View>
        <Text style={ds.depMontant}>{formatFCFA(item.montant)}</Text>
      </Pressable>
    );
  };

  return (
    <View style={ds.container}>
      <View style={[ds.header, { paddingTop: topInsets + 16 }]}>
        <View>
          <Text style={ds.title}>Dépenses</Text>
          <Text style={ds.subtitle}>Aujourd'hui: {formatFCFA(totalJour)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [ds.addBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => { setEditing(null); setModalVisible(true); }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={ds.loadingBox}>
          <ActivityIndicator color={Colors.danger} size="large" />
        </View>
      ) : (
        <FlatList
          data={depenses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[
            ds.list,
            { paddingBottom: Platform.OS === "web" ? 118 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={ds.emptyBox}>
              <Ionicons name="card-outline" size={48} color={Colors.border} />
              <Text style={ds.emptyText}>Aucune dépense</Text>
              <Text style={ds.emptySubText}>Appuyez sur + pour ajouter</Text>
            </View>
          }
        />
      )}

      <DepenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initial={editing}
      />
    </View>
  );
}

const ds = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.background,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.danger,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.danger, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  list: { paddingHorizontal: 20, gap: 10 },
  depCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  depIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  depLibelle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  depMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  depCat: { fontSize: 12, fontFamily: "Inter_500Medium" },
  depDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  depNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 3 },
  depMontant: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.danger, flexShrink: 0 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
