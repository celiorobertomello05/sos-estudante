import { View } from "react-native";
import { Card, Pill, Row, Txt } from "../../components/ui";
import { requestStatusMeta } from "../../domain/labels";
import type { SupportRequest } from "../../domain/models";
import { colors } from "../../theme";
import { formatDate } from "../../utils/format";
import { itemsSummary } from "../../utils/requestPresentation";

export function RequestCard({ request, onPress }: { request: SupportRequest; onPress: () => void }) {
  const meta = requestStatusMeta[request.status];
  return (
    <Card onPress={onPress}>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt variant="small">#{request.protocol}</Txt>
        <Pill dot label={meta.label} tone={meta.tone} />
      </Row>
      <View style={{ gap: 2 }}>
        <Txt variant="title">{itemsSummary(request.items)}</Txt>
        <Txt variant="small">{request.schoolName}</Txt>
        <Txt variant="small" color={colors.ink400}>
          {formatDate(request.createdAt)}
        </Txt>
      </View>
    </Card>
  );
}
