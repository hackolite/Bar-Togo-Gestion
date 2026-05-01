import { showAlert } from "@/lib/alert";
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
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";

interface Produit {
  id: number;
  nom: string;
  description?: string;
  emoji?: string;
  image?: string;
  ean?: string;
  categorie: string;
  prixAchat: string;
  prixVente: string;
  stock: number;
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
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [ean, setEan] = useState(initial?.ean ?? "");
  const [imageUri, setImageUri] = useState<string | null>(initial?.image ?? null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [uploading, setUploading] = useState(false);
  const [categorie, setCategorie] = useState(initial?.categorie ?? "Boissons");
  const [prixAchat, setPrixAchat] = useState(initial?.prixAchat?.toString() ?? "");
  const [prixVente, setPrixVente] = useState(initial?.prixVente?.toString() ?? "");
  const [stock, setStock] = useState(initial?.stock?.toString() ?? "0");
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (visible) {
      setNom(initial?.nom ?? "");
      setDescription(initial?.description ?? "");
      setEmoji(initial?.emoji ?? "");
      setEan(initial?.ean ?? "");
      setImageUri(initial?.image ? getImageUrl(initial.image) : null);
      setImageBase64(null);
      setImageMime("image/jpeg");
      setCategorie(initial?.categorie ?? "Boissons");
      setPrixAchat(initial?.prixAchat?.toString() ?? "");
      setPrixVente(initial?.prixVente?.toString() ?? "");
      setStock(initial?.stock?.toString() ?? "0");
      setError("");
    }
  }, [visible, initial]);

  const pickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          showAlert("Permission refusée", "L'accès à la galerie est nécessaire pour ajouter une photo.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64 ?? null);
        const mime = asset.mimeType ?? "image/jpeg";
        setImageMime(mime);
      }
    } catch (e: any) {
      showAlert("Erreur", "Impossible de sélectionner l'image");
    }
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          showAlert("Permission refusée", "L'accès à la caméra est nécessaire.");
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64 ?? null);
        setImageMime(asset.mimeType ?? "image/jpeg");
      }
    } catch (e: any) {
      showAlert("Erreur", "Impossible de prendre la photo");
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === "web") {
      pickImage();
      return;
    }
    showAlert("Photo du produit", "Choisissez une source", [
      { text: "Galerie", onPress: pickImage },
      { text: "Appareil photo", onPress: takePhoto },
      { text: "Supprimer la photo", style: "destructive", onPress: () => { setImageUri(null); setImageBase64(null); } },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | undefined = initial?.image ?? undefined;

      if (imageBase64) {
        setUploading(true);
        try {
          const uploadRes = await apiRequest("POST", "/api/upload", {
            base64: imageBase64,
            mimeType: imageMime,
          });
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } finally {
          setUploading(false);
        }
      } else if (!imageUri && initial?.image) {
        imageUrl = undefined;
      }

      const defaultEmoji = CAT_EMOJIS[categorie] ?? "📦";
      const body = {
        nom,
        description: description || undefined,
        emoji: emoji || defaultEmoji,
        image: imageUrl,
        ean: ean.trim() || undefined,
        categorie,
        prixAchat: prixAchat || "0",
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
    onError: (e: any) => {
      setUploading(false);
      setError(e.message);
    },
  });

  const handleSave = () => {
    if (!nom || !prixVente) {
      setError("Nom et prix de vente sont obligatoires");
      return;
    }
    if (isNaN(Number(prixVente))) {
      setError("Le prix doit être un nombre valide");
      return;
    }
    setError("");
    mutation.mutate();
  };

  const isLoading = mutation.isPending || uploading;

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

            {/* ── PHOTO ── */}
            <View style={ms.photoSection}>
              <Pressable style={ms.photoBox} onPress={showImageOptions}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={ms.photoPreview} />
                ) : (
                  <View style={ms.photoPlaceholder}>
                    <Text style={{ fontSize: 36 }}>{emoji || CAT_EMOJIS[categorie] || "📷"}</Text>
                    <View style={ms.photoAddBadge}>
                      <Ionicons name="camera" size={14} color="#fff" />
                    </View>
                  </View>
                )}
              </Pressable>
              <View style={ms.photoActions}>
                <Pressable style={ms.photoBtn} onPress={showImageOptions}>
                  <Ionicons name="image-outline" size={16} color={Colors.primary} />
                  <Text style={ms.photoBtnText}>{imageUri ? "Changer la photo" : "Ajouter une photo"}</Text>
                </Pressable>
                {imageUri && (
                  <Pressable style={[ms.photoBtn, { borderColor: Colors.danger + "60" }]}
                    onPress={() => { setImageUri(null); setImageBase64(null); }}>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    <Text style={[ms.photoBtnText, { color: Colors.danger }]}>Supprimer</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* ── EMOJI + NOM ── */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <MField label="Emoji" style={{ width: 80 }}>
                <TextInput
                  style={[ms.input, { textAlign: "center", fontSize: 22, paddingVertical: 10 }]}
                  placeholder={CAT_EMOJIS[categorie] ?? "📦"}
                  placeholderTextColor={Colors.textMuted}
                  value={emoji}
                  onChangeText={setEmoji}
                  maxLength={2}
                />
              </MField>
              <MField label="Nom du produit *" style={{ flex: 1 }}>
                <TextInput style={ms.input} placeholder="Ex: Bière Flag 65cl" placeholderTextColor={Colors.textMuted} value={nom} onChangeText={setNom} />
              </MField>
            </View>

            {/* ── EAN (CODE-BARRE) ── */}
            <MField label="Code EAN / Code-barres (optionnel)">
              <View style={ms.eanRow}>
                <Ionicons name="barcode-outline" size={18} color={Colors.textMuted} style={{ marginLeft: 12 }} />
                <TextInput
                  style={ms.eanInput}
                  placeholder="Ex: 5449000000996"
                  placeholderTextColor={Colors.textMuted}
                  value={ean}
                  onChangeText={setEan}
                  keyboardType="number-pad"
                  maxLength={14}
                />
                {ean ? (
                  <Pressable onPress={() => setEan("")} hitSlop={8} style={{ marginRight: 12 }}>
                    <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            </MField>

            {/* ── CATÉGORIE ── */}
            <MField label="Catégorie">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                  {CATEGORIES.map((c) => (
                    <Pressable key={c} style={[ms.chip, categorie === c && ms.chipActive]} onPress={() => setCategorie(c)}>
                      <Text style={ms.chipEmoji}>{CAT_EMOJIS[c]}</Text>
                      <Text style={[ms.chipText, categorie === c && ms.chipTextActive]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </MField>

            {/* ── PRIX ── */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <MField label="Prix achat (FCFA)" style={{ flex: 1 }}>
                <TextInput style={ms.input} placeholder="0" placeholderTextColor={Colors.textMuted} value={prixAchat} onChangeText={setPrixAchat} keyboardType="numeric" />
              </MField>
              <MField label="Prix vente (FCFA) *" style={{ flex: 1 }}>
                <TextInput style={ms.input} placeholder="800" placeholderTextColor={Colors.textMuted} value={prixVente} onChangeText={setPrixVente} keyboardType="numeric" />
              </MField>
            </View>

            {prixAchat && prixVente && Number(prixAchat) >= 0 && Number(prixVente) > 0 ? (
              (() => {
                const marge = Number(prixVente) - Number(prixAchat);
                const margeColor = marge > 0 ? Colors.success : Colors.danger;
                const margePct = Number(prixAchat) > 0 ? ((marge / Number(prixAchat)) * 100).toFixed(0) + "%" : "—";
                return (
                  <View style={ms.margePreview}>
                    <Ionicons name="trending-up-outline" size={15} color={margeColor} />
                    <Text style={ms.margeLabel}>Marge :</Text>
                    <Text style={[ms.margeValue, { color: margeColor }]}>{formatFCFA(marge)}</Text>
                    <Text style={[ms.margeLabel, { marginLeft: 4 }]}>({margePct})</Text>
                  </View>
                );
              })()
            ) : null}

            <MField label="Stock initial">
              <TextInput style={ms.input} placeholder="0" placeholderTextColor={Colors.textMuted} value={stock} onChangeText={setStock} keyboardType="numeric" />
            </MField>

            <MField label="Description (optionnel)">
              <TextInput style={[ms.input, { height: 64, textAlignVertical: "top" }]} placeholder="Notes, références fournisseur..." placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} multiline />
            </MField>
          </View>
        </ScrollView>
        <View style={ms.footer}>
          <Pressable style={({ pressed }) => [ms.saveBtn, { opacity: pressed ? 0.85 : 1 }]} onPress={handleSave} disabled={isLoading}>
            {isLoading ? (
              <><ActivityIndicator color="#fff" /><Text style={ms.saveBtnText}>{uploading ? "Upload photo..." : "Enregistrement..."}</Text></>
            ) : (
              <Text style={ms.saveBtnText}>{initial ? "Enregistrer" : "Ajouter le produit"}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}


function MField({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[ms.field, style]}>
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
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  chipTextActive: { color: "#fff" },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  // Photo
  photoSection: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20, backgroundColor: Colors.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  photoBox: { width: 80, height: 80, borderRadius: 16, overflow: "hidden", position: "relative" },
  photoPreview: { width: 80, height: 80, borderRadius: 16 },
  photoPlaceholder: { width: 80, height: 80, borderRadius: 16, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.border, borderStyle: "dashed" },
  photoAddBadge: { position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  photoActions: { flex: 1, gap: 8 },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.primary + "50", backgroundColor: Colors.primary + "08" },
  photoBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  margePreview: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  margeLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  margeValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  eanRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, gap: 8 },
  eanInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, paddingVertical: 12, paddingHorizontal: 4 },
});


const CSV_FORMAT_EXEMPLE = `nom,categorie,ean,prixAchat,prixVente,stock
Coca-Cola 33cl,Boissons,5449000000996,250,400,24
Flag Spéciale 65cl,Alcools,6161001007001,500,800,48
Mojito,Cocktails,,500,2000,0
Brochettes bœuf,Nourriture,,800,2000,0`;

// ── MODAL: IMPORT CSV ──
function ImportCSVModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
      const res = await apiRequest("POST", "/api/produits/import-csv", { csvText, skipFirstLine });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/produits"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(data);
      setStep("done");
    },
    onError: (e: any) => showAlert("Erreur", e.message),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={ms.container}>
        <View style={ms.handle} />
        <View style={ms.header}>
          <Text style={ms.title}>Importer un catalogue CSV</Text>
          <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[ms.body, { gap: 16 }]}>
            {step === "edit" && (
              <>
                <View style={csv.formatBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                    <Text style={csv.formatTitle}>Format attendu :</Text>
                  </View>
                  <Text style={csv.formatCode}>nom,categorie,ean,prixAchat,prixVente,stock</Text>
                  <Text style={[csv.formatCode, { color: Colors.textMuted, marginTop: 4 }]}>
                    Catégories valides :{"\n"}Boissons | Alcools | Cocktails | Nourriture | Autres
                  </Text>
                  <Pressable
                    style={csv.exampleBtn}
                    onPress={() => setCsvText(CSV_FORMAT_EXEMPLE)}
                  >
                    <Ionicons name="flash-outline" size={14} color={Colors.primary} />
                    <Text style={csv.exampleBtnText}>Charger l'exemple</Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Pressable
                    style={[csv.toggle, skipFirstLine && csv.toggleActive]}
                    onPress={() => setSkipFirstLine(!skipFirstLine)}
                  >
                    <Ionicons name={skipFirstLine ? "checkbox" : "square-outline"} size={18} color={skipFirstLine ? Colors.primary : Colors.textMuted} />
                  </Pressable>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text }}>
                    La 1ère ligne est un en-tête (ignorer)
                  </Text>
                </View>

                <MField label="Collez votre CSV ici">
                  <TextInput
                    style={csv.textarea}
                    multiline
                    value={csvText}
                    onChangeText={setCsvText}
                    placeholder={CSV_FORMAT_EXEMPLE}
                    placeholderTextColor={Colors.textMuted}
                    textAlignVertical="top"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </MField>
              </>
            )}

            {step === "preview" && (
              <>
                <View style={csv.previewHeader}>
                  <Ionicons name="eye-outline" size={18} color={Colors.primary} />
                  <Text style={csv.previewTitle}>Aperçu ({preview.length} lignes{preview.length === 10 ? "+" : ""})</Text>
                </View>
                {preview.map((row, i) => (
                  <View key={i} style={csv.previewRow}>
                    <Text style={csv.previewNom} numberOfLines={1}>{row[0] || "—"}</Text>
                    <Text style={csv.previewCat}>{row[1] || "—"}</Text>
                    <Text style={csv.previewPrix}>{row[3] || "0"} / {row[4] || "0"} FCFA</Text>
                    {row[2] ? <Text style={csv.previewEan}>EAN: {row[2]}</Text> : null}
                  </View>
                ))}
                <Pressable style={csv.backBtn} onPress={() => setStep("edit")}>
                  <Ionicons name="arrow-back" size={16} color={Colors.textMuted} />
                  <Text style={csv.backBtnText}>Modifier</Text>
                </Pressable>
              </>
            )}

            {step === "done" && result && (
              <View style={csv.doneBox}>
                <Text style={{ fontSize: 48 }}>✅</Text>
                <Text style={csv.doneTitle}>{result.count} produit(s) importé(s)</Text>
                {result.errors.length > 0 && (
                  <View style={csv.errorsBox}>
                    <Text style={csv.errorsTitle}>{result.errors.length} erreur(s) :</Text>
                    {result.errors.map((e, i) => <Text key={i} style={csv.errorLine}>{e}</Text>)}
                  </View>
                )}
                <Pressable style={[ms.saveBtn, { marginTop: 12 }]} onPress={onClose}>
                  <Text style={ms.saveBtnText}>Fermer</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        {step !== "done" && (
          <View style={ms.footer}>
            {step === "edit" ? (
              <Pressable
                style={({ pressed }) => [ms.saveBtn, { opacity: pressed || !csvText.trim() ? 0.6 : 1 }]}
                onPress={parsePreview}
                disabled={!csvText.trim()}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" />
                <Text style={ms.saveBtnText}>Prévisualiser</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [ms.saveBtn, { opacity: pressed ? 0.85 : 1, backgroundColor: "#52B788" }]}
                onPress={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <><ActivityIndicator color="#fff" /><Text style={ms.saveBtnText}>Importation...</Text></>
                ) : (
                  <><Ionicons name="cloud-upload-outline" size={18} color="#fff" /><Text style={ms.saveBtnText}>Importer {preview.length} produit(s)</Text></>
                )}
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const csv = StyleSheet.create({
  formatBox: { backgroundColor: Colors.primary + "0D", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.primary + "25" },
  formatTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  formatCode: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.text, fontVariant: ["tabular-nums"] },
  exampleBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.primary + "15" },
  exampleBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  toggle: { padding: 2 },
  toggleActive: {},
  textarea: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, padding: 14, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text, minHeight: 180, maxHeight: 260 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  previewRow: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 3 },
  previewNom: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  previewCat: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  previewPrix: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  previewEan: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  backBtnText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  doneBox: { alignItems: "center", paddingVertical: 20, gap: 12 },
  doneTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  errorsBox: { backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, width: "100%", gap: 4 },
  errorsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.danger },
  errorLine: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.danger },
});

// ── ÉCRAN INVENTAIRE ──
export default function InventaireScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [csvVisible, setCsvVisible] = useState(false);
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
      showAlert("Produits chargés ✓", `${data.count} produits typiques d'un bar-restaurant togolais ont été ajoutés.`);
    },
    onError: (e: any) => showAlert("Erreur", e.message),
  });

  const filtered = produits.filter((p) => {
    const q = search.toLowerCase();
    return !q ||
      p.nom.toLowerCase().includes(q) ||
      p.categorie.toLowerCase().includes(q) ||
      (p.ean && p.ean.includes(q));
  });

  const confirmDelete = (p: Produit) => {
    showAlert("Supprimer le produit", `Voulez-vous supprimer "${p.nom}" ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
    ]);
  };

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderItem = ({ item }: { item: Produit }) => {
    const marge = Number(item.prixVente) - Number(item.prixAchat);
    const margePercent = Number(item.prixAchat) > 0 ? ((marge / Number(item.prixAchat)) * 100).toFixed(0) : 0;
    const stockBas = item.stock < 10;
    const catColor = CAT_COLORS[item.categorie] ?? Colors.primary;
    const hasImage = !!item.image;

    return (
      <View style={styles.produitCard}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => { setEditing(item); setModalVisible(true); }}
          onLongPress={() => confirmDelete(item)}
        >
          <View style={styles.cardInner}>
            {/* ── IMAGE / EMOJI ── */}
            <View style={styles.mediaContainer}>
              {hasImage ? (
                <Image source={{ uri: getImageUrl(item.image!) }} style={styles.produitImage} resizeMode="cover" />
              ) : (
                <View style={[styles.emojiContainer, { backgroundColor: catColor + "18" }]}>
                  <Text style={styles.emojiLarge}>{item.emoji ?? CAT_EMOJIS[item.categorie] ?? "📦"}</Text>
                </View>
              )}
              {/* Stock badge sur l'image */}
              <View style={[styles.stockOverlay, { backgroundColor: stockBas ? Colors.danger : Colors.success }]}>
                <Text style={styles.stockOverlayText}>{item.stock}</Text>
              </View>
            </View>

            {/* ── INFO ── */}
            <View style={styles.infoContainer}>
              <View style={[styles.catBadge, { borderColor: catColor + "50", backgroundColor: catColor + "10" }]}>
                <Text style={[styles.catBadgeText, { color: catColor }]}>{item.categorie}</Text>
              </View>
              <Text style={styles.produitNom} numberOfLines={2}>{item.nom}</Text>
              <View style={styles.priceRow}>
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
            </View>
          </View>
        </Pressable>
        <Pressable
          onPress={() => confirmDelete(item)}
          hitSlop={8}
          style={{ padding: 8, alignSelf: "center" }}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInsets + 30 }]}>
        <View>
          <Text style={styles.title}>Catalogue</Text>
          <Text style={styles.subtitle}>{produits.length} produit(s) · référence</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={({ pressed }) => [styles.csvBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => setCsvVisible(true)}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => { setEditing(null); setModalVisible(true); }}
          >
            <Ionicons name="add" size={22} color="#fff" />
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
              <Text style={{ fontSize: 52 }}>📦</Text>
              <Text style={styles.emptyText}>{search ? "Aucun résultat" : "Aucun produit"}</Text>
              {!search && produits.length === 0 && (
                <>
                  <Text style={styles.emptySubText}>Ajoutez vos produits manuellement ou chargez la liste par défaut</Text>
                  <Pressable
                    style={({ pressed }) => [styles.seedBtn, { opacity: pressed ? 0.85 : 1 }]}
                    onPress={() => showAlert(
                      "Charger les produits par défaut",
                      "Cela va ajouter ~100 produits typiques d'un bar-restaurant togolais (bières, softs, cocktails, nourriture…).",
                      [
                        { text: "Annuler", style: "cancel" },
                        { text: "Charger", onPress: () => seedMutation.mutate() },
                      ]
                    )}
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
                </>
              )}
            </View>
          }
        />
      )}

      <ProduitModal visible={modalVisible} onClose={() => setModalVisible(false)} initial={editing} />
      <ImportCSVModal visible={csvVisible} onClose={() => setCsvVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.background },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  csvBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.primary + "15", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: Colors.primary + "40" },
  addBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, gap: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, padding: 0 },
  list: { paddingHorizontal: 16, gap: 12 },
  // ── CARD ──
  produitCard: { backgroundColor: Colors.surface, borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  cardInner: { flexDirection: "row", gap: 0 },
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
  priceAchat: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  priceVente: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  marge: { fontSize: 11, fontFamily: "Inter_700Bold" },
  reapproBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.primary + "06" },
  reapproBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 20 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  seedBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4, marginTop: 8 },
  seedBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
