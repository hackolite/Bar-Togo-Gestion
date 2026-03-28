import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect, G, Text as SvgText, Line, Circle } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";

function formatFCFA(amount: number) {
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace(".", ",") + " M FCFA";
  if (amount >= 1_000) return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
  return Math.round(amount) + " FCFA";
}

function formatFCFAFull(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
}

function pct(a: number, b: number): number {
  if (b === 0) return a > 0 ? 100 : 0;
  return Math.round(((a - b) / b) * 100);
}

interface DashStats {
  ventesAujourdhui: number;
  achatsAujourdhui: number;
  depensesAujourdhui: number;
  coutsVentesAujourdhui: number;
  beneficeNetAujourdhui: number;
  totalVentesHier: number;
  totalAchatsHier: number;
  totalDepensesHier: number;
  topProduits: { nom: string; quantite: number; total: number; benefice: number }[];
  previsionnel: {
    totalDepensesFixesMois: number;
    provisionnementJournalier: number;
    daysLeft: number;
    daysInMonth: number;
    dayOfMonth: number;
  };
  alertesStock: { id: number; nom: string; stock: number; categorie: string }[];
}

interface BeneficePoint {
  label: string;
  ventes: number;
  achats: number;
  cogs: number;
  depenses: number;
  benefice: number;
}

interface BeneficeEvolution {
  derniers7jours: BeneficePoint[];
  derniers12mois: BeneficePoint[];
}

// ── COMPOSANT : GRAPHIQUE BARRES BÉNÉFICE ──
function fmtShort(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (abs >= 1_000) return Math.round(v / 1_000) + "k";
  return Math.round(v).toString();
}

function BeneficeBarChart({ data }: { data: BeneficePoint[] }) {
  const BAR_W = 34;
  const BAR_GAP = 8;
  const PAD_LEFT = 4;
  const TOP_PAD = 20;
  const BAR_AREA_H = 110;
  const BOTTOM_PAD = 30;
  const SVG_H = TOP_PAD + BAR_AREA_H + BOTTOM_PAD;
  const chartW = data.length * (BAR_W + BAR_GAP) + PAD_LEFT;

  const maxBenef = Math.max(...data.map((d) => d.benefice), 0);
  const minBenef = Math.min(...data.map((d) => d.benefice), 0);
  const range = Math.max(maxBenef - minBenef, 1);
  const zeroY = TOP_PAD + (maxBenef / range) * BAR_AREA_H;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
      <Svg width={chartW} height={SVG_H}>
        {/* Zero line */}
        <Line
          x1={0} y1={zeroY} x2={chartW} y2={zeroY}
          stroke={Colors.border} strokeWidth={1.2}
          strokeDasharray="4 3"
        />
        {data.map((point, i) => {
          const isPositive = point.benefice >= 0;
          const color = isPositive ? Colors.success : Colors.danger;
          const x = PAD_LEFT + i * (BAR_W + BAR_GAP);
          const barH = Math.max(Math.abs(point.benefice) / range * BAR_AREA_H, 2);
          const barY = isPositive ? zeroY - barH : zeroY;
          const valueLabelY = isPositive
            ? Math.max(barY - 4, TOP_PAD - 2)
            : barY + barH + 10;

          return (
            <G key={i}>
              <Rect
                x={x} y={barY} width={BAR_W} height={barH}
                rx={5} fill={color} opacity={0.82}
              />
              <SvgText
                x={x + BAR_W / 2} y={valueLabelY}
                textAnchor="middle" fontSize={8}
                fill={color} fontFamily="Inter_600SemiBold"
              >
                {fmtShort(point.benefice)}
              </SvgText>
              <SvgText
                x={x + BAR_W / 2} y={TOP_PAD + BAR_AREA_H + BOTTOM_PAD - 8}
                textAnchor="middle" fontSize={9}
                fill={Colors.textMuted} fontFamily="Inter_500Medium"
              >
                {point.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}

// ── COMPOSANT : GRAPHIQUE BARRES HORIZONTAL ──
function ComparisonChart({
  labelA,
  valueA,
  labelB,
  valueB,
  colorA,
  colorB,
  width,
}: {
  labelA: string;
  valueA: number;
  labelB: string;
  valueB: number;
  colorA: string;
  colorB: string;
  width: number;
}) {
  const maxVal = Math.max(valueA, valueB, 1);
  const maxBarW = width - 100;
  const barH = 20;
  const gap = 16;
  const svgH = barH * 2 + gap + 24;
  const animA = useRef(new Animated.Value(0)).current;
  const animB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animA, { toValue: 1, duration: 700, useNativeDriver: false, delay: 100 }),
      Animated.timing(animB, { toValue: 1, duration: 700, useNativeDriver: false, delay: 200 }),
    ]).start();
  }, [valueA, valueB]);

  const wA = ((valueA / maxVal) * maxBarW);
  const wB = ((valueB / maxVal) * maxBarW);

  return (
    <View style={{ width }}>
      {/* Bar A */}
      <View style={ch.row}>
        <Text style={ch.barLabel} numberOfLines={1}>{labelA}</Text>
        <View style={[ch.barBg, { width: maxBarW }]}>
          <Animated.View style={[ch.bar, { width: animA.interpolate({ inputRange: [0, 1], outputRange: [0, wA] }), backgroundColor: colorA }]} />
        </View>
        <Text style={[ch.barValue, { color: colorA }]} numberOfLines={1}>{formatFCFA(valueA)}</Text>
      </View>
      {/* Bar B */}
      <View style={[ch.row, { marginTop: gap }]}>
        <Text style={ch.barLabel} numberOfLines={1}>{labelB}</Text>
        <View style={[ch.barBg, { width: maxBarW }]}>
          <Animated.View style={[ch.bar, { width: animB.interpolate({ inputRange: [0, 1], outputRange: [0, wB] }), backgroundColor: colorB }]} />
        </View>
        <Text style={[ch.barValue, { color: colorB }]} numberOfLines={1}>{formatFCFA(valueB)}</Text>
      </View>
    </View>
  );
}

