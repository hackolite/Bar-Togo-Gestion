import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/auth";
import Colors from "@/constants/colors";

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!nom || !email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, nom.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || "Inscription échouée");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── BANNIÈRE AFRICAINE ── */}
        <View style={[styles.heroBanner, { paddingTop: insets.top + 28 }]}>
          <View style={styles.geoDeco1} />
          <View style={styles.geoDeco2} />

          <View style={styles.logoCircle}>
            <Ionicons name="person-add" size={38} color="#fff" />
          </View>
          <Text style={styles.appName}>MaquisGest Togo</Text>
          <Text style={styles.heroSubtitle}>Créer votre compte</Text>
        </View>

        {/* ── FORMULAIRE ── */}
        <View style={styles.formSheet}>
          <Text style={styles.cardTitle}>Inscription</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Nom du responsable</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={Colors.primary} />
              <TextInput
                style={styles.input}
                placeholder="Votre nom complet"
                placeholderTextColor={Colors.textMuted}
                value={nom}
                onChangeText={setNom}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Adresse email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={Colors.primary} />
              <TextInput
                style={styles.input}
                placeholder="exemple@email.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Minimum 6 caractères"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <Pressable onPress={() => setShowPass(!showPass)} hitSlop={10}>
                <Ionicons
                  name={showPass ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Créer mon compte</Text>
              </>
            )}
          </Pressable>

          <View style={styles.accentDivider}>
            <View style={styles.accentLine} />
            <View style={[styles.accentDot, { backgroundColor: Colors.primary }]} />
            <View style={[styles.accentDot, { backgroundColor: Colors.accent }]} />
            <View style={styles.accentLine} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.link}>Se connecter</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {},

  heroBanner: {
    backgroundColor: Colors.primary,
    alignItems: "center",
    paddingBottom: 36,
    overflow: "hidden",
    position: "relative",
  },
  geoDeco1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accent,
    opacity: 0.2,
  },
  geoDeco2: {
    position: "absolute",
    bottom: 16,
    left: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.accent,
    opacity: 0.2,
  },
  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 2.5,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    marginTop: 6,
  },

  formSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    padding: 28,
    paddingTop: 32,
    flex: 1,
    minHeight: 400,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 24,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFEBEE",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  field: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    padding: 0,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },

  accentDivider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginVertical: 22,
  },
  accentLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { color: Colors.textMuted, fontSize: 14, fontFamily: "Inter_400Regular" },
  link: { color: Colors.primary, fontSize: 14, fontFamily: "Inter_700Bold" },
});
