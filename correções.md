# Correções — GreenTrack / ImpactLedger

Arquivo de correções baseado no `CLAUDE.md` do projeto GreenTrack / ImpactLedger para o Desafio 3 HackWeb.

## 1. Diagnóstico geral

O projeto está bem estruturado como roteiro de geração, mas ainda precisa ser transformado em um MVP funcional. O arquivo atual descreve a stack, a estrutura de pastas esperada, os contratos, os testes, os scripts, os componentes e as páginas, porém parte relevante ainda está como especificação/prompt e não como implementação final.

Principais pontos de atenção:

- O documento está incompleto na seção das páginas Next.js.
- Falta garantir métricas globais no contrato.
- Falta proteger o token da Pinata.
- Falta melhorar a rastreabilidade pública do selo.
- Falta validar rede da carteira no frontend.
- Falta ajustar a emissão e leitura do ID da pesagem.
- Falta completar README, CI/CD e evidências de entrega.

---

## 2. Correções obrigatórias por prioridade

### Prioridade 1 — Completar o documento `CLAUDE.md`

O arquivo atual para no começo da seção `PÁGINA 2: frontend/app/cooperativa/page.jsx`. É necessário completar os prompts das páginas restantes.

Adicionar ao `CLAUDE.md`:

- `frontend/app/cooperativa/page.jsx`
- `frontend/app/auditor/page.jsx`
- `frontend/app/empresa/[id]/page.jsx`
- `README.md final`
- `.github/workflows/ci.yml`

#### Correção sugerida

Completar o `PROMPT 09` com as 4 páginas e adicionar um `PROMPT 10` para README e CI/CD.

---

### Prioridade 2 — Transformar o roteiro em código real

O `CLAUDE.md` funciona como guia, mas o projeto precisa conter os arquivos implementados.

Arquivos mínimos que precisam existir:

```txt
greentrack/
├── contracts/
│   ├── RecyclingLedger.sol
│   └── GreenSeal.sol
├── scripts/
│   ├── deploy.js
│   └── seed.js
├── test/
│   ├── RecyclingLedger.test.js
│   └── GreenSeal.test.js
├── frontend/
│   ├── app/
│   │   ├── page.jsx
│   │   ├── cooperativa/page.jsx
│   │   ├── auditor/page.jsx
│   │   └── empresa/[id]/page.jsx
│   ├── components/
│   │   ├── PesagemForm.jsx
│   │   ├── AuditorPanel.jsx
│   │   ├── SealCard.jsx
│   │   └── QRDisplay.jsx
│   └── utils/
│       ├── ipfs.js
│       └── contract.js
├── hardhat.config.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── .github/workflows/ci.yml
```

---

## 3. Correções nos contratos Solidity

### 3.1. Adicionar validação de pesagem inexistente

Nas funções `validarPesagem` e `rejeitarPesagem`, adicionar validação para impedir IDs inválidos.

#### Implementação sugerida

```solidity
require(id > 0 && id <= totalPesagens, "Pesagem inexistente");
```

Aplicar em:

```solidity
function validarPesagem(uint256 id) external onlyRole(AUDITOR_ROLE) {
    require(id > 0 && id <= totalPesagens, "Pesagem inexistente");
    Pesagem storage p = pesagens[id];
    require(p.status == Status.PENDENTE, "Status invalido");
    ...
}

function rejeitarPesagem(uint256 id, string calldata motivo) external onlyRole(AUDITOR_ROLE) {
    require(id > 0 && id <= totalPesagens, "Pesagem inexistente");
    Pesagem storage p = pesagens[id];
    require(p.status == Status.PENDENTE, "Status invalido");
    ...
}
```

---

### 3.2. Criar total global de kg validados

O frontend quer exibir o total geral de kg validados, mas `mapping(string => uint256) kgPorEmpresa` não permite listar todas as empresas automaticamente.

#### Problema

Mappings em Solidity não são iteráveis. Então o dashboard não consegue somar `kgPorEmpresa` para todas as empresas sozinho.

#### Correção sugerida

Adicionar no contrato `RecyclingLedger.sol`:

```solidity
uint256 public totalKgValidadoGlobal;
string[] private empresas;
mapping(string => bool) private empresaRegistrada;
```

Atualizar ao validar pesagem:

```solidity
if (!empresaRegistrada[p.empresaId]) {
    empresaRegistrada[p.empresaId] = true;
    empresas.push(p.empresaId);
}

totalKgValidadoGlobal += p.pesoKg;
```

Adicionar função pública:

```solidity
function getEmpresas() external view returns (string[] memory) {
    return empresas;
}
```

---

### 3.3. Ajustar emissão do selo quando passar de múltiplos de 1000 kg

O contrato deve emitir selo quando a empresa atingir 1000 kg, 2000 kg, 3000 kg e assim por diante.

A lógica atual está boa conceitualmente, mas precisa garantir que o total usado na emissão seja o total validado da empresa.

#### Implementação sugerida

```solidity
function _verificarEmissaoSelo(string memory empresaId) internal {
    uint256 totalKg = kgPorEmpresa[empresaId];
    uint256 selosDevidos = totalKg / KG_PARA_SELO;
    uint256 selosEmitidos = greenSeal.totalSelosPorEmpresa(empresaId);

    if (selosDevidos > selosEmitidos) {
        greenSeal.emitirSelo(empresaId, totalKg);
    }
}
```

---

### 3.4. Decidir se o NFT ficará no contrato ou na carteira da empresa

No prompt atual, o selo é criado com:

```solidity
_mint(address(this), tokenId);
```

Isso faz o NFT ficar preso no próprio contrato.

#### Opção A — Manter como registro público

Manter `_mint(address(this), tokenId)` se o objetivo for apenas registrar o selo on-chain.

#### Opção B — Melhor para demonstração Web3

Emitir o NFT para a carteira da empresa.

Sugestão:

```solidity
function emitirSelo(address destinatario, string calldata empresaId, uint256 totalKg) external onlyLedger {
    uint256 tokenId = ++nextTokenId;
    string memory uri = string.concat("ipfs://greentrack/", empresaId, "/", Strings.toString(tokenId));

    _mint(destinatario, tokenId);
    _setTokenURI(tokenId, uri);

    totalSelosPorEmpresa[empresaId]++;
    seloEmpresa[tokenId] = empresaId;
    seloKg[tokenId] = totalKg;

    emit SeloEmitido(tokenId, empresaId, totalKg, uri);
}
```

Se seguir essa opção, será necessário ajustar também a interface `IGreenSeal` no `RecyclingLedger.sol`.

---

## 4. Correções no IPFS / Pinata

### 4.1. Remover `NEXT_PUBLIC_PINATA_JWT`

O `.env.example` atual prevê:

```env
NEXT_PUBLIC_PINATA_JWT=
```

Isso é inseguro, porque variáveis com `NEXT_PUBLIC_` ficam disponíveis no navegador.

#### Correção obrigatória

Remover:

```env
NEXT_PUBLIC_PINATA_JWT=
```

Manter apenas:

```env
PINATA_JWT=
```

---

### 4.2. Criar API Route para upload no IPFS

Em vez de enviar arquivos diretamente do navegador para a Pinata, criar uma rota interna no Next.js.

Estrutura sugerida:

```txt
frontend/app/api/ipfs/upload/route.js
frontend/app/api/ipfs/json/route.js
```

Fluxo seguro:

```txt
Frontend → API Route Next.js → Pinata
```

Dessa forma, o token da Pinata fica protegido no servidor.

---

### 4.3. Ajustar `frontend/utils/ipfs.js`

O frontend não deve chamar diretamente `https://api.pinata.cloud` com token público.

#### Novo fluxo sugerido

```js
export async function uploadArquivoIPFS(arquivo) {
  const formData = new FormData();
  formData.append("file", arquivo);

  const response = await axios.post("/api/ipfs/upload", formData);
  return response.data.cid;
}

export async function uploadJSONIPFS(objeto, nome) {
  const response = await axios.post("/api/ipfs/json", { objeto, nome });
  return response.data.cid;
}
```

---

## 5. Correções no frontend Web3

### 5.1. Validar rede Polygon Amoy

O frontend precisa verificar se a carteira está na rede correta.

Rede esperada:

```txt
Polygon Amoy
chainId: 80002
chainId hex: 0x13882
```

#### Correção sugerida em `conectarCarteira()`