const ch = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 68, fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textMuted, textAlign: "right" },
  barBg: { height: 20, backgroundColor: Colors.background, borderRadius: 10, overflow: "hidden" },
  bar: { height: 20, borderRadius: 10 },
  barValue: { fontSize: 11, fontFamily: "Inter_600SemiBold", minWidth: 60 },
});

// ── COMPOSANT : GRAPHIQUE DONUT (Bénéfice) ──
function DonutChart({
  ventes,
  cogs,
  depenses,
  benefice,
  size = 120,
}: {
  ventes: number;
  cogs: number;
  depenses: number;
  benefice: number;
  size?: number;
}) {
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = ventes || 1;

  const cogsArc = Math.min((cogs / total) * circumference, circumference);
  const depArc = Math.min((depenses / total) * circumference, circumference);
  const netArc = Math.max(circumference - cogsArc - depArc, 0);

  const segments = [
    { color: Colors.danger + "CC", length: cogsArc, offset: 0 },
    { color: Colors.warning, length: depArc, offset: cogsArc },
    { color: Colors.success, length: netArc, offset: cogsArc + depArc },
  ];

  return (
    <Svg width={size} height={size}>
      {/* Background ring */}
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={Colors.border} strokeWidth={14} />
      {segments.map((seg, i) =>
        seg.length > 0 ? (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={14}
            strokeDasharray={`${seg.length} ${circumference - seg.length}`}
            strokeDashoffset={circumference / 4 - seg.offset}
            strokeLinecap="round"
          />
        ) : null
      )}
      {/* Center text */}
      <SvgText x={cx} y={cy - 6} textAnchor="middle" fontSize={10} fill={Colors.textMuted} fontFamily="Inter_500Medium">Bénéfice</SvgText>
      <SvgText x={cx} y={cy + 10} textAnchor="middle" fontSize={11} fill={benefice >= 0 ? Colors.success : Colors.danger} fontFamily="Inter_700Bold">
        {benefice >= 0 ? "+" : ""}{formatFCFA(benefice)}
      </SvgText>
    </Svg>
  );
}

// ── COMPOSANT : BARRE DE PROGRESSION PRÉVISIONNEL ──
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.min(progress, 1), duration: 800, useNativeDriver: false, delay: 300 }).start();
  }, [progress]);
  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), backgroundColor: color }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: Colors.background, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
});

