import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Grid from "../../components/Grid";
import Photo from "../../components/Photo";
import Screen from "../../components/Screen";
import { Chips, EmptyState, Field, Pill, Txt } from "../../components/ui";
import { categoryLabels } from "../../domain/labels";
import { RULES } from "../../domain/rules";
import { useNav } from "../../navigation/Navigator";
import { useApp } from "../../store/AppStore";
import { colors, spacing, tones } from "../../theme";
import { stockTone, stockLabel } from "./shared";
import { styles } from "./styles";

type StockFilter = "all" | "available" | "low";

export function StockScreen() {
  const app = useApp();
  const { go } = useNav();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const isCollector = app.profile?.role === "collector";
  const today = new Date().toDateString();
  const todayMoves = app.movements.filter((m) => new Date(m.createdAt).toDateString() === today);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return app.stock
      .filter((s) => !q || `${categoryLabels[s.category]} ${s.sizes.join(" ")}`.toLowerCase().includes(q))
      .filter((s) => (filter === "available" ? s.quantity >= RULES.lowStockThreshold : filter === "low" ? s.quantity < RULES.lowStockThreshold : true));
  }, [app.stock, query, filter]);

  return (
    <Screen
      right={isCollector ? <Pressable accessibilityLabel="Gestão de estoque" hitSlop={8} onPress={() => go({ name: "admin-stock" })}><Ionicons color={colors.ink800} name="swap-horizontal-outline" size={22} /></Pressable> : undefined}
      tabs
      title={isCollector ? "Estoque" : "Itens disponíveis"}
    >
      <Field label="Buscar" onChangeText={setQuery} placeholder="Tipo ou tamanho..." value={query} />
      <Chips
        dark
        onChange={setFilter}
        options={[
          { value: "all", label: "Todos" },
          { value: "available", label: "Disponíveis" },
          { value: "low", label: "Baixo estoque" },
        ]}
        value={filter}
      />
      <LinearGradient colors={[colors.brand700, colors.brand500]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.total}>
        <Txt variant="small" color="rgba(255,255,255,0.85)">
          Total em estoque
        </Txt>
        <Txt variant="display" color={colors.white}>
          {app.stock.reduce((sum, s) => sum + s.quantity, 0)} itens
        </Txt>
        {isCollector ? (
          <Txt variant="small" color="rgba(255,255,255,0.85)">
            ↑ {todayMoves.filter((m) => m.type === "in").reduce((s, m) => s + m.quantity, 0)} entradas hoje · ↓{" "}
            {todayMoves.filter((m) => m.type === "out").reduce((s, m) => s + m.quantity, 0)} saídas hoje
          </Txt>
        ) : (
          <Txt variant="small" color="rgba(255,255,255,0.85)">
            Itens triados e higienizados, prontos para solicitação
          </Txt>
        )}
      </LinearGradient>
      {items.length === 0 ? <EmptyState body="Ajuste a busca ou o filtro." icon="cube-outline" title="Nada encontrado" /> : null}
      <Grid minItemWidth={150}>
        {items.map((item) => {
          const tone = stockTone(item);
          return (
            <Pressable accessibilityRole="button" key={item.id} onPress={() => go({ name: "stock-detail", id: item.id })} style={styles.tile}>
              <Photo imageKey={item.category} style={styles.tileImage} />
              <View style={{ gap: 4, padding: spacing.md }}>
                <Pill label={stockLabel(item)} tone={tone} />
                <Txt variant="h1" color={tones[tone].fg}>
                  {item.quantity}
                </Txt>
                <Txt variant="title">{categoryLabels[item.category]}</Txt>
                <Txt variant="small">{item.sizes.join(" · ")}</Txt>
              </View>
            </Pressable>
          );
        })}
      </Grid>
    </Screen>
  );
}
