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

const CATEGORIES = ["Boissons", "Nourriture", "Alcools", "Cocktails", "Snacks", "Autres"];

function formatFCFA(v: string | number) {
  return new Intl.NumberFormat("fr-FR").format(Number(v)) + " FCFA";
}

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
      const body = {
        nom,
        description: description || undefined,
        categorie,
        prixAchat,
        prixVente,
        stock: parseInt(stock) || 0,
      };
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
      setError("Les prix doivent être des nombres");
      return;
    }
    setError("");
    mutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.handle} />
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>
            {initial ? "Modifier le produit" : "Nouveau produit"}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={modalStyles.body}>
            {error ? (
              <View style={modalStyles.errorBox}>
                <Text style={modalStyles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Field label="Nom du produit *">
              <TextInput
                style={modalStyles.input}
                placeholder="Ex: Bière Flag"
                placeholderTextColor={Colors.textMuted}
                value={nom}
                onChangeText={setNom}
              />
            </Field>

            <Field label="Catégorie">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {CATEGORIES.map((c) => (
                    <Pressable
                      key={c}
                      style={[modalStyles.catChip, categorie === c && modalStyles.catChipActive]}
                      onPress={() => setCategorie(c)}
                    >
                      <Text style={[modalStyles.catChipText, categorie === c && modalStyles.catChipTextActive]}>
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </Field>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Prix d'achat (FCFA) *">
                  <TextInput
                    style={modalStyles.input}
                    placeholder="500"
                    placeholderTextColor={Colors.textMuted}
                    value={prixAchat}
                    onChangeText={setPrixAchat}
                    keyboardType="numeric"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Prix de vente (FCFA) *">
                  <TextInput
                    style={modalStyles.input}
                    placeholder="700"
                    placeholderTextColor={Colors.textMuted}
                    value={prixVente}
                    onChangeText={setPrixVente}
                    keyboardType="numeric"
                  />
                </Field>
              </View>
            </View>

            <Field label="Stock initial">
              <TextInput
                style={modalStyles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={stock}
                onChangeText={setStock}
                keyboardType="numeric"
              />
            </Field>

            <Field label="Description (optionnel)">
              <TextInput
                style={[modalStyles.input, { height: 70, textAlignVertical: "top" }]}
                placeholder="Notes sur le produit..."
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </Field>
          </View>
        </ScrollView>

        <View style={modalStyles.footer}>
          <Pressable
            style={({ pressed }) => [modalStyles.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={modalStyles.saveBtnText}>
                {initial ? "Enregistrer" : "Ajouter le produit"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={modalStyles.field}>
      <Text style={modalStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  body: { padding: 20, gap: 4 },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  catChipTextActive: {
    color: "#fff",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});

export default function InventaireScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Produit | null>(null);
  const [search, setSearch] = useState("");

  const { data: produits = [], isLoading } = useQuery<Produit[]>({
    queryKey: ["/api/produits"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/produits");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/produits/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const filtered = produits.filter((p) =>
    p.nom.toLowerCase().includes(search.toLowerCase()) ||
    p.categorie.toLowerCase().includes(search.toLowerCase())
  );

  const confirmDelete = (p: Produit) => {
    Alert.alert(
      "Supprimer le produit",
      `Voulez-vous supprimer "${p.nom}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
      ]
    );
  };

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderItem = ({ item }: { item: Produit }) => {
    const marge = Number(item.prixVente) - Number(item.prixAchat);
    const margePercent = Number(item.prixAchat) > 0 ? ((marge / Number(item.prixAchat)) * 100).toFixed(0) : 0;
    return (
      <Pressable
        style={({ pressed }) => [styles.produitCard, { opacity: pressed ? 0.95 : 1 }]}
        onPress={() => { setEditing(item); setModalVisible(true); }}
        onLongPress={() => confirmDelete(item)}
      >
        <View style={styles.produitLeft}>
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeText}>{item.categorie}</Text>
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
              <Text style={[styles.marge, { color: marge >= 0 ? Colors.success : Colors.danger }]}>
                +{margePercent}%
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.stockBadge}>
          <Text style={styles.stockNum}>{item.stock}</Text>
          <Text style={styles.stockLabel}>stock</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInsets + 16 }]}>
        <Text style={styles.title}>Inventaire</Text>
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
              <Ionicons name="cube-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>
                {search ? "Aucun résultat" : "Aucun produit"}
              </Text>
              <Text style={styles.emptySubText}>
                {search ? "Essayez un autre terme" : "Appuyez sur + pour ajouter"}
              </Text>
            </View>
          }
        />
      )}

      <ProduitModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initial={editing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    padding: 0,
  },
  list: { paddingHorizontal: 20, gap: 10 },
  produitCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  produitLeft: { flex: 1, gap: 6 },
  catBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  produitNom: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  priceDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  priceLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginBottom: 2,
  },
  priceAchat: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  priceVente: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  marge: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  stockBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stockNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  stockLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  emptySubText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
});