// ── ÉCRAN DASHBOARD ──
export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: stats, isLoading, refetch, isRefetching } = useQuery<DashStats>({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard");
      return res.json();
    },
  });

  const { data: evolution } = useQuery<BeneficeEvolution>({
    queryKey: ["/api/benefice-evolution"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/benefice-evolution");
      return res.json();
    },
  });

  const [alertesStockVisible, setAlertesStockVisible] = useState(true);

  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const caAujourdhui = (stats?.ventesAujourdhui ?? 0) - (stats?.achatsAujourdhui ?? 0);
  const caHier = (stats?.totalVentesHier ?? 0) - (stats?.totalAchatsHier ?? 0);
  const evol = pct(caAujourdhui, caHier);
  const isPositive = evol >= 0;

  const prev = stats?.previsionnel;
  const progressMois = prev ? prev.dayOfMonth / prev.daysInMonth : 0;
  const dejaProvisionne = prev ? progressMois * prev.totalDepensesFixesMois : 0;

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingTop: topInsets + 16, paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
    >
      {/* ── HEADER ── */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.name}>{user?.nom}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </Text>
          </View>
          <Pressable onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <>
          {/* ── CARTE CA : GRAPHIQUE COMPARATIF ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="trending-up" size={18} color={Colors.success} />
                <Text style={styles.cardTitle}>Chiffre d'affaires</Text>
              </View>
              <View style={[styles.evolBadge, { backgroundColor: isPositive ? Colors.success + "20" : Colors.danger + "20" }]}>
                <Ionicons name={isPositive ? "arrow-up" : "arrow-down"} size={12} color={isPositive ? Colors.success : Colors.danger} />
                <Text style={[styles.evolText, { color: isPositive ? Colors.success : Colors.danger }]}>
                  {Math.abs(evol)}% vs hier
                </Text>
              </View>
            </View>
            <Text style={[styles.mainValue, { color: caAujourdhui >= 0 ? Colors.text : Colors.danger }]}>{formatFCFAFull(caAujourdhui)}</Text>
            <View style={styles.chartWrap}>
              <View style={{ width: "100%" }}>
                <ComparisonChart
                  labelA="Aujourd'hui"
                  valueA={Math.abs(caAujourdhui)}
                  labelB="Hier"
                  valueB={Math.abs(caHier)}
                  colorA={caAujourdhui >= 0 ? Colors.success : Colors.danger}
                  colorB={caHier >= 0 ? Colors.success + "55" : Colors.danger + "55"}
                  width={320}
                />
              </View>
            </View>
          </View>

          {/* ── ÉVOLUTION DU BÉNÉFICE : 7 DERNIERS JOURS ── */}
          {evolution && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="bar-chart" size={18} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Bénéfice — 7 derniers jours</Text>
                </View>
              </View>
              <BeneficeBarChart data={evolution.derniers7jours} />
              <View style={styles.legendRow}>
                <LegendDot color={Colors.success} label="Positif" />
                <LegendDot color={Colors.danger} label="Négatif" />
              </View>
            </View>
          )}

          {/* ── ÉVOLUTION DU BÉNÉFICE : 12 DERNIERS MOIS ── */}
          {evolution && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="bar-chart" size={18} color={Colors.accent} />
                  <Text style={styles.cardTitle}>Bénéfice — 12 derniers mois</Text>
                </View>
              </View>
              <BeneficeBarChart data={evolution.derniers12mois} />
              <View style={styles.legendRow}>
                <LegendDot color={Colors.success} label="Positif" />
                <LegendDot color={Colors.danger} label="Négatif" />
              </View>
            </View>
          )}

          {/* ── CARTE BÉNÉFICE NET RÉEL ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="analytics" size={18} color={Colors.primary} />
                <Text style={styles.cardTitle}>Bénéfice net réel</Text>
              </View>
            </View>
            <View style={styles.beneficeRow}>
              <DonutChart
                ventes={stats?.ventesAujourdhui ?? 0}
                cogs={stats?.coutsVentesAujourdhui ?? 0}
                depenses={stats?.depensesAujourdhui ?? 0}
                benefice={stats?.beneficeNetAujourdhui ?? 0}
                size={130}
              />
              <View style={styles.beneficeDetails}>
                <BeneficeLine label="Ventes" value={stats?.ventesAujourdhui ?? 0} color={Colors.primary} icon="cart" sign="+" />
                <BeneficeLine label="Coût achats" value={stats?.coutsVentesAujourdhui ?? 0} color={Colors.danger} icon="cube" sign="-" />
                <BeneficeLine label="Dépenses" value={stats?.depensesAujourdhui ?? 0} color={Colors.warning} icon="card" sign="-" />
                <View style={styles.beneficeDivider} />
                <View style={styles.beneficeNetRow}>
                  <Text style={styles.beneficeNetLabel}>Net</Text>
                  <Text style={[styles.beneficeNetValue, { color: (stats?.beneficeNetAujourdhui ?? 0) >= 0 ? Colors.success : Colors.danger }]}>
                    {(stats?.beneficeNetAujourdhui ?? 0) >= 0 ? "+" : ""}{formatFCFA(stats?.beneficeNetAujourdhui ?? 0)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.legendRow}>
              <LegendDot color={Colors.danger + "CC"} label="Coût achat" />
              <LegendDot color={Colors.warning} label="Dépenses" />
              <LegendDot color={Colors.success} label="Bénéfice" />
            </View>
          </View>

          {/* ── CARTE PRÉVISIONNEL ── */}
          {prev && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="calculator" size={18} color={Colors.accent} />
                  <Text style={styles.cardTitle}>Prévisionnel mensuel</Text>
                </View>
                <View style={[styles.evolBadge, { backgroundColor: Colors.accent + "20" }]}>
                  <Text style={[styles.evolText, { color: Colors.accent }]}>{prev.daysLeft} jours restants</Text>
                </View>
              </View>

              {prev.totalDepensesFixesMois > 0 ? (
                <>
                  <View style={styles.prevRow}>
                    <View>
                      <Text style={styles.prevLabel}>Charges fixes du mois</Text>
                      <Text style={styles.prevValue}>{formatFCFAFull(prev.totalDepensesFixesMois)}</Text>
                      <Text style={styles.prevSub}>Loyer · CEET · TdE · Salaires</Text>
                    </View>
                  </View>
                  <View style={styles.prevProgress}>
                    <View style={styles.prevProgressLabels}>
                      <Text style={styles.prevProgressLabel}>Mois écoulé</Text>
                      <Text style={styles.prevProgressLabel}>{Math.round(progressMois * 100)}%</Text>
                    </View>
                    <ProgressBar progress={progressMois} color={Colors.primary} />
                  </View>
                  <View style={[styles.alertBox, { backgroundColor: Colors.accent + "15", borderColor: Colors.accent + "40" }]}>
                    <Ionicons name="wallet-outline" size={20} color={Colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertTitle, { color: Colors.accent }]}>
                        À mettre de côté aujourd'hui
                      </Text>
                      <Text style={[styles.alertValue, { color: Colors.accent }]}>
                        {formatFCFAFull(prev.provisionnementJournalier)} / jour
                      </Text>
                      <Text style={styles.prevSub}>
                        Pour couvrir vos {formatFCFA(prev.totalDepensesFixesMois)} de charges
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.prevEmpty}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.textMuted} />
                  <Text style={styles.prevEmptyText}>
                    Ajoutez vos dépenses fixes (Loyer, CEET, TdE, Salaires) pour activer les prévisions.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── ALERTES STOCK ── */}
          {stats?.alertesStock && stats.alertesStock.length > 0 && (
            <View style={styles.card}>
              <Pressable style={styles.cardHeader} onPress={() => setAlertesStockVisible((v) => !v)}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="warning" size={18} color={Colors.danger} />
                  <Text style={styles.cardTitle}>Alertes stock</Text>
                </View>
                <View style={styles.alertesBadgeRow}>
                  <View style={[styles.evolBadge, { backgroundColor: Colors.danger + "20" }]}>
                    <Text style={[styles.evolText, { color: Colors.danger }]}>{stats.alertesStock.length} produit(s)</Text>
                  </View>
                  <Ionicons
                    name={alertesStockVisible ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={Colors.textMuted}
                  />
                </View>
              </Pressable>
              {alertesStockVisible && (
                <View style={styles.alertesList}>
                  {stats.alertesStock.map((p, i) => (
                    <View key={p.id} style={[styles.alerteItem, i < stats.alertesStock.length - 1 && styles.alerteItemBorder]}>
                      <View style={[styles.alerteStockBadge, { backgroundColor: p.stock === 0 ? Colors.danger : Colors.warning + "30" }]}>
                        <Text style={[styles.alerteStockNum, { color: p.stock === 0 ? "#fff" : Colors.danger }]}>{p.stock}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alerteNom} numberOfLines={1}>{p.nom}</Text>
                        <Text style={styles.alerteCat}>{p.categorie}</Text>
                      </View>
                      {p.stock === 0 ? (
                        <View style={[styles.ruptureBadge]}>
                          <Text style={styles.ruptureText}>RUPTURE</Text>
                        </View>
                      ) : (
                        <View style={styles.stockBas}>
                          <Ionicons name="alert-circle" size={14} color={Colors.warning} />
                          <Text style={styles.stockBasText}>Stock bas</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── TOP PRODUITS DU JOUR ── */}
          {stats?.topProduits && stats.topProduits.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="star" size={18} color={Colors.accent} />
                  <Text style={styles.cardTitle}>Top produits</Text>
                </View>
              </View>
              {stats.topProduits.map((p, i) => (
                <View key={i} style={[styles.topItem, i < stats.topProduits.length - 1 && styles.topItemBorder]}>
                  <View style={[styles.rankBadge, i === 0 && { backgroundColor: Colors.accent }]}>
                    <Text style={[styles.rankText, i === 0 && { color: "#fff" }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.topNom} numberOfLines={1}>{p.nom}</Text>
                  <View style={styles.topRight}>
                    <Text style={styles.topQte}>{p.quantite} vendus</Text>
                    <Text style={[styles.topTotal, { color: p.benefice >= 0 ? Colors.success : Colors.danger }]}>
                      {p.benefice >= 0 ? "+" : ""}{formatFCFA(p.benefice)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {(!stats?.topProduits || stats.topProduits.length === 0) && (!stats?.alertesStock || stats.alertesStock.length === 0) && (
            <View style={styles.emptyBox}>
              <Ionicons name="storefront-outline" size={52} color={Colors.border} />
              <Text style={styles.emptyText}>Aucune activité aujourd'hui</Text>
              <Text style={styles.emptySubText}>Commencez à enregistrer vos ventes</Text>
            </View>
          )}

        </>
      )}
    </ScrollView>
  );
}

function BeneficeLine({ label, value, color, icon, sign }: { label: string; value: number; color: string; icon: any; sign: string }) {
  return (
    <View style={bl.row}>
      <View style={[bl.dot, { backgroundColor: color + "25" }]}>
        <Ionicons name={icon} size={11} color={color} />
      </View>
      <Text style={bl.label} numberOfLines={1}>{label}</Text>
      <Text style={[bl.value, { color }]}>{sign}{formatFCFA(value)}</Text>
    </View>
  );
}
const bl = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 7 },
  dot: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  value: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  dateText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  logoutBtn: { padding: 7, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  loadingBox: { paddingTop: 80, alignItems: "center" },

  // Cards
  card: { backgroundColor: Colors.surface, borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  mainValue: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 16, letterSpacing: -0.5 },
  evolBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  evolText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  chartWrap: { alignItems: "flex-start" },

  // Bénéfice net
  beneficeRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  beneficeDetails: { flex: 1 },
  beneficeDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  beneficeNetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  beneficeNetLabel: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.text },
  beneficeNetValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  legendRow: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },

  // Prévisionnel
  prevRow: { marginBottom: 12 },
  prevLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted, marginBottom: 4 },
  prevValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  prevSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  prevProgress: { marginBottom: 14, gap: 6 },
  prevProgressLabels: { flexDirection: "row", justifyContent: "space-between" },
  prevProgressLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  prevEmpty: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  prevEmptyText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, lineHeight: 20 },
  alertBox: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  alertTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  alertValue: { fontSize: 18, fontFamily: "Inter_700Bold" },

  // Alertes stock
  alertesBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertesList: {},
  alerteItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  alerteItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  alerteStockBadge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  alerteStockNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  alerteNom: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  alerteCat: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  ruptureBadge: { backgroundColor: Colors.danger, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  ruptureText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
  stockBas: { flexDirection: "row", alignItems: "center", gap: 4 },
  stockBasText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.warning },

  // Top produits
  topItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  topItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rankBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.primary },
  topNom: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  topRight: { alignItems: "flex-end" },
  topQte: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  topTotal: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginTop: 2 },

  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
