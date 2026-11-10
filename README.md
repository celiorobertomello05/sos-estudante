# SOS Estudante

Aplicativo mobile (Expo / React Native, foco em Android) que conecta doações de
uniformes e materiais escolares a estudantes da rede pública.

Projeto acadêmico de portfólio. Os dados de exemplo são fictícios.

Trabalho **"SOS Estudante: plataforma de gestão de coletas e distribuição de
uniformes e materiais escolares"**, apresentado no **4º Summit UMC**
(Universidade de Mogi das Cruzes, 4 a 6 de novembro de 2026), categoria
**Inovação**.

## Funcionalidades

- **Três perfis:** estudante, doador e equipe/coletor, cada um com sua tela
  inicial e permissões.
- **Estudante:** valida a matrícula (com CadÚnico), solicita itens e acompanha o
  pedido até a retirada com um código de 4 dígitos.
- **Doador:** registra doações e agenda a entrega em pontos de coleta próximos
  (mapa e localização).
- **Equipe:** triagem de doações, controle de estoque, aprovação de pedidos,
  validação de matrículas e coletores, e entrega com foto e assinatura.
- **Conta:** login por e-mail ou Google (OAuth + PKCE), completar cadastro para
  quem entra pelo Google, recuperação de senha por link, documentos privados.
- **Modo demonstração:** explora todos os fluxos sem banco de dados.

## Stack

Expo SDK 58 · React Native 0.88 · React 19 · TypeScript estrito · Supabase
(Postgres, Auth, Storage, RLS) · EAS Build · GitHub Actions.

## Destaques técnicos

- **Segurança no servidor:** RLS em todas as tabelas, escritas sensíveis só
  por RPC `SECURITY DEFINER`, permissões por coluna e buckets privados. Ver
  [SECURITY.md](SECURITY.md).
- **Regras de negócio puras** em `src/domain/` (limite anual, carência,
  elegibilidade, reserva de estoque), testadas sem React nem Supabase.
- **Camadas:** telas → store → services → lib. As telas nunca falam com o
  Supabase diretamente.
- **Layout responsivo** com grade por largura útil e tokens de tema.
- **CI:** tipos, lint, testes, export Android, `pnpm audit` e gitleaks.

## Estrutura

```
src/
  application/  ponto de entrada (fontes, provedores, roteador)
  navigation/   rotas tipadas, histórico e botão voltar do Android
  store/        estado central (modo Supabase ou demonstração)
  services/     autenticação, dados (RPC) e arquivos privados
  domain/       modelos, rótulos e regras de negócio
  screens/      telas por área (auth, home, doações, estoque, pedidos…)
  components/   peças visuais reutilizáveis (ui/ com um componente por arquivo)
  theme/        cores, fontes, medidas e layout
supabase/
  migrations/   tabelas, RLS, funções e buckets
  fixtures/     roteiro de testes das RPCs
  seed.sql      catálogo de exemplo (pontos e estoque)
tests/          testes de caracterização (node --test)
```

## Rodar sem banco (demonstração)

1. `pnpm install` (pnpm 10.34.3, o mesmo do CI).
2. Copie `.env.example` para `.env` e defina `EXPO_PUBLIC_ENABLE_DEMO_MODE=true`.
3. `npx expo start -c` e abra no Expo Go.

Código de retirada dos pedidos de exemplo: `4827`. Sem Supabase e sem essa
flag, o app mostra um erro de configuração em vez de entrar na demonstração.

## Conectar a um Supabase próprio

1. Crie um projeto no Supabase e aplique, em ordem, os arquivos de
   `supabase/migrations/`. Opcional: `supabase/seed.sql` para o catálogo de
   exemplo.
2. No `.env`, preencha `EXPO_PUBLIC_SUPABASE_URL` e a chave pública
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (nunca a `service_role`).
3. Authentication → URL Configuration: adicione `sosestudante://auth/reset` e
   `sosestudante://auth/callback`.
4. Google (opcional): ative em Authentication → Providers. O botão só aparece
   no app com o provedor ativo.
5. O primeiro coletor é ativado no painel (`profiles.status = 'active'`); os
   demais são aprovados pela equipe no próprio app.

O login Google precisa do app instalado (build de desenvolvimento), porque o
retorno usa o esquema `sosestudante://`.

## Build (EAS)

`eas.json` tem três perfis: `development` (dev client, com demonstração),
`preview` (APK interno) e `production` (AAB). `preview` e `production` forçam
`EXPO_PUBLIC_ENABLE_DEMO_MODE=false`. Cadastre a URL e a chave pública do
Supabase como variáveis do projeto no EAS.

```
npx eas-cli build --profile development --platform android
```

## Comandos

```
pnpm run test:characterization
pnpm run typecheck
pnpm run lint
pnpm run export:android
```

## Autores

Willian Oliveira dos Santos · Celio Roberto Cunha Mello Neto · Diego Victorio
Benetti de Sousa · Gustavo Yuji Saiki · Hudson Alves dos Santos · Vanessa Gomes
Albuquerque

## Licença

Todos os direitos reservados. O código está público apenas para portfólio e
avaliação acadêmica; uso, cópia ou redistribuição dependem de autorização dos
autores. Ver [LICENSE](LICENSE).
