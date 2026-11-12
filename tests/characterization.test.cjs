const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

process.env.TZ = "UTC";

const projectRoot = path.resolve(__dirname, "..");
const compiledRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sos-estudante-characterization-"));
const pureModules = [
  "src/domain/catalog.ts",
  "src/domain/labels.ts",
  "src/domain/location.ts",
  "src/domain/pointSearch.ts",
  "src/domain/models.ts",
  "src/domain/rules.ts",
  "src/domain/requestRules.ts",
  "src/domain/categoryEligibility.ts",
  "src/domain/annualLimit.ts",
  "src/domain/enrollmentRules.ts",
  "src/domain/stockReservation.ts",
  "src/domain/profileCompletion.ts",
  "src/domain/documents.ts",
  "src/domain/schedule.ts",
  "src/domain/statistics.ts",
  "src/data/seed.ts",
  "src/utils/validation.ts",
  "src/utils/format.ts",
  "src/utils/requestPresentation.ts",
  "src/utils/errors.ts",
  "src/utils/authLinks.ts",
  "src/navigation/routes.ts",
  "src/theme/layout.ts",
];

for (const relativePath of pureModules) {
  const sourcePath = path.join(projectRoot, relativePath);
  const outputPath = path.join(compiledRoot, relativePath.replace(/\.ts$/, ".js"));
  const output = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output.outputText);
}

const rules = require(path.join(compiledRoot, "src/domain/rules.js"));
const schedule = require(path.join(compiledRoot, "src/domain/schedule.js"));
const documents = require(path.join(compiledRoot, "src/domain/documents.js"));
const catalog = require(path.join(compiledRoot, "src/domain/catalog.js"));
const location = require(path.join(compiledRoot, "src/domain/location.js"));
const pointSearch = require(path.join(compiledRoot, "src/domain/pointSearch.js"));
const models = require(path.join(compiledRoot, "src/domain/models.js"));
const statistics = require(path.join(compiledRoot, "src/domain/statistics.js"));
const seed = require(path.join(compiledRoot, "src/data/seed.js"));
const validation = require(path.join(compiledRoot, "src/utils/validation.js"));
const format = require(path.join(compiledRoot, "src/utils/format.js"));
const requestPresentation = require(path.join(compiledRoot, "src/utils/requestPresentation.js"));
const errors = require(path.join(compiledRoot, "src/utils/errors.js"));
const authLinks = require(path.join(compiledRoot, "src/utils/authLinks.js"));
const routes = require(path.join(compiledRoot, "src/navigation/routes.js"));
const layout = require(path.join(compiledRoot, "src/theme/layout.js"));

test.after(() => {
  fs.rmSync(compiledRoot, { force: true, recursive: true });
});

const requestItem = (quantityRequested, category = "camisa", size = "M") => ({
  category,
  size,
  quantityApproved: 0,
  quantityRequested,
});

const categoryRequest = (id, status, categories) => ({
  id,
  status,
  items: categories.map((category) => ({ category })),
});

const delivery = (requestId, deliveredAt) => ({
  requestId,
  deliveredAt,
});

const evaluateCategories = ({
  requestedCategories,
  previousRequests = [],
  previousDeliveries = [],
  now = "2026-07-10T12:00:00.000Z",
}) =>
  rules.evaluateCategoryEligibility({
    requestedCategories,
    previousRequests,
    previousDeliveries,
    now: new Date(now),
  });

test("registra os limites atuais de pedidos, doações, entrega e estoque", () => {
  assert.deepEqual(rules.RULES, {
    maxItemsPerRequest: 5,
    maxQuantityPerItem: 5,
    maxOpenRequestsPerStudent: 3,
    maxDonationQuantity: 50,
    pickupCodeLength: 4,
    lowStockThreshold: 15,
  });
});

test("registra os textos e a ordem atuais da linha do tempo da solicitação", () => {
  assert.deepEqual([...rules.REQUEST_STEPS], [
    "Solicitação enviada",
    "Solicitação analisada",
    "Itens separados",
    "Kit preparado",
    "Pronto para retirada",
    "Retirada realizada",
  ]);
});

test("registra os tamanhos disponíveis por categoria", () => {
  assert.deepEqual(catalog.sizesByCategory, {
    camisa: ["PP", "P", "M", "G", "GG"],
    calca: ["34", "36", "38", "40", "42", "44"],
    agasalho: ["P", "M", "G", "GG"],
    shorts: ["P", "M", "G"],
    jaqueta: ["P", "M", "G", "GG"],
    kit: ["Único"],
  });
});

