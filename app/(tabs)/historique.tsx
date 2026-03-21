import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Text as SvgText, Line, G } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";

interface VenteItem {
  produitId: number;
  quantite: number;
  prixUnitaire: string;
  produit?: { nom: string; emoji?: string };
}

interface Vente {
  id: number;
  date: string;
  total: string;
  items?: VenteItem[];
}

interface AchatFournisseur {
  id: number;
  date: string;
  quantite: number;
  prixUnitaire: string;
  produitId: number;
  produit?: { nom: string; emoji?: string };
}

interface Produit {
  id: number;
  nom: string;
  emoji?: string;
  stock: number;
}

type Tab = "ventes" | "achats" | "stock";

/** Display a date label every N days in the 30-day bar chart */
const LABEL_EVERY_N_DAYS = 5;

function formatFCFA(v: string | number) {
  return new Intl.NumberFormat("fr-FR").format(Number(v)) + " FCFA";
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function isSameDay(dateA: string, dateB: string): boolean {
  return new Date(dateA).toISOString().split("T")[0] === dateB;
}

// ── BAR CHART ──
function BarChart({
  data,
  color,
  valueFormatter,
}: {
  data: { label: string; value: number }[];
  color: string;
  valueFormatter: (v: number) => string;
}) {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 40;
  const chartHeight = 160;
  const paddingLeft = 8;
  const paddingBottom = 36;
  const paddingTop = 20;
  const innerHeight = chartHeight - paddingBottom - paddingTop;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = (chartWidth - paddingLeft) / data.length;
  const barPad = barWidth * 0.25;

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = paddingTop + innerHeight * (1 - ratio);
        return (
          <Line
            key={ratio}
            x1={paddingLeft}
            y1={y}
            x2={chartWidth}
            y2={y}
            stroke={Colors.border}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = maxValue > 0 ? (d.value / maxValue) * innerHeight : 0;
        const x = paddingLeft + i * barWidth + barPad / 2;
        const y = paddingTop + innerHeight - barH;
        const w = barWidth - barPad;

        return (
          <G key={i}>
            <Rect
              x={x}
              y={y}
              width={Math.max(w, 2)}
              height={Math.max(barH, 2)}
              fill={d.value > 0 ? color : Colors.border}
              rx={4}
            />
            {d.value > 0 && (
              <SvgText
                x={x + w / 2}
                y={y - 4}
                fontSize={9}
                fontWeight="600"
                fill={Colors.textMuted}
                textAnchor="middle"
              >
                {d.value > 999 ? (d.value / 1000).toFixed(1) + "k" : String(d.value)}
              </SvgText>
            )}
            <SvgText
              x={x + w / 2}
              y={chartHeight - 6}
              fontSize={9}
              fill={Colors.textMuted}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ── STATS CARD ──
function StatsRow({
  total,
  avg,
  count,
  color,
  totalLabel = "Total 7 jours",
  avgLabel = "Moyenne/jour",
}: {
  total: number;
  avg: number;
  count: number;
  color: string;
  totalLabel?: string;
  avgLabel?: string;
}) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>{totalLabel}</Text>
        <Text style={[styles.statValue, { color }]}>{formatFCFA(total)}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>{avgLabel}</Text>
        <Text style={[styles.statValue, { color }]}>{formatFCFA(Math.round(avg))}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Transactions</Text>
        <Text style={[styles.statValue, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

type Period = "7j" | "30j" | "annee";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

export default function HistoriqueScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("ventes");
  const [period, setPeriod] = useState<Period>("7j");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [produitFilterId, setProduitFilterId] = useState<number | null>(null);
  const days7 = getLast7Days();
  const days30 = getLast30Days();

  const { data: ventes = [], isLoading: loadingVentes } = useQuery<Vente[]>({
    queryKey: ["/api/ventes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ventes");
      return res.json();
    },
  });

  const { data: achats = [], isLoading: loadingAchats } = useQuery<AchatFournisseur[]>({
    queryKey: ["/api/achats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/achats");
      return res.json();
    },
  });

  const { data: produits = [], isLoading: loadingProduits } = useQuery<Produit[]>({
    queryKey: ["/api/produits"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/produits");
      return res.json();
    },
  });

  // ── AVAILABLE YEARS ──
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    ventes.forEach((v) => years.add(new Date(v.date).getFullYear()));
    achats.forEach((a) => years.add(new Date(a.date).getFullYear()));
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [ventes, achats]);

  React.useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // ── TOP PRODUCTS ──
  const ventesByProduit: Record<number, { nom: string; emoji?: string; total: number; qty: number }> = {};
  ventes.forEach((v) => {
    (v.items ?? []).forEach((item) => {
      if (!ventesByProduit[item.produitId]) {
        ventesByProduit[item.produitId] = {
          nom: item.produit?.nom ?? `Produit #${item.produitId}`,
          emoji: item.produit?.emoji,
          total: 0,
          qty: 0,
        };
      }
      ventesByProduit[item.produitId].total += Number(item.prixUnitaire) * item.quantite;
      ventesByProduit[item.produitId].qty += item.quantite;
    });
  });
  const topVentesProduits = Object.entries(ventesByProduit)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);

  const achatsByProduit: Record<number, { nom: string; emoji?: string; total: number; qty: number }> = {};
  achats.forEach((a) => {
    if (!achatsByProduit[a.produitId]) {
      achatsByProduit[a.produitId] = {
        nom: a.produit?.nom ?? `Produit #${a.produitId}`,
        emoji: a.produit?.emoji,
        total: 0,
        qty: 0,
      };
    }
    achatsByProduit[a.produitId].total += Number(a.prixUnitaire) * a.quantite;
    achatsByProduit[a.produitId].qty += a.quantite;
  });
  const topAchatsProduits = Object.entries(achatsByProduit)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);

  // ── FILTERED VENTES/ACHATS by produit ──
  const ventesFiltered = produitFilterId
    ? ventes.filter((v) => (v.items ?? []).some((it) => it.produitId === produitFilterId))
    : ventes;
  const achatsFiltered = produitFilterId
    ? achats.filter((a) => a.produitId === produitFilterId)
    : achats;

  // ── CHART DATA ──
  let ventesChartData: { label: string; value: number; count: number }[] = [];
  let ventesTotal = 0;
  let ventesCount = 0;

  let achatsChartData: { label: string; value: number; count: number }[] = [];
  let achatsTotal = 0;
  let achatsCount = 0;

  if (period === "7j") {
    ventesChartData = days7.map((day) => {
      const dayV = ventesFiltered.filter((v) => isSameDay(v.date, day));
      const total = dayV.reduce((s, v) => {
        if (produitFilterId) {
          const itemTotal = (v.items ?? [])
            .filter((it) => it.produitId === produitFilterId)
            .reduce((ss, it) => ss + Number(it.prixUnitaire) * it.quantite, 0);
          return s + itemTotal;
        }
        return s + Number(v.total);
      }, 0);
      return { label: formatDayLabel(day), value: Math.round(total), count: dayV.length };
    });
    ventesTotal = ventesChartData.reduce((s, d) => s + d.value, 0);
    ventesCount = ventesFiltered.filter((v) => days7.includes(new Date(v.date).toISOString().split("T")[0])).length;

    achatsChartData = days7.map((day) => {
      const dayA = achatsFiltered.filter((a) => isSameDay(a.date, day));
      const total = dayA.reduce((s, a) => s + Number(a.prixUnitaire) * a.quantite, 0);
      return { label: formatDayLabel(day), value: Math.round(total), count: dayA.length };
    });
    achatsTotal = achatsChartData.reduce((s, d) => s + d.value, 0);
    achatsCount = achatsFiltered.filter((a) => days7.includes(new Date(a.date).toISOString().split("T")[0])).length;
  } else if (period === "30j") {
    ventesChartData = days30.map((day) => {
      const dayV = ventesFiltered.filter((v) => isSameDay(v.date, day));
      const total = dayV.reduce((s, v) => {
        if (produitFilterId) {
          const itemTotal = (v.items ?? [])
            .filter((it) => it.produitId === produitFilterId)
            .reduce((ss, it) => ss + Number(it.prixUnitaire) * it.quantite, 0);
          return s + itemTotal;
        }
        return s + Number(v.total);
      }, 0);
      const d = new Date(day + "T00:00:00");
      return {
        label: d.getDate() % LABEL_EVERY_N_DAYS === 0 ? `${d.getDate()}/${d.getMonth() + 1}` : "",
        value: Math.round(total),
        count: dayV.length,
      };
    });
    ventesTotal = ventesChartData.reduce((s, d) => s + d.value, 0);
    ventesCount = ventesFiltered.filter((v) => days30.includes(new Date(v.date).toISOString().split("T")[0])).length;

    achatsChartData = days30.map((day) => {
      const dayA = achatsFiltered.filter((a) => isSameDay(a.date, day));
      const total = dayA.reduce((s, a) => s + Number(a.prixUnitaire) * a.quantite, 0);
      const d = new Date(day + "T00:00:00");
      return {
        label: d.getDate() % LABEL_EVERY_N_DAYS === 0 ? `${d.getDate()}/${d.getMonth() + 1}` : "",
        value: Math.round(total),
        count: dayA.length,
      };
    });
    achatsTotal = achatsChartData.reduce((s, d) => s + d.value, 0);
    achatsCount = achatsFiltered.filter((a) => days30.includes(new Date(a.date).toISOString().split("T")[0])).length;
  } else {
    // annee
    ventesChartData = MONTH_LABELS.map((label, monthIdx) => {
      const monthV = ventesFiltered.filter((v) => {
        const d = new Date(v.date);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIdx;
      });
      const total = monthV.reduce((s, v) => {
        if (produitFilterId) {
          const itemTotal = (v.items ?? [])
            .filter((it) => it.produitId === produitFilterId)
            .reduce((ss, it) => ss + Number(it.prixUnitaire) * it.quantite, 0);
          return s + itemTotal;
        }
        return s + Number(v.total);
      }, 0);
      return { label, value: Math.round(total), count: monthV.length };
    });
    ventesTotal = ventesChartData.reduce((s, d) => s + d.value, 0);
    ventesCount = ventesFiltered.filter((v) => new Date(v.date).getFullYear() === selectedYear).length;

    achatsChartData = MONTH_LABELS.map((label, monthIdx) => {
      const monthA = achatsFiltered.filter((a) => {
        const d = new Date(a.date);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIdx;
      });
      const total = monthA.reduce((s, a) => s + Number(a.prixUnitaire) * a.quantite, 0);
      return { label, value: Math.round(total), count: monthA.length };
    });
    achatsTotal = achatsChartData.reduce((s, d) => s + d.value, 0);
    achatsCount = achatsFiltered.filter((a) => new Date(a.date).getFullYear() === selectedYear).length;
  }

  // ── STOCK DATA ──
  const stockChartData = produits
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 7)
    .map((p) => ({ label: p.nom.substring(0, 6), value: p.stock }));

  const totalStock = produits.reduce((s, p) => s + p.stock, 0);
  const enRupture = produits.filter((p) => p.stock === 0).length;
  const topStock = [...produits].sort((a, b) => b.stock - a.stock).slice(0, 8);

  const isLoading = loadingVentes || loadingAchats || loadingProduits;
  const topInsets = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const periodLabel = period === "7j" ? "7 derniers jours" : period === "30j" ? "30 derniers jours" : `Année ${selectedYear}`;
  const statsLabel = period === "annee" ? `Total ${selectedYear}` : period === "30j" ? "Total 30 jours" : "Total 7 jours";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInsets + 16 }]}>
        <Text style={styles.title}>Historique</Text>
      </View>

      {/* Tab selector */}
      <View style={styles.segmentRow}>
        {(["ventes", "achats", "stock"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.segBtn, activeTab === tab && styles.segBtnActive]}
            onPress={() => { setActiveTab(tab); setProduitFilterId(null); }}
          >
            <Text style={[styles.segText, activeTab === tab && styles.segTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Period selector (only for ventes/achats) */}
      {activeTab !== "stock" && (
        <View style={styles.periodRow}>
          {(["7j", "30j", "annee"] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === "7j" ? "7 jours" : p === "30j" ? "30 jours" : "Par an"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Year selector (only when period = annee) */}
      {activeTab !== "stock" && period === "annee" && availableYears.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.yearRow}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {availableYears.map((year) => (
            <Pressable
              key={year}
              style={[styles.yearBtn, selectedYear === year && styles.yearBtnActive]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[styles.yearText, selectedYear === year && styles.yearTextActive]}>
                {year}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 118 : 100 }}
        >
          {/* ── VENTES TAB ── */}
          {activeTab === "ventes" && (
            <View style={styles.tabContent}>
              {/* Product filter chips */}
              {topVentesProduits.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}
                >
                  <Pressable
                    style={[styles.prodChip, !produitFilterId && styles.prodChipActive]}
                    onPress={() => setProduitFilterId(null)}
                  >
                    <Text style={[styles.prodChipText, !produitFilterId && styles.prodChipTextActive]}>
                      Tous
                    </Text>
                  </Pressable>
                  {topVentesProduits.map(([id, data]) => (
                    <Pressable
                      key={id}
                      style={[styles.prodChip, produitFilterId === Number(id) && styles.prodChipActive]}
                      onPress={() => setProduitFilterId(produitFilterId === Number(id) ? null : Number(id))}
                    >
                      <Text style={styles.prodChipEmoji}>{data.emoji || "📦"}</Text>
                      <Text
                        style={[styles.prodChipText, produitFilterId === Number(id) && styles.prodChipTextActive]}
                        numberOfLines={1}
                      >
                        {data.nom.length > 14 ? data.nom.substring(0, 14) + "…" : data.nom}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>
                  Revenus — {periodLabel}
                  {produitFilterId && topVentesProduits.find(([id]) => Number(id) === produitFilterId)
                    ? ` · ${topVentesProduits.find(([id]) => Number(id) === produitFilterId)![1].nom}`
                    : ""}
                </Text>
                <BarChart data={ventesChartData} color={Colors.primary} valueFormatter={formatFCFA} />
              </View>

              <StatsRow
                total={ventesTotal}
                avg={ventesTotal / (period === "annee" ? 12 : period === "30j" ? 30 : 7)}
                count={ventesCount}
                color={Colors.primary}
                avgLabel={period === "annee" ? "Moy./mois" : "Moy./jour"}
                totalLabel={statsLabel}
              />

              {topVentesProduits.length > 0 && (
                <View style={styles.listCard}>
                  <Text style={styles.listCardTitle}>Top produits (tous temps)</Text>
                  {topVentesProduits.map(([id, data]) => (
                    <View key={id} style={styles.rankRow}>
                      <Text style={styles.rankEmoji}>{data.emoji || "📦"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rankNom} numberOfLines={1}>{data.nom}</Text>
                        <Text style={styles.rankMeta}>{data.qty} unités vendues</Text>
                      </View>
                      <Text style={[styles.rankTotal, { color: Colors.primary }]}>
                        {formatFCFA(data.total)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {topVentesProduits.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={{ fontSize: 40 }}>📊</Text>
                  <Text style={styles.emptyText}>Aucune vente enregistrée</Text>
                </View>
              )}
            </View>
          )}

          {/* ── ACHATS TAB ── */}
          {activeTab === "achats" && (
            <View style={styles.tabContent}>
              {/* Product filter chips */}
              {topAchatsProduits.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}
                >
                  <Pressable
                    style={[styles.prodChip, !produitFilterId && styles.prodChipActive]}
                    onPress={() => setProduitFilterId(null)}
                  >
                    <Text style={[styles.prodChipText, !produitFilterId && styles.prodChipTextActive]}>
                      Tous
                    </Text>
                  </Pressable>
                  {topAchatsProduits.map(([id, data]) => (
                    <Pressable
                      key={id}
                      style={[styles.prodChip, produitFilterId === Number(id) && styles.prodChipActive]}
                      onPress={() => setProduitFilterId(produitFilterId === Number(id) ? null : Number(id))}
                    >
                      <Text style={styles.prodChipEmoji}>{data.emoji || "📦"}</Text>
                      <Text
                        style={[styles.prodChipText, produitFilterId === Number(id) && styles.prodChipTextActive]}
                        numberOfLines={1}
                      >
                        {data.nom.length > 14 ? data.nom.substring(0, 14) + "…" : data.nom}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>
                  Dépenses achats — {periodLabel}
                  {produitFilterId && topAchatsProduits.find(([id]) => Number(id) === produitFilterId)
                    ? ` · ${topAchatsProduits.find(([id]) => Number(id) === produitFilterId)![1].nom}`
                    : ""}
                </Text>
                <BarChart data={achatsChartData} color={Colors.accent} valueFormatter={formatFCFA} />
              </View>

              <StatsRow
                total={achatsTotal}
                avg={achatsTotal / (period === "annee" ? 12 : period === "30j" ? 30 : 7)}
                count={achatsCount}
                color={Colors.accent}
                avgLabel={period === "annee" ? "Moy./mois" : "Moy./jour"}
                totalLabel={statsLabel}
              />

              {topAchatsProduits.length > 0 && (
                <View style={styles.listCard}>
                  <Text style={styles.listCardTitle}>Top produits achetés (tous temps)</Text>
                  {topAchatsProduits.map(([id, data]) => (
                    <View key={id} style={styles.rankRow}>
                      <Text style={styles.rankEmoji}>{data.emoji || "📦"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rankNom} numberOfLines={1}>{data.nom}</Text>
                        <Text style={styles.rankMeta}>{data.qty} unités achetées</Text>
                      </View>
                      <Text style={[styles.rankTotal, { color: Colors.accent }]}>
                        {formatFCFA(data.total)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {topAchatsProduits.length === 0 && (
                <View style={styles.emptyCard}>
                  <Text style={{ fontSize: 40 }}>🛒</Text>
                  <Text style={styles.emptyText}>Aucun achat enregistré</Text>
                </View>
              )}
            </View>
          )}

          {/* ── STOCK TAB ── */}
          {activeTab === "stock" && (
            <View style={styles.tabContent}>
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Top 7 produits par stock actuel</Text>
                <BarChart data={stockChartData} color={Colors.info} valueFormatter={(v) => String(v)} />
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Stock total</Text>
                  <Text style={[styles.statValue, { color: Colors.primary }]}>{totalStock}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Produits</Text>
                  <Text style={[styles.statValue, { color: Colors.info }]}>{produits.length}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Ruptures</Text>
                  <Text style={[styles.statValue, { color: Colors.danger }]}>{enRupture}</Text>
                </View>
              </View>

              {topStock.length > 0 && (
                <View style={styles.listCard}>
                  <Text style={styles.listCardTitle}>Produits par niveau de stock</Text>
                  {topStock.map((p) => {
                    const stockBas = p.stock > 0 && p.stock < 10;
                    const rupture = p.stock === 0;
                    return (
                      <View key={p.id} style={styles.rankRow}>
                        <Text style={styles.rankEmoji}>{p.emoji || "📦"}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rankNom} numberOfLines={1}>{p.nom}</Text>
                        </View>
                        <View
                          style={[
                            styles.stockPill,
                            {
                              backgroundColor: rupture
                                ? Colors.danger + "20"
                                : stockBas
                                ? Colors.warning + "20"
                                : Colors.success + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.stockPillText,
                              {
                                color: rupture
                                  ? Colors.danger
                                  : stockBas
                                  ? Colors.warning
                                  : Colors.success,
                              },
                            ]}
                          >
                            {p.stock} u.
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  segmentRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  segBtnActive: { backgroundColor: Colors.primary },
  segText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  segTextActive: { color: "#fff" },
  // Period selector
  periodRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  periodBtnActive: { backgroundColor: Colors.primary + "15", borderColor: Colors.primary },
  periodText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  periodTextActive: { color: Colors.primary },
  // Year row
  yearRow: { marginBottom: 10, maxHeight: 40 },
  yearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  yearBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  yearText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  yearTextActive: { color: "#fff" },
  // Product chips
  prodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  prodChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  prodChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },
  prodChipTextActive: { color: "#fff" },
  prodChipEmoji: { fontSize: 13 },
  tabContent: { paddingHorizontal: 20, gap: 16 },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 4 },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  listCardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 8 },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rankEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  rankNom: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  rankMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  rankTotal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stockPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockPillText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
