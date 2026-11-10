import type { ItemCategory, UserRole } from "../domain/models";
import type { IconName } from "./ui";

export const roleIcons: Record<UserRole, IconName> = {
  student: "person-outline",
  donor: "heart-outline",
  collector: "car-outline",
};

export const categoryIcons: Record<ItemCategory, IconName> = {
  camisa: "shirt-outline",
  calca: "shirt-outline",
  agasalho: "shirt-outline",
  kit: "book-outline",
  shorts: "shirt-outline",
  jaqueta: "shirt-outline",
};
