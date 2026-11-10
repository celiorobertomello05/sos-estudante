# Segurança — SOS Estudante

O app lida com dados de estudantes (nome, CPF, RG, escola, documentos). Este
documento resume as proteções, o resultado da última revisão de segurança e as regras para
quem mantém o projeto.

## Princípios

- **O servidor decide.** Papel, status da conta, limites e estoque são
  validados no banco (RLS + RPCs). O app valida só para dar uma boa experiência.
- **Menor privilégio.** `anon` não acessa tabelas nem funções. `authenticated`
  só tem `SELECT` mínimo e as escritas diretas previstas (preferências, leitura
  de notificação e colunas não sensíveis do próprio perfil). Todo o resto passa
  por RPCs `SECURITY DEFINER` com `search_path` fixo.
- **Nada público.** Buckets privados, links temporários de 1 hora e nenhum
  segredo no repositório.

## Aplicativo

- URL e chave **pública** (`anon`) do Supabase vêm de variáveis `EXPO_PUBLIC_*`;
  `.env*` fica fora do Git (`.env.example` só tem nomes). A `service_role`
  nunca é usada pelo app.
- Sessão no `expo-secure-store` (criptografado), login com PKCE; login Google
  via navegador seguro do sistema (`openAuthSessionAsync`).
- Telas não chamam o Supabase: acesso só por `src/services` e `src/lib`.
- Mensagens ao usuário passam por `friendlyError` (sem SQL, tokens ou stack
  traces); nenhum `console.log` no código do app.
- Consultas enumeram colunas (sem `select("*")`); telefone mascarado para a
  equipe; RG mascarado na tela.
- Uploads limitados a 8 MB no app e no bucket, com tipos de arquivo restritos.
- Modo demonstração só com `EXPO_PUBLIC_ENABLE_DEMO_MODE=true` (desligado nos
  perfis `preview` e `production` do EAS e recusado pelo store).
- `android.allowBackup = false`; câmera e galeria pedem permissão no uso.

## Banco (Supabase)

- RLS ativo em **todas** as tabelas; policies só para `authenticated`.
- Contas pendentes ou bloqueadas não veem dados operacionais.
- Pedidos: carência de 6 meses, limite anual, CadÚnico obrigatório e
  elegibilidade por categoria, com lock por aluno contra pedidos simultâneos.
- Estoque reservado na aprovação; código de retirada visível só para o aluno e
  bloqueado após 5 erros.
- Revisão pela equipe (matrículas e coletores) por RPC, sem autoaprovação; a
  equipe só lê documentos de quem tem revisão pendente.
- Perfil: o usuário só altera nome, telefone, CEP, endereço e foto (permissão
  por coluna). Papel e CPF/RG são definidos uma única vez por RPC.
- Ações sensíveis registradas em `audit_logs` (sem acesso pelo cliente).

## Revisão de segurança (novembro de 2026)

Feita com o Security/Performance Advisor do Supabase, consultas de catálogo e
testes de RLS com usuários temporários (tudo desfeito com rollback).

| Verificação | Resultado |
| --- | --- |
| Tabelas sem RLS | nenhuma |
| Funções executáveis por `anon` | nenhuma |
| `SECURITY DEFINER` sem `search_path` fixo | nenhuma |
| Buckets públicos | nenhum |
| Segredos no código e no histórico Git | nenhum (o histórico só contém a chave pública `anon`, feita para ir no app) |
| RLS por usuário | aluno vê só os próprios dados; outro aluno não vê; equipe ativa vê pedidos; conta bloqueada não vê nada |

Correções aplicadas (`20261110160000_audit_hardening.sql`):

- policies reescritas com `(select auth.uid())` e helpers avaliados uma vez por
  consulta (mesmas regras, melhor desempenho);
- índices para 8 chaves estrangeiras.

Riscos aceitos e avisos esperados:

- **RPCs `SECURITY DEFINER` executáveis por usuário logado**: é o desenho; cada
  função valida papel e status. Os helpers `is_collector`,
  `current_user_is_active` e `can_review_documents_of` precisam de `EXECUTE`
  porque são usados dentro das policies; só respondem sobre o próprio usuário.
- **RLS sem policy em `audit_logs`**: intencional (nenhum acesso pelo cliente).
- **Assinatura da entrega em SVG**: gerada pelo app e gravada só pela equipe
  ativa, em caminho fixo validado pelo servidor; o app não a exibe em
  navegador. Converter para PNG exigiria dependência nativa nova.

## Verificações automáticas (CI)

`.github/workflows/ci.yml` roda em cada push/PR: tipos, lint, testes de
caracterização, export Android, `pnpm audit` e busca de segredos (gitleaks).

`glob` e `minimatch` têm alertas moderados que chegam pelas ferramentas do
Expo SDK 58 (só desenvolvimento/CI, sem exposição no app exportado). Serão
atualizados quando o Expo publicar versão compatível.

## Antes de publicar

1. Build de produção sem `EXPO_PUBLIC_ENABLE_DEMO_MODE=true`.
2. Variáveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` no
   EAS (nunca a `service_role`).
3. Redirect URLs restritas a `sosestudante://`; app do Google em produção.
4. Termos de uso e política de privacidade (LGPD) reais.
5. Revisar dependências (`pnpm audit`) e girar a chave se ela vazar.

## Reportar vulnerabilidades

Escreva para o e-mail de suporte do projeto com o assunto "Segurança". Não abra
issue pública com detalhes da falha.
