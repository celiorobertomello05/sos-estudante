import type { ImageKey } from "../domain/models";

/**
 * Fotografias usadas no app. Por privacidade, apenas itens e locais:
 * nenhuma imagem mostra crianças ou pessoas identificáveis.
 */
const unsplash = (id: string, w = 640, h = 440) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=70`;

export const images: Record<ImageKey, string> = {
  camisa: unsplash("photo-1635274605638-d44babc08a4f"),
  calca: unsplash("photo-1630329273801-8f629dba0a72"),
  agasalho: unsplash("photo-1700659392887-0a026c53f8e2"),
  kit: unsplash("photo-1510070009289-b5bc34383727"),
  shorts: unsplash("photo-1562157873-818bc0726f68"),
  jaqueta: unsplash("photo-1551232864-3f0890e580d9"),
  pointA: unsplash("photo-1670956020767-9d06147defda", 200, 200),
  pointB: unsplash("photo-1700677332465-40000c20b715", 200, 200),
  pointC: unsplash("photo-1700659392887-0a026c53f8e2", 200, 200),
  map: unsplash("photo-1627797341872-7694d02573f4", 900, 520),
};

export const brandAssets = {
  logo: require("../../assets/branding/sos-estudante-logo.png"),
  mark: require("../../assets/branding/sos-estudante-mark.png"),
};