```js
const AMOY_CHAIN_ID = "0x13882";

const currentChainId = await window.ethereum.request({ method: "eth_chainId" });

if (currentChainId !== AMOY_CHAIN_ID) {
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: AMOY_CHAIN_ID }],
  });
}
```

Também adicionar mensagem clara para o usuário:

```txt
Conecte sua carteira na rede Polygon Amoy para continuar.
```

---

### 5.2. Capturar corretamente o ID da pesagem

A função `registrarPesagem` não retorna o ID diretamente. O ID deve ser lido pelo evento `PesagemRegistrada`.

#### Correção sugerida

```js
const tx = await ledger.registrarPesagem(material, Number(pesoKg), cidJSON, empresaId);
const receipt = await tx.wait();

const event = receipt.logs
  .map((log) => {
    try {
      return ledger.interface.parseLog(log);
    } catch {
      return null;
    }
  })
  .find((parsed) => parsed && parsed.name === "PesagemRegistrada");

const id = event?.args?.id?.toString();
```

---

### 5.3. Melhorar tratamento de permissões

As telas de cooperativa e auditor devem verificar as permissões do usuário conectado.

Funções úteis:

```js
const COOPERATIVA_ROLE = await ledger.COOPERATIVA_ROLE();
const AUDITOR_ROLE = await ledger.AUDITOR_ROLE();
const isCooperativa = await ledger.hasRole(COOPERATIVA_ROLE, address);
const isAuditor = await ledger.hasRole(AUDITOR_ROLE, address);
```

Mensagens sugeridas:

```txt
Sua carteira não possui permissão de cooperativa para registrar pesagens.
```

```txt
Sua carteira não possui permissão de auditor para validar pesagens.
```

---

### 5.4. Melhorar página pública da empresa

A página `frontend/app/empresa/[id]/page.jsx` deve ser a principal prova pública do impacto.

Ela precisa exibir:

- ID da empresa.
- Total de kg validados.
- Total de pesagens validadas.
- Total de selos emitidos.
- Progresso para o próximo selo.
- Lista de pesagens validadas.
- Links das evidências no IPFS.
- Endereço dos contratos.
- Link para explorer da Polygon Amoy.

---

### 5.5. Corrigir dashboard público

O dashboard deve usar uma variável on-chain para total global.

Em vez de tentar somar mappings no frontend, usar:

```js
const totalKg = await ledger.totalKgValidadoGlobal();
```

Também exibir:

```js
const totalPesagens = await ledger.totalPesagens();
const totalSelos = await seal.nextTokenId();
```

---

## 6. Correções no componente `AuditorPanel`

### 6.1. Evitar carregar volume muito grande de pesagens no frontend

O prompt atual propõe iterar de 1 até `totalPesagens`. Para MVP funciona, mas pode ficar pesado.

#### Para MVP

Pode manter a iteração simples.

#### Melhor solução

Criar uma lista de pesagens pendentes no contrato:

```solidity
uint256[] private pesagensPendentes;
```

Ou emitir eventos e indexar fora da blockchain.

Para o desafio, a solução simples é aceitável, mas documentar como limitação no README.

---

### 6.2. Exibir evidências IPFS com clareza

Cada pesagem deve mostrar:

- material;
- peso;
- empresa;
- cooperativa;
- data/hora;
- status;
- link para metadados IPFS;
- link para foto da balança;
- link para foto dos fardos.

---

## 7. Correções no QR Code

### 7.1. QR Code deve apontar para página pública verificável

Formato correto:

```txt
${NEXT_PUBLIC_APP_URL}/empresa/${empresaId}
```

A página precisa carregar os dados reais do contrato, não dados mockados.

### 7.2. Melhorar download do QR

O botão “Baixar QR” precisa converter o SVG para PNG corretamente.

Alternativa mais simples para o MVP:

- baixar o SVG diretamente;
- ou usar `html-to-image` para gerar PNG.

---

## 8. Correções no `seed.js`

O script de seed registra 350 + 200 + 500 kg = 1050 kg. Isso deve emitir 1 selo.

Adicionar validações explícitas no final:

```js
const totalKg = await ledger.kgPorEmpresa("EMPRESA_ESG_001");
const totalSelos = await greenSeal.totalSelosPorEmpresa("EMPRESA_ESG_001");

if (totalKg.toString() !== "1050") {
  throw new Error("Total de kg incorreto");
}

if (totalSelos.toString() !== "1") {
  throw new Error("Selo não foi emitido corretamente");
}
```