test("mantém as categorias das migrations de elegibilidade alinhadas ao domínio", () => {
  const migrationsDirectory = path.join(projectRoot, "supabase/migrations");
  const categoryGuards = fs
    .readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => ({
      file,
      sql: fs.readFileSync(path.join(migrationsDirectory, file), "utf8"),
    }))
    .filter(({ sql }) => /v_category\s+not in\s*\(/s.test(sql));

  assert.ok(categoryGuards.length > 0, "A validação de categorias da RPC não foi encontrada.");
  for (const { file, sql } of categoryGuards) {
    const guard = /v_category\s+not in\s*\(([^)]+)\)/s.exec(sql);
    const sqlCategories = [...guard[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
    assert.deepEqual(
      [...sqlCategories].sort(),
      [...rules.itemCategories].sort(),
      file,
    );
  }
});

test("preserva os contratos do seed idempotente e do handler de unicidade", () => {
  const seedSql = fs.readFileSync(path.join(projectRoot, "supabase/seed.sql"), "utf8");
  const catalogIds = [
    ...seedSql.matchAll(/'([12]0000000-0000-4000-8000-00000000000[1-6])'/g),
  ].map((match) => match[1]);
  assert.equal(catalogIds.length, 9);
  assert.equal(new Set(catalogIds).size, 9);
  assert.equal((seedSql.match(/on conflict \(id\) do nothing;/gi) ?? []).length, 2);

  const uniqueHandlerMigration = fs.readFileSync(
    path.join(
      projectRoot,
      "supabase/migrations/20261107120000_refine_request_unique_violation.sql",
    ),
    "utf8",
  );
  assert.match(
    uniqueHandlerMigration,
    /get stacked diagnostics v_unique_constraint = constraint_name;/i,
  );
  assert.match(
    uniqueHandlerMigration,
    /v_unique_constraint = 'request_items_request_id_category_size_key'/,
  );
  assert.match(uniqueHandlerMigration, /end if;\s+raise;\s+end \$\$;/);
});

test("calcula distância geográfica sem depender da interface", () => {
  const origin = { latitude: -23.5505, longitude: -46.6333 };
  const nearby = { latitude: -23.5405, longitude: -46.6333 };
  assert.equal(location.distanceBetweenCoordinatesKm(origin, origin), 0);
  assert.ok(location.distanceBetweenCoordinatesKm(origin, nearby) > 1);
  assert.ok(location.distanceBetweenCoordinatesKm(origin, nearby) < 1.2);
  assert.equal(
    location.distanceBetweenCoordinatesKm(origin, nearby),
    location.distanceBetweenCoordinatesKm(nearby, origin),
  );
});

test("distingue catálogo público de detalhes administrativos do estoque", () => {
  const publicItem = {
    id: "stock-public",
    category: "camisa",
    sizes: ["M"],
    quantity: 2,
    condition: "bom",
  };
  assert.equal(models.hasStockItemAdministrativeDetails(publicItem), false);
  assert.equal(
    models.hasStockItemAdministrativeDetails({
      ...publicItem,
      location: "Estoque A",
      school: "EMEF Exemplo",
      donorName: "Doador",
      receivedAt: "2026-01-01T00:00:00.000Z",
    }),
    true,
  );
});

test("seleciona somente a submissão de matrícula marcada como ativa", () => {
  const history = [
    {
      id: "enrollment-new",
      schoolName: "EMEF Atual",
      enrollmentNumber: "2026-02",
      grade: "9º ano",
      validUntil: "dez 2026",
      status: "pending",
      isActive: true,
      createdAt: "2026-02-01T12:00:00.000Z",
    },
    {
      id: "enrollment-old",
      schoolName: "EMEF Anterior",
      enrollmentNumber: "2025-01",
      grade: "8º ano",
      validUntil: "dez 2025",
      status: "verified",
      isActive: false,
      createdAt: "2025-02-01T12:00:00.000Z",
    },
  ];

  assert.equal(models.findActiveEnrollment(history)?.id, "enrollment-new");
  assert.equal(models.findActiveEnrollment(history.map((item) => ({ ...item, isActive: false }))), null);
});

test("preserva o resumo e as próximas ações visuais de pedidos", () => {
  assert.equal(
    requestPresentation.itemsSummary([
      requestItem(2, "camisa", "M"),
      { ...requestItem(1, "kit", "Único"), quantityApproved: 1 },
    ]),
    "2× Camisa M + 1× Kit",
  );
  assert.deepEqual(requestPresentation.nextRequestAction, {
    in_review: { to: "approved", label: "Aprovar solicitação" },
    approved: { to: "separating", label: "Iniciar separação" },
    separating: { to: "ready", label: "Marcar como pronto" },
  });
});

test("agrega somente doações reais dos últimos sete meses", () => {
  assert.deepEqual(
    statistics.monthlyDonationSeries(
      [
        { createdAt: "2025-12-31T23:59:59.000Z", quantity: 2 },
        { createdAt: "2026-01-10T12:00:00.000Z", quantity: 3 },
        { createdAt: "2026-01-20T12:00:00.000Z", quantity: 4 },
        { createdAt: "2026-07-01T00:00:00.000Z", quantity: 5 },
      ],
      new Date("2026-07-15T12:00:00.000Z"),
    ),
    [
      { month: "Jan", value: 7 },
      { month: "Fev", value: 0 },
      { month: "Mar", value: 0 },
      { month: "Abr", value: 0 },
      { month: "Mai", value: 0 },
      { month: "Jun", value: 0 },
      { month: "Jul", value: 5 },
    ],
  );
});

test("registra todas as transições permitidas de solicitação", () => {
  assert.deepEqual(rules.allowedRequestTransitions, {
    in_review: ["approved", "cancelled"],
    approved: ["separating", "cancelled"],
    separating: ["ready", "cancelled"],
    ready: ["delivered"],
    delivered: [],
    cancelled: [],
  });

  assert.equal(rules.canTransition("in_review", "approved"), true);
  assert.equal(rules.canTransition("in_review", "delivered"), false);
  assert.equal(rules.canTransition("ready", "delivered"), true);
  assert.equal(rules.canTransition("delivered", "ready"), false);
});

test("considera entregues e cancelados encerrados; demais status ficam abertos", () => {
  for (const status of ["in_review", "approved", "separating", "ready"]) {
    assert.equal(rules.isOpenRequest(status), true, status);
  }
  assert.equal(rules.isOpenRequest("delivered"), false);
  assert.equal(rules.isOpenRequest("cancelled"), false);
});

test("caracteriza a validação atual dos itens de uma solicitação", () => {
  assert.equal(rules.validateRequestItems([]), "Selecione pelo menos um item.");
  assert.equal(
    rules.validateRequestItems(Array.from({ length: 6 }, () => requestItem(1))),
    "Cada solicitação aceita até 5 itens.",
  );
  assert.equal(
    rules.validateRequestItems([requestItem(0)]),
    "A quantidade por item deve ficar entre 1 e 5.",
  );
  assert.equal(rules.validateRequestItems([requestItem(1)]), null);
  assert.equal(rules.validateRequestItems([requestItem(5)]), null);
  assert.equal(
    rules.validateRequestItems([requestItem(6)]),
    "A quantidade por item deve ficar entre 1 e 5.",
  );
  assert.equal(
    rules.validateRequestItems([requestItem(1.5)]),
    "A quantidade por item deve ficar entre 1 e 5.",
  );
});

test("rejeita item repetido, mas permite tamanhos diferentes da mesma categoria", () => {
  assert.equal(
    rules.validateRequestItems([requestItem(1), requestItem(1)]),
    "Não adicione a mesma categoria e tamanho mais de uma vez.",
  );
  assert.equal(
    rules.validateRequestItems([
      requestItem(1, "camisa", "M"),
      requestItem(1, "camisa", "G"),
    ]),
    null,
  );
});

test("valida o código de retirada com o tamanho definido no domínio", () => {
  assert.equal(rules.isValidPickupCode("4827"), true);
  assert.equal(rules.isValidPickupCode("0482"), true);
  assert.equal(rules.isValidPickupCode("482"), false);
  assert.equal(rules.isValidPickupCode("48270"), false);
  assert.equal(rules.isValidPickupCode("48A7"), false);
});

test("limpa e limita textos como hoje", () => {
  assert.equal(validation.onlyDigits("(11) 98765-4321"), "11987654321");
  assert.equal(validation.cleanText("  uma   frase \n com espaços  "), "uma frase com espaços");
  assert.equal(validation.cleanText("abcdef", 4), "abcd");
});

test("valida e-mail, CPF e CNPJ", () => {
  assert.equal(validation.isValidEmail("aluno@example.com"), true);
  assert.equal(validation.isValidEmail("  aluno@example.com  "), true);
  assert.equal(validation.isValidEmail("aluno@example"), false);
  assert.equal(validation.isValidEmail("aluno @example.com"), false);
  assert.equal(validation.isValidCpf("529.982.247-25"), true);
  assert.equal(validation.isValidCpf("111.111.111-11"), false);
  assert.equal(validation.isValidCnpj("11.222.333/0001-81"), true);
  assert.equal(validation.isValidCnpj("11.222.333/0001-80"), false);
});

test("caracteriza cada requisito atual de senha", () => {
  assert.equal(validation.passwordIssue("Ab1"), "A senha precisa ter pelo menos 8 caracteres.");
  assert.equal(validation.passwordIssue("abcdefgh1"), "Use letras maiúsculas e minúsculas.");
  assert.equal(validation.passwordIssue("Abcdefgh"), "Inclua pelo menos um número.");
  assert.equal(validation.passwordIssue("Abcdefg1"), null);
});

test("valida nascimento, telefone e CEP", () => {
  assert.equal(validation.parseBirthDate("18/04/2012"), "2012-04-18");
  assert.equal(validation.parseBirthDate("31/02/2012"), null);
  assert.equal(validation.parseBirthDate("31/12/2999"), null);
  assert.equal(validation.isValidPhone("(11) 3333-4444"), true);
  assert.equal(validation.isValidPhone("(11) 93333-4444"), true);
  assert.equal(validation.isValidPhone("9333-4444"), false);
  assert.equal(validation.isValidCep("01310-100"), true);
  assert.equal(validation.isValidCep("01310"), false);
});

test("formata datas e horários no comportamento atual", () => {
  assert.equal(format.formatDate("2025-01-15T12:00:00.000Z"), "15 jan 2025");
  assert.equal(format.formatDateTime("2025-01-15T14:30:00.000Z"), "15 jan · 14:30");
});

test("formata tempo relativo com o relógio controlado", (context) => {
  const originalNow = Date.now;
  Date.now = () => new Date("2025-01-15T12:00:00.000Z").getTime();
  context.after(() => {
    Date.now = originalNow;
  });

  assert.equal(format.relativeTime("2025-01-15T11:59:40.000Z"), "Agora");
  assert.equal(format.relativeTime("2025-01-15T11:45:00.000Z"), "15 min");
  assert.equal(format.relativeTime("2025-01-15T10:00:00.000Z"), "2h");
  assert.equal(format.relativeTime("2025-01-14T12:00:00.000Z"), "Ontem");
  assert.equal(format.relativeTime("2025-01-12T12:00:00.000Z"), "12 jan 2025");
});

test("formata nomes, telefone e documentos", () => {
  assert.equal(format.initials("Ana Carolina Santos"), "AS");
  assert.equal(format.initials("Ana"), "A");
  assert.equal(format.firstName("  Ana Carolina Santos  "), "Ana");
  assert.equal(format.maskPhone("11987654321"), "(**) *****-**21");
  assert.equal(format.maskPhone(), "Protegido");
  assert.equal(format.maskCpf("52998224725"), "529.982.247-25");
  assert.equal(format.maskCnpj("11222333000181"), "11.222.333/0001-81");
  assert.equal(format.maskDate("18042012"), "18/04/2012");
  assert.equal(format.maskPhoneInput("11987654321"), "(11) 98765-4321");
  assert.equal(format.maskCep("01310100"), "01310-100");
});

test("gera IDs locais e protocolos no formato atual", () => {
  assert.match(format.localId("req"), /^req-[a-z0-9]+-[a-z0-9]{5}$/);
  assert.match(
    format.protocol("SOL"),
    new RegExp(`^SOL-${new Date().getFullYear()}-\\d{4}$`),
  );
});

test("permite a primeira solicitação de uma categoria", () => {
  assert.deepEqual(evaluateCategories({ requestedCategories: ["camisa"] }), {
    allowed: true,
    blockedCategories: [],
  });
});

test("uma entrega de categoria diferente não bloqueia a categoria solicitada", () => {
  assert.equal(
    evaluateCategories({
      requestedCategories: ["agasalho"],
      previousRequests: [categoryRequest("req-1", "delivered", ["calca"])],
      previousDeliveries: [delivery("req-1", "2026-06-01T12:00:00.000Z")],
    }).allowed,
    true,
  );
});

test("bloqueia a mesma categoria antes de seis meses", () => {
  assert.deepEqual(
    evaluateCategories({
      requestedCategories: ["camisa"],
      previousRequests: [categoryRequest("req-1", "delivered", ["camisa"])],
      previousDeliveries: [delivery("req-1", "2026-01-10T12:00:00.000Z")],
      now: "2026-07-10T11:59:59.999Z",
    }),
    {
      allowed: false,
      blockedCategories: [
        {
          category: "camisa",
          reason: "cooldown",
          requestId: "req-1",
          deliveredAt: "2026-01-10T12:00:00.000Z",
          eligibleAt: "2026-07-10T12:00:00.000Z",
        },
      ],
    },
  );
});

test("libera a mesma categoria exatamente no vencimento", () => {
  assert.equal(
    evaluateCategories({
      requestedCategories: ["camisa"],
      previousRequests: [categoryRequest("req-1", "delivered", ["camisa"])],
      previousDeliveries: [delivery("req-1", "2026-01-10T12:00:00.000Z")],
      now: "2026-07-10T12:00:00.000Z",
    }).allowed,
    true,
  );
});

test("usa a entrega mais recente quando existem várias da mesma categoria", () => {
  const result = evaluateCategories({
    requestedCategories: ["calca"],
    previousRequests: [
      categoryRequest("req-antiga", "delivered", ["calca"]),
      categoryRequest("req-recente", "delivered", ["calca"]),
    ],
    previousDeliveries: [
      delivery("req-antiga", "2025-01-01T12:00:00.000Z"),
      delivery("req-recente", "2026-04-01T12:00:00.000Z"),
    ],
    now: "2026-07-10T12:00:00.000Z",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.blockedCategories[0].reason, "cooldown");
  assert.equal(result.blockedCategories[0].requestId, "req-recente");
});

test("pedido cancelado não inicia carência", () => {
  assert.equal(
    evaluateCategories({
      requestedCategories: ["kit"],
      previousRequests: [categoryRequest("req-1", "cancelled", ["kit"])],
      previousDeliveries: [delivery("req-1", "2026-06-01T12:00:00.000Z")],
    }).allowed,
    true,
  );
});

for (const status of ["in_review", "approved", "separating", "ready"]) {
  test(`pedido ${status} não inicia carência, mas bloqueia duplicidade aberta`, () => {
    const result = evaluateCategories({
      requestedCategories: ["agasalho"],
      previousRequests: [categoryRequest("req-aberta", status, ["agasalho"])],
    });

    assert.deepEqual(result, {
      allowed: false,
      blockedCategories: [
        {
          category: "agasalho",
          reason: "open_request",
          requestId: "req-aberta",
        },
      ],
    });
  });
}

test("pedido entregue sem deliveredAt retorna inconsistência controlada", () => {
  assert.deepEqual(
    evaluateCategories({
      requestedCategories: ["jaqueta"],
      previousRequests: [categoryRequest("req-inconsistente", "delivered", ["jaqueta"])],
    }),
    {
      allowed: false,
      blockedCategories: [
        {
          category: "jaqueta",
          reason: "delivery_data_inconsistent",
          requestId: "req-inconsistente",
        },
      ],
    },
  );
});

test("inconsistência de entrega prevalece sobre pedido aberto da mesma categoria", () => {
  const result = evaluateCategories({
    requestedCategories: ["jaqueta"],
    previousRequests: [
      categoryRequest("req-entregue", "delivered", ["jaqueta"]),
      categoryRequest("req-aberta", "approved", ["jaqueta"]),
    ],
  });

  assert.deepEqual(result.blockedCategories, [
    {
      category: "jaqueta",
      reason: "delivery_data_inconsistent",
      requestId: "req-entregue",
    },
  ]);
});

test("deliveredAt inválido também retorna inconsistência controlada", () => {
  const result = evaluateCategories({
    requestedCategories: ["jaqueta"],
    previousRequests: [categoryRequest("req-inconsistente", "delivered", ["jaqueta"])],
    previousDeliveries: [delivery("req-inconsistente", "data-inválida")],
  });

  assert.equal(result.allowed, false);
  assert.equal(result.blockedCategories[0].reason, "delivery_data_inconsistent");
});

test("categorias diferentes de um pedido aberto continuam permitidas", () => {
  assert.equal(
    evaluateCategories({
      requestedCategories: ["shorts"],
      previousRequests: [categoryRequest("req-1", "approved", ["camisa"])],
    }).allowed,
    true,
  );
});

test("pedido misto é rejeitado por inteiro quando uma categoria está bloqueada", () => {
  const result = evaluateCategories({
    requestedCategories: ["camisa", "calca"],
    previousRequests: [categoryRequest("req-1", "delivered", ["camisa"])],
    previousDeliveries: [delivery("req-1", "2026-06-01T12:00:00.000Z")],
  });

  assert.equal(result.allowed, false);
  assert.deepEqual(result.blockedCategories.map((item) => item.category), ["camisa"]);
});

test("a mesma categoria em tamanhos diferentes é avaliada uma única vez", () => {
  const result = evaluateCategories({
    requestedCategories: ["camisa", "camisa"],
    previousRequests: [categoryRequest("req-1", "approved", ["camisa"])],
  });

  assert.equal(result.blockedCategories.length, 1);
  assert.equal(result.blockedCategories[0].category, "camisa");
});

test("seis meses preservam o fim do mês", () => {
  const before = evaluateCategories({
    requestedCategories: ["calca"],
    previousRequests: [categoryRequest("req-1", "delivered", ["calca"])],
    previousDeliveries: [delivery("req-1", "2026-01-31T09:30:00.000Z")],
    now: "2026-07-31T09:29:59.999Z",
  });
  const atDeadline = evaluateCategories({
    requestedCategories: ["calca"],
    previousRequests: [categoryRequest("req-1", "delivered", ["calca"])],
    previousDeliveries: [delivery("req-1", "2026-01-31T09:30:00.000Z")],
    now: "2026-07-31T09:30:00.000Z",
  });

  assert.equal(before.allowed, false);
  assert.equal(before.blockedCategories[0].eligibleAt, "2026-07-31T09:30:00.000Z");
  assert.equal(atDeadline.allowed, true);
});

test("seis meses ajustam 31 de agosto para o fim de fevereiro", () => {
  const result = evaluateCategories({
    requestedCategories: ["kit"],
    previousRequests: [categoryRequest("req-1", "delivered", ["kit"])],
    previousDeliveries: [delivery("req-1", "2022-08-31T12:00:00.000Z")],
    now: "2023-02-27T12:00:00.000Z",
  });

  assert.equal(result.blockedCategories[0].eligibleAt, "2023-02-28T12:00:00.000Z");
});

test("seis meses respeitam 29 de fevereiro em ano bissexto", () => {
  const result = evaluateCategories({
    requestedCategories: ["shorts"],
    previousRequests: [categoryRequest("req-1", "delivered", ["shorts"])],
    previousDeliveries: [delivery("req-1", "2023-08-31T12:00:00.000Z")],
    now: "2024-02-28T12:00:00.000Z",
  });

  assert.equal(result.blockedCategories[0].eligibleAt, "2024-02-29T12:00:00.000Z");
});

test("seis meses atravessam a mudança de ano", () => {
  const result = evaluateCategories({
    requestedCategories: ["agasalho"],
    previousRequests: [categoryRequest("req-1", "delivered", ["agasalho"])],
    previousDeliveries: [delivery("req-1", "2025-09-30T12:00:00.000Z")],
    now: "2026-03-29T12:00:00.000Z",
  });

  assert.equal(result.blockedCategories[0].eligibleAt, "2026-03-30T12:00:00.000Z");
});

test("a carência usa seis meses de calendário, não 180 dias", () => {
  const result = evaluateCategories({
    requestedCategories: ["camisa"],
    previousRequests: [categoryRequest("req-1", "delivered", ["camisa"])],
    previousDeliveries: [delivery("req-1", "2026-01-31T12:00:00.000Z")],
    now: "2026-07-30T12:00:00.000Z",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.blockedCategories[0].eligibleAt, "2026-07-31T12:00:00.000Z");
});

test("mantém os limites globais atuais junto da nova elegibilidade", () => {
  assert.equal(rules.RULES.maxOpenRequestsPerStudent, 3);
  assert.equal(rules.RULES.maxItemsPerRequest, 5);
  assert.equal(rules.RULES.maxQuantityPerItem, 5);
  assert.equal(
    rules.validateRequestItems([
      requestItem(5, "camisa", "M"),
      requestItem(5, "calca", "38"),
      requestItem(5, "agasalho", "G"),
      requestItem(5, "kit", "Único"),
      requestItem(5, "shorts", "P"),
    ]),
    null,
  );
  assert.notEqual(
    rules.validateRequestItems(Array.from({ length: 6 }, () => requestItem(1))),
    null,
  );
  assert.notEqual(rules.validateRequestItems([requestItem(6)]), null);
});

test("o histórico do modo demonstração bloqueia somente as categorias entregues recentemente", () => {
  const studentRequests = seed.seedRequests.filter(
    (request) => request.studentName === seed.demoProfiles.student.fullName,
  );

  const deliveredCategory = rules.evaluateCategoryEligibility({
    requestedCategories: ["calca"],
    previousRequests: studentRequests,
    previousDeliveries: seed.seedDeliveries,
    now: new Date(),
  });
  const availableCategory = rules.evaluateCategoryEligibility({
    requestedCategories: ["agasalho"],
    previousRequests: studentRequests,
    previousDeliveries: seed.seedDeliveries,
    now: new Date(),
  });
  const mixedRequest = rules.evaluateCategoryEligibility({
    requestedCategories: ["calca", "agasalho"],
    previousRequests: studentRequests,
    previousDeliveries: seed.seedDeliveries,
    now: new Date(),
  });

  assert.equal(deliveredCategory.allowed, false);
  assert.equal(deliveredCategory.blockedCategories[0].reason, "cooldown");
  assert.equal(availableCategory.allowed, true);
  assert.equal(mixedRequest.allowed, false);
});

test("o histórico de matrículas do modo demonstração contém a submissão inicial ativa consistente", () => {
  assert.ok(Array.isArray(seed.demoEnrollmentHistory));
  assert.ok(seed.demoEnrollmentHistory.length > 0);
  const active = models.findActiveEnrollment(seed.demoEnrollmentHistory);
  assert.ok(active !== null);
  assert.equal(active.isActive, true);
  assert.equal(active.status, "verified");
  assert.equal(active.schoolName, seed.demoEnrollment.schoolName);
  assert.equal(active.enrollmentNumber, seed.demoEnrollment.enrollmentNumber);
});

test("o catálogo demo e detalhes administrativos contêm localização e condição válidas para movimentação", () => {
  for (const item of seed.seedStock) {
    assert.ok(item.sizes.length > 0);
    assert.ok(item.quantity > 0);
    assert.ok(models.hasStockItemAdministrativeDetails(item));
    assert.ok(typeof item.location === "string" && item.location.length > 0);
  }
  assert.equal(seed.DEMO_PICKUP_CODE.length, rules.RULES.pickupCodeLength);
});

test("esquema ausente no servidor gera mensagem segura, sem código ou SQL", () => {
  const cases = [
    { code: "PGRST205", message: "Could not find the table 'public.profiles' in the schema cache" },
    { code: "42P01", message: 'relation "public.requests" does not exist' },
    { code: "PGRST202", message: "Could not find the function public.create_request in the schema cache" },
    new Error("Could not find the table 'public.profiles' in the schema cache"),
  ];
  for (const error of cases) {
    assert.equal(errors.isSchemaUnavailableError(error), true);
    const message = errors.friendlyErrorMessage(error);
    assert.equal(message, errors.SERVICE_UNAVAILABLE_MESSAGE);
    assert.doesNotMatch(message, /PGRST|42P01|profiles|schema|relation/i);
  }
});

test("mensagens amigáveis existentes são preservadas, inclusive para erros que não são Error", () => {
  assert.equal(errors.friendlyErrorMessage(new Error("Invalid login credentials")), "E-mail ou senha incorretos.");
  assert.equal(errors.friendlyErrorMessage(new Error("BUSINESS_RULE: Estoque insuficiente.")), "Estoque insuficiente.");
  assert.equal(errors.friendlyErrorMessage(new Error("PICKUP_CODE_INVALID")), "Código de retirada incorreto.");
  assert.equal(errors.friendlyErrorMessage({ message: "NOT_ALLOWED", code: "P0001" }), "Você não tem permissão para esta ação.");
  assert.equal(errors.friendlyErrorMessage({ message: "TypeError: Network request failed" }), "Sem conexão. Verifique sua internet e tente novamente.");
  assert.equal(errors.friendlyErrorMessage(undefined), "Não foi possível concluir agora. Tente novamente.");
  assert.equal(errors.friendlyErrorMessage(new Error("syntax error at or near SELECT")), "Não foi possível concluir agora. Tente novamente.");
  assert.equal(errors.isNotAllowedError({ message: "NOT_ALLOWED" }), true);
  assert.equal(errors.isNotAllowedError(new Error("Network request failed")), false);
});

test("contas não ativas não acessam telas operacionais, mas mantêm as demais", () => {
  for (const route of routes.operationalRoutes) {
    const role = routes.routeRoles[route][0];
    assert.equal(routes.canAccess(route, role), true, `${route} ativo`);
    assert.equal(routes.canAccess(route, role, "active"), true, `${route} ativo`);
    assert.equal(routes.canAccess(route, role, "pending"), false, `${route} pendente`);
    assert.equal(routes.canAccess(route, role, "blocked"), false, `${route} bloqueado`);
  }
  for (const route of ["dashboard", "profile", "help", "enrollment", "stock", "notifications"]) {
    assert.equal(routes.canAccess(route, "student", "pending"), true, `${route} pendente`);
  }
  assert.equal(routes.canAccess("triage", "donor", "active"), false);
  assert.equal(rules.inactiveAccountNotice("collector", "active"), null);
  assert.match(rules.inactiveAccountNotice("collector", "pending").body, /triagem e entrega/);
  assert.match(rules.inactiveAccountNotice("donor", "pending").body, /doações/);
  assert.equal(rules.inactiveAccountNotice("student", "blocked").title, "Conta bloqueada");
});

test("detalhe da solicitação continua consultável por conta não ativa, mas as ações exigem conta ativa", () => {
  assert.equal(routes.requiresActiveAccount("request-detail"), false);
  for (const [role, status] of [["student", "pending"], ["student", "blocked"], ["collector", "pending"], ["collector", "blocked"]]) {
    assert.equal(routes.canAccess("request-detail", role, status), true, `${role} ${status} consulta`);
    // A mesma regra usada pela tela e por AppStore.advanceRequest/cancelRequest.
    assert.notEqual(rules.inactiveAccountNotice(role, status), null, `${role} ${status} sem ações`);
  }
  for (const role of ["student", "collector"]) {
    assert.equal(rules.inactiveAccountNotice(role, "active"), null, `${role} ativo mantém ações`);
  }
  assert.equal(routes.canAccess("request-detail", "donor", "active"), false);
});

test("login Google ignora somente a recusa de papel já definido em claim_initial_role", () => {
  // Recusa esperada: a RPC faz raise exception 'NOT_ALLOWED' (SQLSTATE P0001).
  assert.equal(errors.isRoleAlreadyClaimedError({ message: "NOT_ALLOWED", code: "P0001" }), true);
  assert.equal(errors.isRoleAlreadyClaimedError(new Error("NOT_ALLOWED")), true);
  // Erros reais devem chegar ao tratamento de erro e ser exibidos.
  const realErrors = [
    { message: "permission denied for function claim_initial_role", code: "42501" },
    { message: 'new row violates row-level security policy for table "profiles"', code: "42501" },
    { message: "NOT_ALLOWED", code: "42501" },
    { message: "NOT_ALLOWED: outro motivo", code: "P0001" },
    { message: "BUSINESS_RULE: Perfil inválido.", code: "P0001" },
    new Error("Network request failed"),
    { message: "Could not find the function public.claim_initial_role in the schema cache", code: "PGRST202" },
  ];
  for (const error of realErrors) {
    assert.equal(errors.isRoleAlreadyClaimedError(error), false, JSON.stringify(error.message));
  }
  // Os erros de permissão continuam com a mensagem amigável já existente.
  assert.equal(errors.friendlyErrorMessage(realErrors[0]), "Você não tem permissão para esta ação.");
  assert.equal(errors.friendlyErrorMessage(realErrors[1]), "Você não tem permissão para esta ação.");
});

test("triagem considera doações agendadas e recebidas como pendentes", () => {
  assert.deepEqual(rules.donationStatusesAwaitingTriage, ["received", "scheduled"]);
  assert.equal(rules.isAwaitingTriage("scheduled"), true);
  assert.equal(rules.isAwaitingTriage("received"), true);
  for (const status of ["approved", "rejected", "stocked"]) {
    assert.equal(rules.isAwaitingTriage(status), false);
  }
  const awaiting = seed.seedDonations.filter((d) => rules.isAwaitingTriage(d.status)).length;
  assert.ok(awaiting > seed.seedDonations.filter((d) => d.status === "received").length);
});

const deliveredWith = (id, items, deliveredAt) => ({
  request: { id, status: "delivered", items },
  delivery: { requestId: id, deliveredAt },
});

test("limite anual: até 2 camisas e 1 kit entregues em 12 meses móveis", () => {
  assert.deepEqual(rules.ANNUAL_LIMITS, { camisa: 2, kit: 1 });
  const now = new Date("2026-11-09T12:00:00Z");
  const recent = deliveredWith("r1", [{ category: "camisa", quantityApproved: 1 }, { category: "kit", quantityApproved: 1 }], "2026-05-01T10:00:00Z");
  const old = deliveredWith("r0", [{ category: "camisa", quantityApproved: 2 }], "2025-11-01T10:00:00Z");
  const input = (requestedItems) => ({
    requestedItems,
    previousRequests: [recent.request, old.request],
    previousDeliveries: [recent.delivery, old.delivery],
    now,
  });

  assert.equal(rules.evaluateAnnualLimit(input([{ category: "camisa", quantityRequested: 1 }])).allowed, true);
  const twoShirts = rules.evaluateAnnualLimit(input([{ category: "camisa", quantityRequested: 2 }]));
  assert.equal(twoShirts.allowed, false);
  assert.deepEqual(twoShirts.blockedCategories, [{ category: "camisa", limit: 2, used: 1, requested: 2 }]);
  assert.equal(rules.evaluateAnnualLimit(input([{ category: "kit", quantityRequested: 1 }])).allowed, false);
  assert.equal(rules.evaluateAnnualLimit(input([{ category: "calca", quantityRequested: 5 }])).allowed, true);
  // Itens repetidos da mesma categoria somam.
  assert.equal(
    rules.evaluateAnnualLimit(input([{ category: "camisa", quantityRequested: 1 }, { category: "camisa", quantityRequested: 1 }])).allowed,
    false,
  );
});

test("limite anual ignora pedidos não entregues e entregas fora da janela", () => {
  const now = new Date("2026-11-09T12:00:00Z");
  const cancelled = { id: "c1", status: "cancelled", items: [{ category: "kit", quantityApproved: 1 }] };
  const exactlyTwelveMonths = deliveredWith("r2", [{ category: "kit", quantityApproved: 1 }], "2025-11-09T12:00:00Z");
  const result = rules.evaluateAnnualLimit({
    requestedItems: [{ category: "kit", quantityRequested: 1 }],
    previousRequests: [cancelled, exactlyTwelveMonths.request],
    previousDeliveries: [exactlyTwelveMonths.delivery],
    now,
  });
  assert.equal(result.allowed, true);
});

test("create_request no servidor aplica o mesmo limite anual do domínio", () => {
  const sql = fs.readFileSync(
    path.join(projectRoot, "supabase/migrations/20261109130000_annual_request_limit.sql"),
    "utf8",
  );
  assert.match(sql, /\('camisa', 2, 'camisas'\), \('kit', 1, 'kit escolar'\)/);
  assert.match(sql, /interval '12 months'/);
  assert.match(sql, /interval '6 months'/);
  assert.match(sql, /r\.status = 'delivered'/);
  assert.match(sql, /sum\(ri\.quantity_approved\)/);
});

test("CadÚnico obrigatório: matrícula validada sem CadÚnico não solicita", () => {
  assert.match(rules.enrollmentEligibilityIssue(null), /declaração de matrícula/);
  assert.match(rules.enrollmentEligibilityIssue({ status: "pending", hasCadUnico: true }), /declaração de matrícula/);
  assert.match(rules.enrollmentEligibilityIssue({ status: "verified" }), /CadÚnico/);
  assert.match(rules.enrollmentEligibilityIssue({ status: "verified", hasCadUnico: false }), /CadÚnico/);
  assert.equal(rules.enrollmentEligibilityIssue({ status: "verified", hasCadUnico: true }), null);
  // O modo demonstração continua apto a solicitar.
  assert.equal(rules.enrollmentEligibilityIssue(seed.demoEnrollment), null);
});

test("servidor exige CadÚnico na submissão de matrícula e na solicitação", () => {
  const sql = fs.readFileSync(
    path.join(projectRoot, "supabase/migrations/20261109140000_require_cadunico.sql"),
    "utf8",
  );
  assert.match(sql, /add column if not exists cadunico_document_path text/);
  assert.match(sql, /drop function if exists public\.submit_enrollment\(text, text, text, text, text\)/);
  assert.match(sql, /p_cadunico_document_path text/);
  assert.match(sql, /Anexe a folha resumo do CadÚnico/);
  assert.match(sql, /v_enrollment\.cadunico_document_path is null/);
  assert.match(sql, /grant execute on function public\.submit_enrollment\(text, text, text, text, text, text\) to authenticated/);
  // A solicitação mantém a carência e o limite anual.
  assert.match(sql, /interval '6 months'/);
  assert.match(sql, /\('camisa', 2, 'camisas'\), \('kit', 1, 'kit escolar'\)/);
});

test("revisão de matrícula pela equipe exige motivo para recusar e os dois documentos para validar", () => {
  const complete = { documentPath: "u/matricula-1.jpg", cadUnicoPath: "u/cadunico-1.jpg" };
  assert.equal(rules.enrollmentReviewIssue("verify", complete, ""), null);
  assert.match(rules.enrollmentReviewIssue("verify", { ...complete, cadUnicoPath: null }, ""), /CadÚnico/);
  assert.match(rules.enrollmentReviewIssue("verify", { ...complete, documentPath: null }, ""), /declaração/);
  assert.match(rules.enrollmentReviewIssue("reject", complete, "   "), /motivo/);
  assert.equal(rules.enrollmentReviewIssue("reject", complete, "Declaração ilegível."), null);
  assert.equal(rules.REVIEW_NOTE_MAX_LENGTH, 300);
});

test("nomes legíveis para os documentos enviados no cadastro e na matrícula", () => {
  assert.equal(rules.documentFileLabel("uid/matricula-1731000000000.jpg"), "Declaração de matrícula");
  assert.equal(rules.documentFileLabel("uid/cadunico-1731000000000.jpg"), "Folha resumo do CadÚnico");
  assert.equal(rules.documentFileLabel("uid/0-documento-com-foto.jpg"), "Documento com foto");
  assert.equal(rules.documentFileLabel("uid/1-cnh-categoria-b.jpg"), "CNH categoria B");
  assert.equal(rules.documentFileLabel("uid/comprovante-vinculo.jpg"), "Comprovante de vínculo com a instituição");
  assert.equal(rules.documentFileLabel("uid/outro-arquivo.jpg"), "Outro arquivo");
  assert.equal(rules.documentFileLabel("uid/.jpg"), "Documento");
});

test("tela de validações é só da equipe ativa", () => {
  assert.equal(routes.canAccess("reviews", "collector", "active"), true);
  assert.equal(routes.canAccess("reviews", "collector", "pending"), false);
  assert.equal(routes.canAccess("reviews", "student", "active"), false);
  assert.equal(routes.canAccess("reviews", "donor", "active"), false);
  assert.equal(seed.demoPendingReviews.enrollments.length > 0, true);
  for (const review of seed.demoPendingReviews.enrollments) {
    assert.equal(rules.enrollmentReviewIssue("verify", review, ""), null);
  }
});

test("servidor: revisão pela equipe com coletor ativo e leitura restrita dos documentos", () => {
  const sql = fs.readFileSync(
    path.join(projectRoot, "supabase/migrations/20261110120000_team_review.sql"),
    "utf8",
  );
  for (const fn of ["list_pending_enrollments", "list_pending_collectors", "review_enrollment", "review_collector", "can_review_documents_of"]) {
    assert.ok(sql.includes(`function public.${fn}(`), fn);
    assert.ok(new RegExp(`revoke execute on function public[.]${fn}[(][^)]*[)] from public, anon`).test(sql), fn);
  }
  assert.equal((sql.match(/if not public\.is_collector\(\) then/g) ?? []).length, 4);
  assert.match(sql, /set search_path = ''/);
  // Documentos: só leitura, só do bucket documents, só de quem tem revisão pendente.
  assert.match(sql, /on storage\.objects for select to authenticated/);
  assert.doesNotMatch(sql, /on storage\.objects for (insert|update|delete|all)/);
  assert.match(sql, /e\.is_active and e\.status = 'pending'/);
  assert.match(sql, /p\.role = 'collector' and p\.status = 'pending'/);
  // Validar exige declaração e CadÚnico; recusar exige motivo; sem autoaprovação.
  assert.match(sql, /document_path is null or v_enrollment\.cadunico_document_path is null/);
  assert.match(sql, /Informe o motivo da recusa/);
  assert.match(sql, /p_profile_id = auth\.uid\(\)/);
  assert.match(sql, /v_enrollment\.student_id = auth\.uid\(\)/);
});

test("links de e-mail: redefinir senha e confirmação de cadastro", () => {
  assert.deepEqual(authLinks.parseAuthLink("sosestudante://auth/reset?code=abc123"), { kind: "reset", code: "abc123" });
  assert.deepEqual(authLinks.parseAuthLink("exp://192.168.0.2:8081/--/auth/reset?code=x%2By"), { kind: "reset", code: "x+y" });
  assert.deepEqual(authLinks.parseAuthLink("sosestudante://auth/callback/?code=c1"), { kind: "callback", code: "c1" });
  const expired = authLinks.parseAuthLink(
    "sosestudante://auth/reset#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid",
  );
  assert.equal(expired.kind, "reset");
  assert.match(expired.error, /expirou/);
  // O texto do provedor não chega ao usuário.
  assert.doesNotMatch(expired.error, /Email link/);
  assert.match(authLinks.parseAuthLink("sosestudante://auth/reset").error, /inválido/);
  assert.equal(authLinks.parseAuthLink("sosestudante://dashboard"), null);
  assert.equal(authLinks.parseAuthLink("sosestudante://auth/resetx?code=1"), null);
  assert.equal(authLinks.parseAuthLink(null), null);
  // A tela da nova senha não é pública: exige a sessão aberta pelo link.
  assert.equal(routes.publicRoutes.includes("new-password"), false);
  assert.equal(routes.canAccess("new-password", "student", "pending"), true);
});

test("reserva de estoque na aprovação: saldo livre = estoque − pedidos aprovados não entregues", () => {
  const item = (category, size, requested, approved = 0) => ({ category, size, quantityRequested: requested, quantityApproved: approved });
  const requests = [
    { id: "a", status: "approved", items: [item("camisa", "M", 2, 2)] },
    { id: "b", status: "ready", items: [item("camisa", "G", 1, 1)] },
    { id: "c", status: "delivered", items: [item("camisa", "M", 5, 5)] },
    { id: "d", status: "in_review", items: [item("camisa", "P", 3, 0)] },
  ];
  assert.deepEqual(rules.reservedStockByCategory(requests), { camisa: 3 });
  assert.deepEqual(rules.reservedStockByCategory(requests, "a"), { camisa: 1 });
  // Estoque 4 com 3 reservados: o novo pedido de 2 camisas leva 1.
  const allocated = rules.allocateApprovedQuantities([item("camisa", "M", 2)], { camisa: 4 }, { camisa: 3 });
  assert.equal(allocated[0].quantityApproved, 1);
  // Dois itens da mesma categoria dividem o saldo na ordem do servidor (tamanho).
  const split = rules.allocateApprovedQuantities([item("camisa", "P", 2), item("camisa", "G", 2)], { camisa: 3 }, {});
  assert.deepEqual(split.map((i) => i.quantityApproved), [1, 2]);
  // Sem saldo: tudo zero (o servidor recusa a aprovação).
  assert.deepEqual(rules.allocateApprovedQuantities([item("kit", "Único", 1)], { kit: 1 }, { kit: 1 }).map((i) => i.quantityApproved), [0]);
});

test("servidor: aprovação reserva estoque e pronto confere de novo (migration 20261110130000)", () => {
  const sql = fs.readFileSync(
    path.join(projectRoot, "supabase/migrations/20261110130000_reserve_stock_on_approval.sql"),
    "utf8",
  );
  assert.match(sql, /r\.status in \('approved', 'separating', 'ready'\)/);
  assert.match(sql, /revoke execute on function public\.reserved_stock\(text, uuid\) from public, anon, authenticated/);
  assert.match(sql, /for update;/);
  assert.match(sql, /Sem estoque disponível para aprovar/);
  assert.match(sql, /O estoque atual não cobre as reservas/);
  assert.match(sql, /if not public\.is_collector\(\) then/);
});

test("código de retirada: só o estudante gera um novo e as tentativas voltam a zero", () => {
  assert.equal(rules.PICKUP_CODE_MAX_ATTEMPTS, 5);
  const sql = fs.readFileSync(
    path.join(projectRoot, "supabase/migrations/20261110140000_regenerate_pickup_code.sql"),
    "utf8",
  );
  assert.match(sql, /public\.current_role_is\('student'\)/);
  assert.match(sql, /student_id = auth\.uid\(\)/);
  assert.match(sql, /v_req\.status not in \('approved', 'separating', 'ready'\)/);
  assert.match(sql, /failed_attempts = 0/);
  assert.match(sql, /revoke execute on function public\.regenerate_pickup_code\(uuid\) from public, anon/);
  // confirm_delivery continua bloqueando após 5 erros.
  const hardening = fs.readFileSync(
    path.join(projectRoot, "supabase/migrations/20261106120000_harden_operational_security.sql"),
    "utf8",
  );
  assert.match(hardening, /failed_attempts >= 5/);
});

test("agendamento respeita os dias e horários do ponto e usa a data local", () => {
  assert.deepEqual(schedule.parseOpeningHours("Seg–Sex 7h–18h"), { days: [1, 2, 3, 4, 5], openHour: 7, closeHour: 18 });
  assert.deepEqual(schedule.parseOpeningHours("Ter–Sáb 9h–16h"), { days: [2, 3, 4, 5, 6], openHour: 9, closeHour: 16 });
  assert.deepEqual(schedule.parseOpeningHours("seg a sex, 07:30 às 12h").days, [1, 2, 3, 4, 5]);
  assert.equal(schedule.parseOpeningHours("Seg a Sex 07:30 - 12h").openHour, 7.5);
  assert.deepEqual(schedule.parseOpeningHours("Sex–Seg 8h–12h").days, [5, 6, 0, 1]);
  assert.equal(schedule.parseOpeningHours("Horário a combinar"), null);
  assert.equal(schedule.parseOpeningHours("Seg–Sex 18h–7h"), null);
  // Horários: início dentro do funcionamento, com 1h antes de fechar.
  assert.deepEqual(schedule.slotTimesFor(schedule.parseOpeningHours("Ter–Sáb 9h–16h")), ["09:00", "11:00", "14:00"]);
  assert.deepEqual(schedule.slotTimesFor(null), ["09:00", "11:00", "14:00", "16:00"]);
  // Sexta, 10/07/2026: ponto "Seg–Sex" não oferece sábado nem domingo.
  const days = schedule.donationDays(new Date(2026, 6, 10, 23, 30), schedule.parseOpeningHours("Seg–Sex 7h–18h"), 3);
  assert.deepEqual(days.map(schedule.localDateKey), ["2026-07-13", "2026-07-14", "2026-07-15"]);
  // Sem horário legível: segunda a sábado, como antes.
  const fallback = schedule.donationDays(new Date(2026, 6, 10), null, 2);
  assert.deepEqual(fallback.map(schedule.localDateKey), ["2026-07-11", "2026-07-13"]);
  assert.equal(schedule.localDateKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("documentos da conta: chaves estáveis e reconhecimento dos nomes antigos do cadastro", () => {
  assert.deepEqual(documents.ACCOUNT_DOCUMENTS.student.map((d) => d.key), ["documento-com-foto"]);
  assert.deepEqual(documents.ACCOUNT_DOCUMENTS.collector.map((d) => d.key), ["documento-com-foto", "cnh-categoria-b", "comprovante-vinculo"]);
  assert.equal(documents.accountDocumentPath("u1", "cnh-categoria-b"), "u1/cnh-categoria-b.jpg");
  const uploaded = documents.uploadedAccountDocuments([
    "u1/0-documento-com-foto.jpg",
    "u1/2-comprovante-de-v-nculo-com-a-institui-o.jpg",
    "u1/matricula-123.jpg",
  ]);
  assert.deepEqual(uploaded.sort(), ["comprovante-vinculo", "documento-com-foto"]);
  assert.deepEqual(documents.missingAccountDocuments("collector", uploaded).map((d) => d.key), ["cnh-categoria-b"]);
  assert.deepEqual(documents.missingAccountDocuments("donor", uploaded), []);
});

test("Meus documentos fica disponível para conta pendente (coletor envia antes da aprovação)", () => {
  assert.equal(routes.canAccess("documents", "collector", "pending"), true);
  assert.equal(routes.canAccess("documents", "student", "active"), true);
  assert.equal(routes.publicRoutes.includes("documents"), false);
});

test("botão Google só com o provedor habilitado no Supabase", () => {
  assert.equal(authLinks.isAuthProviderEnabled({ external: { google: true, email: true } }, "google"), true);
  assert.equal(authLinks.isAuthProviderEnabled({ external: { google: false, email: true } }, "google"), false);
  assert.equal(authLinks.isAuthProviderEnabled({ external: { google: "true" } }, "google"), false);
  assert.equal(authLinks.isAuthProviderEnabled({}, "google"), false);
  assert.equal(authLinks.isAuthProviderEnabled(null, "google"), false);
});

test("login Google leva a completar o cadastro com os mesmos dados (CPF, RG, documentos)", () => {
  const google = { role: "student", fullName: "Aluna Google" };
  // Só conta criada pelo Google cai em Completar cadastro.
  assert.equal(rules.needsProfileCompletion(google, "google"), true);
  // Conta criada por e-mail (inclusive antiga, sem CPF) entra direto no usuário.
  assert.equal(rules.needsProfileCompletion(google, "email"), false);
  assert.equal(rules.needsProfileCompletion(google, null), false);
  assert.deepEqual(rules.missingProfileFields(google), ["CPF", "RG", "data de nascimento", "telefone", "CEP", "endereço"]);
  const company = { role: "donor", donorKind: "company", phone: "11999990000", postalCode: "01001000", address: "Rua A" };
  assert.deepEqual(rules.missingProfileFields(company), ["CNPJ"]);
  const complete = { role: "donor", document: "11144477735", rg: "123456789", phone: "11999990000", postalCode: "01001000", address: "Rua A" };
  assert.equal(rules.needsProfileCompletion(complete, "google"), false);
  assert.deepEqual(rules.missingProfileFields(complete), []);
  // Os perfis da demonstração estão completos ou ficam fora do redirecionamento.
  assert.equal(validation.isValidRg("12.345.678-X"), true);
  assert.equal(validation.isValidRg("MG-12.345.678"), true);
  assert.equal(validation.isValidRg("123"), false);
  assert.equal(validation.normalizeRg("12.345.678-x"), "12345678X");
  assert.equal(routes.publicRoutes.includes("complete-profile"), false);
  assert.equal(routes.canAccess("complete-profile", "collector", "pending"), true);
});

test("servidor: complete_profile grava uma única vez e exige RG de pessoa física", () => {
  const sql = fs.readFileSync(
    path.join(projectRoot, "supabase/migrations/20261110150000_complete_profile.sql"),
    "utf8",
  );
  assert.match(sql, /add column if not exists rg text/);
  assert.match(sql, /if v_profile\.document is not null then/);
  assert.match(sql, /Informe o número do RG/);
  assert.match(sql, /revoke execute on function public\.complete_profile\(text, text, text, date, text, text, text, text\) from public, anon/);
  assert.match(sql, /new\.raw_user_meta_data ->> 'rg'/);
});

test("layout responsivo: colunas pela largura útil", () => {
  // Antes de medir, mantém as 2 colunas do layout original.
  assert.equal(layout.gridColumns(0, 150, 12), 2);
  // Celular pequeno (320 dp − margens ≈ 288): 1 coluna para cartões de 150.
  assert.equal(layout.gridColumns(288, 150, 12), 1);
  // Celular padrão (≈ 360–412 dp − margens): 2 colunas.
  assert.equal(layout.gridColumns(343, 150, 12), 2);
  // Tablet (conteúdo limitado a 640 − margens = 608): 3 colunas; limite respeitado.
  assert.equal(layout.gridColumns(608, 150, 12), 3);
  assert.equal(layout.gridColumns(2000, 150, 12, 4), 4);
  assert.equal(layout.gridItemWidth(343, 2, 12), 165.5);
  assert.equal(layout.windowClass(320), "compact");
  assert.equal(layout.windowClass(390), "regular");
  assert.equal(layout.windowClass(800), "wide");
});

test("RG aparece mascarado em Dados pessoais", () => {
  assert.equal(format.maskRg("12345678X"), "******78X");
  assert.equal(format.maskRg("MG12"), "*G12");
  assert.equal(format.maskRg(undefined), "—");
});

test("voltar: sem histórico (aberta pela barra inferior) leva ao Início", () => {
  assert.equal(routes.backTarget("request", true), "history");
  assert.equal(routes.backTarget("request", false), "home");
  assert.equal(routes.backTarget("profile", false), "home");
  assert.equal(routes.backTarget("dashboard", false), null);
  assert.equal(routes.backTarget("login", false), null);
});

test("Expo Go: retorno do login usa exp:// (sosestudante:// só no app instalado)", () => {
  assert.equal(authLinks.expoGoRedirectUrl("exp://192.168.0.5:8081", "auth/callback"), "exp://192.168.0.5:8081/--/auth/callback");
  assert.equal(authLinks.expoGoRedirectUrl("exp://192.168.0.5:8081/--/dashboard?x=1", "auth/reset"), "exp://192.168.0.5:8081/--/auth/reset");
  assert.equal(authLinks.expoGoRedirectUrl("exps://u.expo.dev/abc", "/auth/callback"), "exps://u.expo.dev/abc/--/auth/callback");
  assert.equal(authLinks.expoGoRedirectUrl("sosestudante://dashboard", "auth/callback"), null);
  assert.equal(authLinks.expoGoRedirectUrl(null, "auth/callback"), null);
  // O link que volta pelo Expo Go continua sendo reconhecido.
  assert.deepEqual(authLinks.parseAuthLink("exp://192.168.0.5:8081/--/auth/callback?code=abc"), { kind: "callback", code: "abc" });
});

test("busca por raio: só pontos dentro do raio, do mais perto para o mais longe (CA01)", () => {
  const casa = { latitude: -23.5505, longitude: -46.6333 };
  const perto = { id: "a", latitude: -23.5415, longitude: -46.6333 }; // ~1 km
  const medio = { id: "b", latitude: -23.5235, longitude: -46.6333 }; // ~3 km
  const longe = { id: "c", latitude: -23.4605, longitude: -46.6333 }; // ~10 km
  const r = pointSearch.pointsWithinRadius([longe, medio, perto], casa, 5);
  assert.deepEqual(r.map((x) => x.point.id), ["a", "b"]);
  assert.ok(r[0].distanceKm < r[1].distanceKm);
  assert.deepEqual(pointSearch.pointsWithinRadius([longe], casa, 20).map((x) => x.point.id), ["c"]);
  assert.equal(pointSearch.DEFAULT_RADIUS_KM, 5);
});

test("sem resultados no raio: sugere expandir para o raio que alcança o ponto mais próximo (CA02)", () => {
  const casa = { latitude: -23.5505, longitude: -46.6333 };
  const longe = { latitude: -23.4605, longitude: -46.6333 }; // ~10 km
  const m = pointSearch.emptyRadiusMessage([longe], casa, 2, "home");
  assert.equal(m.title, "Nenhum ponto até 2 km da sua casa");
  assert.equal(m.suggestedRadiusKm, 20);
  assert.match(m.body, /Amplie a busca para 20 km/);
  assert.equal(pointSearch.nextRadiusKm(5), 10);
  assert.equal(pointSearch.nextRadiusKm(20), null);
  const nada = pointSearch.emptyRadiusMessage([{ latitude: -22.9, longitude: -43.2 }], casa, 20, "school");
  assert.equal(nada.suggestedRadiusKm, null);
  assert.match(nada.title, /da sua escola/);
});

test("origem casa/escola: monta o endereço para o geocodificador do aparelho", () => {
  assert.equal(pointSearch.homeGeocodeQuery("Rua das Palmeiras, 88", "02145010"), "Rua das Palmeiras, 88, 02145-010, Brasil");
  assert.equal(pointSearch.homeGeocodeQuery("  ", "02145010"), null);
  assert.equal(pointSearch.schoolGeocodeQuery("EMEF João Paulo II", "0214"), "EMEF João Paulo II, Brasil");
  assert.equal(pointSearch.schoolGeocodeQuery(undefined, "02145010"), null);
});
