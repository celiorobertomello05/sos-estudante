import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { UserRole } from "../domain/models";
import type { Route, RouteName } from "../navigation/routes";
import { useNav } from "../navigation/Navigator";
import { colors, fonts, shadow } from "../theme";
import { Txt } from "./ui";
import type { IconName } from "./ui";

interface Tab {
  route: Route;
  label: string;
  icon: IconName;
  /** Telas que também deixam esta aba destacada. */
  match: RouteName[];
}

const home: Tab = { route: { name: "dashboard" }, label: "Início", icon: "home-outline", match: ["dashboard", "notifications"] };
const points: Tab = { route: { name: "points" }, label: "Pontos", icon: "location-outline", match: ["points"] };
const profile: Tab = {
  route: { name: "profile" },
  label: "Perfil",
  icon: "person-outline",
  match: ["profile", "personal-data", "enrollment", "settings", "security", "help", "about", "history"],
};

/** Mesma estrutura do protótipo: Início · Pontos · ação central · Pedidos · Perfil. */
const tabsByRole: Record<UserRole, Tab[]> = {
  student: [
    home,
    points,
    { route: { name: "request" }, label: "Solicitar", icon: "clipboard-outline", match: ["request", "stock", "stock-detail"] },
    { route: { name: "requests" }, label: "Pedidos", icon: "cube-outline", match: ["requests", "request-detail"] },
    profile,
  ],
  donor: [
    home,
    points,
    { route: { name: "donate" }, label: "Doar", icon: "shirt-outline", match: ["donate"] },
    { route: { name: "donate", tab: "agenda" }, label: "Doações", icon: "cube-outline", match: [] },
    profile,
  ],
  collector: [
    home,
    points,
    { route: { name: "triage" }, label: "Triagem", icon: "filter-outline", match: ["triage", "stock", "stock-detail", "admin-stock"] },
    { route: { name: "distribution" }, label: "Pedidos", icon: "car-outline", match: ["distribution", "delivery", "request-detail"] },
    profile,
  ],
};

export default function BottomNav({ role }: { role: UserRole }) {
  const { route, reset } = useNav();
  const insets = useSafeAreaInsets();
  const isActive = (tab: Tab) =>
    tab.match.includes(route.name) ||
    (route.name === "donate" && tab.route.name === "donate" && (route.tab ?? "new") === ((tab.route as { tab?: string }).tab ?? "new"));

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabsByRole[role].map((tab, index) => {
        const active = isActive(tab);
        const center = index === 2;
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab.label}
            onPress={() => reset(tab.route)}
            style={styles.tab}
          >
            {center ? (
              <View style={styles.center}>
                <Ionicons color={colors.white} name={tab.icon} size={22} />
              </View>
            ) : (
              <Ionicons color={active ? colors.brand600 : colors.ink400} name={active ? (tab.icon.replace("-outline", "") as IconName) : tab.icon} size={22} />
            )}
            <Txt variant="tiny" color={active ? colors.brand700 : colors.ink400} style={{ fontFamily: active ? fonts.semibold : fonts.medium }}>
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    borderTopColor: colors.ink100,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingTop: 8,
  },
  tab: { alignItems: "center", flex: 1, gap: 3, justifyContent: "flex-end" },
  center: {
    alignItems: "center",
    backgroundColor: colors.brand600,
    borderRadius: 16,
    height: 46,
    justifyContent: "center",
    marginTop: -20,
    width: 46,
    ...shadow,
    shadowOpacity: 0.2,
  },
});
