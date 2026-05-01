import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Tableau</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventaire">
        <Icon sf={{ default: "cube.box", selected: "cube.box.fill" }} />
        <Label>Produits</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ventes">
        <Icon sf={{ default: "cart", selected: "cart.fill" }} />
        <Label>Ventes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="achats">
        <Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} />
        <Label>Achats</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="depenses">
        <Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <Label>Dépenses</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stock">
        <Icon sf={{ default: "square.3.layers.3d", selected: "square.2.layers.3d.fill" }} />
        <Label>Stock</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="fournisseurs">
        <Icon sf={{ default: "building.2", selected: "building.2.fill" }} />
        <Label>Fournisseurs</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.surface,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]}>
              {/* Bande tricolore africaine en haut de la tab bar */}
              <View style={{ flexDirection: "row", height: 3 }}>
                <View style={{ flex: 1, backgroundColor: Colors.primary }} />
                <View style={{ flex: 1, backgroundColor: Colors.accent }} />
                <View style={{ flex: 1, backgroundColor: Colors.blue }} />
              </View>
            </View>
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tableau",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventaire"
        options={{
          title: "Produits",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ventes"
        options={{
          title: "Ventes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="achats"
        options={{
          title: "Achats",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="depenses"
        options={{
          title: "Dépenses",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fournisseurs"
        options={{
          title: "Fournisseurs",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
