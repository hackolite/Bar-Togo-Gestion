import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Polyline,
  Rect,
  Circle,
  Line,
  Text as SvgText,
  G,
} from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import Colors from "@/constants/colors";

// ── TYPES ──────────────────────────────────────────────────────────────────────

interface AnalyticsRow {
  date: string;
  revenue: number;
  quantity: number;
  margin: number;
  hour: number;
  dayOfWeek: number;
}

interface DailyRow {
  date: string;
  revenue: number;
  quantity: number;
  margin: number;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function formatFCFA(amount: number): string {
  if (amount >= 1_000_000)
    return (amount / 1_000_000).toFixed(1).replace(".", ",") + " M FCFA";
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// ── KPI CARD ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  color: string;
  icon: string;
}

function KpiCard({ label, value, color, icon }: KpiCardProps) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <Text style={styles.kpiIcon}>{icon}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

// ── LINE CHART ────────────────────────────────────────────────────────────────

interface LineChartProps {
  data: { label: string; value: number }[];
  color: string;
  width: number;
  height?: number;
}

function LineChart({ data, color, width, height = 160 }: LineChartProps) {
  const PADDING = { top: 16, bottom: 32, left: 8, right: 8 };
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  if (data.length < 2) {
    return (
      <View style={[styles.chartEmptyContainer, { width, height }]}>
        <Text style={styles.emptyText}>Données insuffisantes</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = 0;

  const points = data.map((d, i) => {
    const x = PADDING.left + (i / (data.length - 1)) * chartW;
    const y = PADDING.top + chartH - ((d.value - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, ...d };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // show at most 6 labels
  const step = Math.max(1, Math.ceil(data.length / 6));
  const labelPoints = points.filter((_, i) => i % step === 0 || i === points.length - 1);

  return (
    <Svg width={width} height={height}>
      {/* Grid line at top */}
      <Line
        x1={PADDING.left}
        y1={PADDING.top}
        x2={width - PADDING.right}
        y2={PADDING.top}
        stroke={Colors.border}
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      {/* Grid line at middle */}
      <Line
        x1={PADDING.left}
        y1={PADDING.top + chartH / 2}
        x2={width - PADDING.right}
        y2={PADDING.top + chartH / 2}
        stroke={Colors.border}
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      {/* Polyline */}
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dots */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}
      {/* X-axis labels */}
      {labelPoints.map((p, i) => (
        <SvgText
          key={i}
          x={p.x}
          y={height - 4}
          fontSize={9}
          fill={Colors.textMuted}
          textAnchor="middle"
        >
          {p.label}
        </SvgText>
      ))}
    </Svg>
  );
}

// ── BAR CHART ─────────────────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number }[];
  color: string;
  width: number;
  height?: number;
}

function BarChart({ data, color, width, height = 140 }: BarChartProps) {
  const PADDING = { top: 16, bottom: 28, left: 8, right: 8 };
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  if (data.length === 0) {
    return (
      <View style={[styles.chartEmptyContainer, { width, height }]}>
        <Text style={styles.emptyText}>Aucune donnée</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barGap = 4;
  const barW = Math.max(4, chartW / data.length - barGap);

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = PADDING.left + i * (barW + barGap);
        const y = PADDING.top + chartH - barH;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} fill={color} rx={2} />
            <SvgText
              x={x + barW / 2}
              y={height - 6}
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

// ── SECTION HEADER ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 32;

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [dateFrom, setDateFrom] = useState<string>(
    thirtyDaysAgo.toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState<string>(
    today.toISOString().split("T")[0]
  );

  const { data: rawData, isLoading, error } = useQuery<AnalyticsRow[]>({
    queryKey: ["/api/analytics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics");
      return res.json();
    },
  });

  // ── FILTERING ──

  const filtered = useMemo<AnalyticsRow[]>(() => {
    if (!rawData) return [];
    const parseDate = (s: string): Date | null => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const from = parseDate(dateFrom);
    const to = parseDate(dateTo + "T23:59:59");
    return rawData.filter((row) => {
      const d = new Date(row.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [rawData, dateFrom, dateTo]);

  // ── TOTALS ──

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.revenue,
        margin: acc.margin + row.margin,
        quantity: acc.quantity + row.quantity,
      }),
      { revenue: 0, margin: 0, quantity: 0 }
    );
  }, [filtered]);

  // ── TABLE: group by date ──

  const dailyRows = useMemo<DailyRow[]>(() => {
    const map = new Map<string, DailyRow>();
    for (const row of filtered) {
      const existing = map.get(row.date);
      if (existing) {
        existing.revenue += row.revenue;
        existing.quantity += row.quantity;
        existing.margin += row.margin;
      } else {
        map.set(row.date, { date: row.date, revenue: row.revenue, quantity: row.quantity, margin: row.margin });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  // ── LINE CHART: revenue per day ──

  const revenuePerDay = useMemo(() => {
    return dailyRows
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({ label: formatDate(row.date), value: row.revenue }));
  }, [dailyRows]);

  // ── BAR CHART: revenue per hour ──

  const revenuePerHour = useMemo(() => {
    const hourMap: Record<number, number> = {};
    for (const row of filtered) {
      hourMap[row.hour] = (hourMap[row.hour] ?? 0) + row.revenue;
    }
    return Array.from({ length: 24 }, (_, h) => ({
      label: `${h}`,
      value: hourMap[h] ?? 0,
    }));
  }, [filtered]);

  // ── BAR CHART: revenue per day of week ──

  const revenuePerDow = useMemo(() => {
    const dowMap: Record<number, number> = {};
    for (const row of filtered) {
      dowMap[row.dayOfWeek] = (dowMap[row.dayOfWeek] ?? 0) + row.revenue;
    }
    return Array.from({ length: 7 }, (_, d) => ({
      label: DAY_LABELS[d],
      value: dowMap[d] ?? 0,
    }));
  }, [filtered]);

  // ── RENDER ──

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement des données…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>
          Erreur lors du chargement des données.{"\n"}
          {(error as Error).message}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Analytiques</Text>
        <Text style={styles.headerSub}>Analyse commerciale détaillée</Text>
      </View>

      {/* ── DATE FILTER ── */}
      <View style={styles.section}>
        <SectionHeader title="Période" />
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Du</Text>
            <TextInput
              style={styles.filterInput}
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Au</Text>
            <TextInput
              style={styles.filterInput}
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
            />
          </View>
        </View>
      </View>

      {/* ── KPI CARDS ── */}
      <View style={styles.section}>
        <SectionHeader title="Indicateurs clés" />
        <View style={styles.kpiRow}>
          <KpiCard
            label="Chiffre d'affaires"
            value={formatFCFA(totals.revenue)}
            color={Colors.primary}
            icon="💰"
          />
          <KpiCard
            label="Marge brute"
            value={formatFCFA(totals.margin)}
            color={Colors.success}
            icon="📈"
          />
          <KpiCard
            label="Qté vendue"
            value={totals.quantity.toLocaleString("fr-FR")}
            color={Colors.info}
            icon="🛒"
          />
        </View>
      </View>

      {/* ── LINE CHART: revenue over time ── */}
      {revenuePerDay.length >= 2 && (
        <View style={styles.section}>
          <SectionHeader title="Chiffre d'affaires par jour" />
          <View style={styles.chartCard}>
            <LineChart
              data={revenuePerDay}
              color={Colors.primary}
              width={chartWidth}
              height={180}
            />
          </View>
        </View>
      )}

      {/* ── BAR CHART: revenue per hour ── */}
      <View style={styles.section}>
        <SectionHeader title="CA par heure" />
        <View style={styles.chartCard}>
          <BarChart
            data={revenuePerHour}
            color={Colors.accent}
            width={chartWidth}
            height={140}
          />
        </View>
      </View>

      {/* ── BAR CHART: revenue per day of week ── */}
      <View style={styles.section}>
        <SectionHeader title="CA par jour de la semaine" />
        <View style={styles.chartCard}>
          <BarChart
            data={revenuePerDow}
            color={Colors.success}
            width={chartWidth}
            height={140}
          />
        </View>
      </View>

      {/* ── DATA TABLE ── */}
      <View style={styles.section}>
        <SectionHeader title={`Tableau des ventes (${dailyRows.length} jour${dailyRows.length !== 1 ? "s" : ""})`} />
        <View style={styles.tableCard}>
          {/* Header row */}
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 3, textAlign: "right" }]}>CA</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Qté</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 3, textAlign: "right" }]}>Marge</Text>
          </View>
          {dailyRows.length === 0 ? (
            <View style={styles.tableEmptyRow}>
              <Text style={styles.emptyText}>Aucune vente sur cette période</Text>
            </View>
          ) : (
            dailyRows.map((row, i) => (
              <View
                key={row.date}
                style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
              >
                <Text style={[styles.tableCell, { flex: 2 }]}>{formatDate(row.date)}</Text>
                <Text style={[styles.tableCell, styles.tableCellNumeric, { flex: 3 }]}>
                  {formatFCFA(row.revenue)}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellNumeric, { flex: 2 }]}>
                  {row.quantity}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableCellNumeric,
                    { flex: 3, color: row.margin >= 0 ? Colors.success : Colors.danger },
                  ]}
                >
                  {formatFCFA(row.margin)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  chartEmptyContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  // ── HEADER ──
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
    fontFamily: Platform.OS === "ios" ? "System" : undefined,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // ── SECTION ──
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  // ── FILTER ──
  filterRow: {
    flexDirection: "row",
    gap: 12,
  },
  filterField: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  filterInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
  },
  // ── KPI ──
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
  },
  // ── CHART ──
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  // ── TABLE ──
  tableCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tableHeaderRow: {
    backgroundColor: Colors.background,
  },
  tableRowAlt: {
    backgroundColor: "#F9FBF9",
  },
  tableEmptyRow: {
    padding: 24,
    alignItems: "center",
  },
  tableCell: {
    fontSize: 13,
    color: Colors.text,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  tableCellNumeric: {
    textAlign: "right",
  },
});