---

## 9. Correções no README.md

O README final precisa vender o projeto e explicar como rodar.

Estrutura sugerida:

```md
# GreenTrack / ImpactLedger

## Problema

Cooperativas e empresas precisam comprovar impacto ambiental de forma confiável, auditável e transparente.

## Solução

GreenTrack registra pesagens de materiais recicláveis, permite validação por auditores e emite Selos Verdes em NFT quando a empresa atinge marcos de impacto.

## Funcionalidades

- Registro de pesagem pela cooperativa.
- Upload de evidências no IPFS.
- Validação/rejeição por auditor.
- Emissão automática de NFT a cada 1000 kg validados.
- Dashboard público.
- Página pública da empresa com QR Code.
- Deploy na Polygon Amoy.

## Arquitetura

Frontend Next.js → Smart Contracts Hardhat/Solidity → Polygon Amoy → IPFS/Pinata

## Como rodar localmente

...

## Como fazer deploy

...

## Contratos publicados

- RecyclingLedger: 0x...
- GreenSeal: 0x...

## Demonstração

- Link do app: ...
- Link do vídeo: ...
- Link do repositório: ...

## Próximos passos

- Indexador de eventos.
- Painel administrativo.
- NFT enviado para carteira da empresa.
- Integração com explorer.
```

---

## 10. Correções no CI/CD

Criar arquivo:

```txt
.github/workflows/ci.yml
```

Conteúdo sugerido:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  hardhat:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Compile contracts
        run: npm run compile

      - name: Run tests
        run: npm test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install frontend dependencies
        working-directory: frontend
        run: npm install

      - name: Build frontend
        working-directory: frontend
        run: npm run build
```

---

## 11. Checklist final de entrega

### Contratos

- [ ] `RecyclingLedger.sol` implementado.
- [ ] `GreenSeal.sol` implementado.
- [ ] Validação de ID inexistente adicionada.
- [ ] Total global de kg validado adicionado.
- [ ] Função `getEmpresas()` adicionada.
- [ ] Emissão de selo testada ao atingir 1000 kg.
- [ ] Testes Hardhat passando.

### Frontend

- [ ] Dashboard público funcionando.
- [ ] Tela da cooperativa funcionando.
- [ ] Tela do auditor funcionando.
- [ ] Página pública da empresa funcionando.
- [ ] QR Code gerando link correto.
- [ ] Upload IPFS funcionando via API segura.
- [ ] Rede Polygon Amoy validada na carteira.
- [ ] Erros tratados com mensagens claras.

### Segurança

- [ ] `NEXT_PUBLIC_PINATA_JWT` removido.
- [ ] `PINATA_JWT` usado apenas no servidor.
- [ ] `.env` no `.gitignore`.
- [ ] Permissões por role testadas.
- [ ] Auditor e cooperativa validados por carteira.

### Deploy

- [ ] Deploy local funcionando.
- [ ] Deploy Amoy funcionando.
- [ ] `deployments.json` gerado.
- [ ] Contratos verificados no explorer, se possível.
- [ ] Seed executando fluxo completo.

### Documentação

- [ ] README final criado.
- [ ] Prints adicionados.
- [ ] Link de demo adicionado.
- [ ] Link de vídeo adicionado.
- [ ] Limitações conhecidas documentadas.
- [ ] Próximos passos documentados.

---

## 12. Resumo executivo

O projeto GreenTrack / ImpactLedger tem uma boa base técnica e uma ideia forte para o desafio: registrar pesagens, validar evidências e emitir selo verde em NFT. Porém, para virar uma entrega competitiva, precisa deixar de ser apenas um roteiro de geração e se tornar um MVP funcional com contratos testados, frontend completo, QR Code verificável, upload IPFS seguro, deploy na Polygon Amoy e README bem apresentado.

As correções mais importantes são:

1. Completar as páginas Next.js faltantes.
2. Implementar os arquivos reais do projeto.
3. Remover exposição pública do token Pinata.
4. Criar métricas globais no contrato.
5. Corrigir leitura do ID da pesagem via evento.
6. Validar rede Polygon Amoy na carteira.
7. Criar README final e CI/CD.

