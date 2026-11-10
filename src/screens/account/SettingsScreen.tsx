import Screen from "../../components/Screen";
import { Card, Divider, ToggleRow, Txt } from "../../components/ui";
import { useApp } from "../../store/AppStore";

export function SettingsScreen() {
  const app = useApp();
  const { settings, updateSettings } = app;
  return (
    <Screen title="Configurações">
      <Card>
        <Txt variant="caption">Notificações</Txt>
        <ToggleRow detail="Mostra o contador de novidades no início" onChange={(v) => updateSettings({ pushEnabled: v })} title="Alertas no aplicativo" value={settings.pushEnabled} />
        <Divider />
        <ToggleRow detail="Mostra os lembretes de retirada na lista de notificações" onChange={(v) => updateSettings({ pickupReminders: v })} title="Lembretes de retirada" value={settings.pickupReminders} />
      </Card>
      <Card>
        <Txt variant="caption">Privacidade</Txt>
        <ToggleRow detail="Ordena os pontos pela distância" onChange={(v) => updateSettings({ shareLocation: v })} title="Usar minha localização" value={settings.shareLocation} />
      </Card>
      <Card>
        <Txt variant="caption">Acessibilidade</Txt>
        <ToggleRow detail="Aumenta o tamanho das letras em todo o app" onChange={(v) => updateSettings({ largeText: v })} title="Texto ampliado" value={settings.largeText} />
        <Divider />
        <ToggleRow detail="Desativa transições entre telas" onChange={(v) => updateSettings({ reduceMotion: v })} title="Reduzir animações" value={settings.reduceMotion} />
      </Card>
    </Screen>
  );
}
