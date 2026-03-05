import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";

function formatFCFA(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
}

interface DashStats {
  ventesAujourdhui: number;
  depensesAujourdhui: number;
  beneficeAujourdhui: number;
  totalVentesHier: number;
  totalDepensesHier: number;
  topProduits: { nom: string; quantite: number; total: number }[];
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  sub,
  valueColor,
}: {
  icon: any;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
      {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  value: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flexShrink: 1,
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
});

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: stats, isLoading, refetch } = useQuery<DashStats>({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard");
      return res.json();
    },
  });

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInsets + 16, paddingBottom: Platform.OS === "web" ? 118 : 100 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />
      }
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.name}>{user?.nom} </Text>
        </View>
        <Pressable onPress={logout} hitSlop={10} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Aujourd'hui</Text>
          <View style={styles.statsRow}>
            <StatCard
              icon="trending-up"
              iconBg={Colors.success}
              label="Ventes"
              value={formatFCFA(stats?.ventesAujourdhui ?? 0)}
              sub={`Hier: ${formatFCFA(stats?.totalVentesHier ?? 0)}`}
            />
            <StatCard
              icon="trending-down"
              iconBg={Colors.danger}
              label="Dépenses"
              value={formatFCFA(stats?.depensesAujourdhui ?? 0)}
              sub={`Hier: ${formatFCFA(stats?.totalDepensesHier ?? 0)}`}
            />
          </View>

          <View style={styles.beneficeCard}>
            <View style={styles.beneficeLeft}>
              <View style={[styles.beneficeIcon, { backgroundColor: stats?.beneficeAujourdhui != null && stats.beneficeAujourdhui >= 0 ? Colors.primary : Colors.danger }]}>
                <Ionicons
                  name={stats?.beneficeAujourdhui != null && stats.beneficeAujourdhui >= 0 ? "arrow-up" : "arrow-down"}
                  size={22}
                  color="#fff"
                />
              </View>
              <View>
                <Text style={styles.beneficeLabel}>Bénéfice net</Text>
                <Text style={styles.beneficeSub}>Ventes - Dépenses</Text>
              </View>
            </View>
            <Text
              style={[
                styles.beneficeValue,
                {
                  color:
                    stats?.beneficeAujourdhui != null && stats.beneficeAujourdhui >= 0
                      ? Colors.primary
                      : Colors.danger,
                },
              ]}
            >
              {formatFCFA(stats?.beneficeAujourdhui ?? 0)}
            </Text>
          </View>

          {stats?.topProduits && stats.topProduits.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Top produits du jour</Text>
              <View style={styles.topProduitsCard}>
                {stats.topProduits.map((p, i) => (
                  <View key={i} style={[styles.topItem, i < stats.topProduits.length - 1 && styles.topItemBorder]}>
                    <View style={styles.topRank}>
                      <Text style={styles.topRankText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.topNom} numberOfLines={1}>{p.nom}</Text>
                    <View style={styles.topRight}>
                      <Text style={styles.topQte}>{p.quantite} vendus</Text>
                      <Text style={styles.topTotal}>{formatFCFA(p.total)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {(!stats?.topProduits || stats.topProduits.length === 0) && (
            <View style={styles.emptyBox}>
              <Ionicons name="storefront-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>Aucune vente aujourd'hui</Text>
              <Text style={styles.emptySubText}>Commencez à enregistrer vos ventes</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginTop: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  dateText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textTransform: "capitalize",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  beneficeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  beneficeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  beneficeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  beneficeLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  beneficeSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  beneficeValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  topProduitsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  topItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  topItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  topRankText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  topNom: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  topRight: { alignItems: "flex-end" },
  topQte: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  topTotal: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 2,
  },
  loadingBox: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 48,
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
