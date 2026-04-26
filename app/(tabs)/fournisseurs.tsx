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
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";

interface Fournisseur {
  id: number;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  note?: string;
  createdAt: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const FIELD = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={fm.field}>
    <Text style={fm.label}>{label}</Text>
    {children}
  </View>
);

function FournisseurModal({
  visible,
  onClose,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  initial?: Fournisseur | null;
}) {
  const qc = useQueryClient();
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [telephone, setTelephone] = useState(initial?.telephone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [adresse, setAdresse] = useState(initial?.adresse ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (visible) {
      setNom(initial?.nom ?? "");
      setTelephone(initial?.telephone ?? "");
      setEmail(initial?.email ?? "");
      setAdresse(initial?.adresse ?? "");
      setNote(initial?.note ?? "");
      setError("");
    }
  }, [visible, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        nom: nom.trim(),
        telephone: telephone.trim() || undefined,
        email: email.trim() || undefined,
        adresse: adresse.trim() || undefined,
        note: note.trim() || undefined,
      };
      if (initial) {
        const res = await apiRequest("PUT", `/api/fournisseurs/${initial.id}`, body);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/fournisseurs", body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/fournisseurs"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const handleSave = () => {
    if (!nom.trim()) { setError("Le nom est obligatoire"); return; }
    setError("");
    mutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={fm.container}>
        <View style={fm.handle} />
        <View style={fm.header}>
          <Text style={fm.title}>{initial ? "Modifier le fournisseur" : "Nouveau fournisseur"}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={fm.body}>
            {error ? <View style={fm.errorBox}><Text style={fm.errorText}>{error}</Text></View> : null}

            <FIELD label="Nom du fournisseur *">
              <TextInput
                style={fm.input}
                placeholder="Ex: BB Lomé, Brasseries du Togo..."
                placeholderTextColor={Colors.textMuted}
                value={nom}
                onChangeText={setNom}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </FIELD>

            <FIELD label="Téléphone">
              <View style={fm.iconInput}>
                <Ionicons name="call-outline" size={16} color={Colors.textMuted} style={{ marginLeft: 14 }} />
                <TextInput
                  style={fm.iconInputField}
                  placeholder="+228 90 00 00 00"
                  placeholderTextColor={Colors.textMuted}
                  value={telephone}
                  onChangeText={setTelephone}
                  keyboardType="phone-pad"
                />
              </View>
            </FIELD>

            <FIELD label="E-mail">
              <View style={fm.iconInput}>
                <Ionicons name="mail-outline" size={16} color={Colors.textMuted} style={{ marginLeft: 14 }} />
                <TextInput
                  style={fm.iconInputField}
                  placeholder="contact@fournisseur.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </FIELD>

            <FIELD label="Adresse / Localisation">
              <View style={fm.iconInput}>
                <Ionicons name="location-outline" size={16} color={Colors.textMuted} style={{ marginLeft: 14 }} />
                <TextInput
                  style={fm.iconInputField}
                  placeholder="Lomé, Quartier Bè..."
                  placeholderTextColor={Colors.textMuted}
                  value={adresse}
                  onChangeText={setAdresse}
                />
              </View>
            </FIELD>

            <FIELD label="Note interne">
              <TextInput
                style={[fm.input, { minHeight: 70, textAlignVertical: "top" }]}
                placeholder="Conditions, horaires, contact privilégié..."
                placeholderTextColor={Colors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </FIELD>
          </View>
        </ScrollView>

        <View style={fm.footer}>
          <Pressable
            style={({ pressed }) => [fm.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={initial ? "checkmark-circle" : "add-circle"} size={20} color="#fff" />
                <Text style={fm.saveBtnText}>{initial ? "Enregistrer" : "Ajouter le fournisseur"}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function FournisseurCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Fournisseur;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={fc.card}>
      <View style={fc.avatar}>
        <Text style={fc.avatarText}>{item.nom.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={fc.nom} numberOfLines={1}>{item.nom}</Text>
        {item.telephone ? (
          <Pressable
            style={fc.contactRow}
            onPress={() => Linking.openURL(`tel:${item.telephone}`)}
          >
            <Ionicons name="call-outline" size={12} color={Colors.primary} />
            <Text style={fc.contactText}>{item.telephone}</Text>
          </Pressable>
        ) : null}
        {item.email ? (
          <Pressable
            style={fc.contactRow}
            onPress={() => Linking.openURL(`mailto:${item.email}`)}
          >
            <Ionicons name="mail-outline" size={12} color={Colors.primary} />
            <Text style={fc.contactText} numberOfLines={1}>{item.email}</Text>
          </Pressable>
        ) : null}
        {item.adresse ? (
          <View style={fc.contactRow}>
            <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
            <Text style={fc.adresseText} numberOfLines={1}>{item.adresse}</Text>
          </View>
        ) : null}
        {item.note ? (
          <Text style={fc.noteText} numberOfLines={2}>{item.note}</Text>
        ) : null}
        <Text style={fc.dateText}>Ajouté le {formatDate(item.createdAt)}</Text>
      </View>
      <View style={fc.actions}>
        <Pressable style={fc.actionBtn} onPress={onEdit} hitSlop={8}>
          <Ionicons name="create-outline" size={18} color={Colors.primary} />
        </Pressable>
        <Pressable style={[fc.actionBtn, { marginTop: 4 }]} onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

export default function FournisseursScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Fournisseur | null>(null);
  const [search, setSearch] = useState("");

  const topInset = isLiquidGlassAvailable() ? Math.max(insets.top, 67) : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: fournisseurs = [], isLoading } = useQuery<Fournisseur[]>({
    queryKey: ["/api/fournisseurs"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/fournisseurs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/fournisseurs"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => showAlert("Erreur", e.message),
  });

  const confirmDelete = (f: Fournisseur) => {
    showAlert(
      "Supprimer le fournisseur",
      `Voulez-vous supprimer "${f.nom}" ? Les achats existants ne seront pas supprimés.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => deleteMutation.mutate(f.id) },
      ]
    );
  };

  const filtered = fournisseurs.filter((f) => {
    const q = search.toLowerCase();
    return (
      !q ||
      f.nom.toLowerCase().includes(q) ||
      f.telephone?.includes(q) ||
      f.adresse?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <View>
          <Text style={styles.title}>Fournisseurs</Text>
          <Text style={styles.subtitle}>{fournisseurs.length} fournisseur(s)</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => { setEditing(null); setModalVisible(true); }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un fournisseur..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="business-outline" size={52} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {search ? "Aucun résultat" : "Aucun fournisseur"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {search ? "Essayez un autre terme" : "Ajoutez vos fournisseurs pour les retrouver rapidement dans vos achats"}
          </Text>
          {!search && (
            <Pressable
              style={styles.emptyBtn}
              onPress={() => { setEditing(null); setModalVisible(true); }}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.emptyBtnText}>Ajouter un fournisseur</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 100, gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <FournisseurCard
              item={item}
              onEdit={() => { setEditing(item); setModalVisible(true); }}
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}

      <FournisseurModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initial={editing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.background },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  addBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center", shadowColor: Colors.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, gap: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, padding: 0 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.primary + "15", borderWidth: 1.5, borderColor: Colors.primary + "30" },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
});

const fm = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginTop: 8, marginBottom: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  body: { padding: 20, gap: 4 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  iconInput: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border },
  iconInputField: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text },
  errorBox: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: Colors.danger, fontSize: 13, fontFamily: "Inter_400Regular" },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});

const fc = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: Colors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.accent + "20", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.accent + "40" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.accent },
  nom: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.primary },
  adresseText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  noteText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, fontStyle: "italic", marginTop: 2 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 4 },
  actions: { alignItems: "center" },
  actionBtn: { padding: 6 },
});
