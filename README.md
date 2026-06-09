# GreenTrack

> Solução desenvolvida para o Desafio 3 — ImpactLedger · Hackathon Web3 RESTIC 36

---

## Sobre o desafio

Desafio oficial **ImpactLedger** do Hackathon Web3 RESTIC 36.

A proposta é construir uma solução baseada em blockchain capaz de **registrar, validar e certificar ações de impacto social e ambiental** de forma auditável, transparente e imutável.

---

## Objetivo

O **GreenTrack** registra lotes de materiais recicláveis processados por recicladoras com **balanço de massa reconciliado on-chain** (entrada → reciclado + rejeito + perda), permite que auditores aprovados validem os dados on-chain e emite automaticamente **NFTs Selos Verdes** (ERC-721) para empresas apoiadoras a cada meta de kg **reciclados** validados.

```
Recicladora  →  cadastrarCooperativa()      →  COOPERATIVA_ROLE automático
Recicladora  →  registrarEntrada()          →  fase 1: pesa o recebido (RECEBIDO)
Recicladora  →  registrarProcessamento()    →  fase 2: reciclado/rejeito; o contrato exige
                                                reciclado + rejeito ≤ entrada (PROCESSADO)
Auditor      →  validarLote()                →  acumula o RECICLADO on-chain por empresa
Contrato     →  emitirSelo()                 →  NFT ERC-721 automático ao atingir a meta
ADM          →  aprovarAuditor()             →  governa papéis e regras da plataforma
```

---

## Funcionalidades

- Cadastro de cooperativas com auto-permissão na blockchain
- Solicitação de auditores com aprovação pelo administrador
- Registro de pesagens com upload de evidências (fotos) no IPFS
- Validação ou rejeição de pesagens por auditores aprovados
- Emissão automática de NFT Selo Verde ao atingir meta de kg
- Painel administrativo com governança de papéis e regras
- Dashboard público com métricas em tempo real da blockchain
- Certificado público por empresa com QR Code verificável
- Controle de acesso por roles (ADM, Auditor, Cooperativa) via OpenZeppelin AccessControl

---

## Contratos na Ethereum Sepolia

| Contrato | Endereço |
|---|---|
| RecyclingLedger | `0xd9496CEBb2C579185A15c8d6d98D5Da9dfD7BE90` |
| GreenSeal (ERC-721) | `0x373b2FAF5733B6e5A50f5BF09663Cf33DE73191F` |

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Smart Contracts | Solidity ^0.8.24, Hardhat, OpenZeppelin v5 |
| Rede | Ethereum Sepolia Testnet (chainId 11155111) |
| Armazenamento | IPFS via Pinata |
| Frontend | Next.js 16 (App Router), Tailwind CSS v4 |
| Web3 | Ethers.js v6, MetaMask |
| Testes | Mocha + Chai + hardhat-chai-matchers |

---

## Telas

| Rota | Descrição | Acesso |
|---|---|---|
| `/` | Landing page — hero, métricas e como funciona | Público |
| `/dashboard` | Dashboard público — métricas, ranking, selos e QR Codes | Público |
| `/verify/[chainId]/[contractAddress]/[tokenId]` | Verificação pública de um Selo Verde via QR Code | Público |
| `/login` | Conecta MetaMask, detecta role e redireciona | Público |
| `/cadastro/cooperativa` | Auto-registro de cooperativa na blockchain | Público |
| `/cadastro/auditor` | Solicitação de acesso como auditor | Público |
| `/admin` | Governança — auditores, cooperativas, empresas, meta | ADM |
| `/cooperativa` | Histórico de pesagens e selos emitidos | Cooperativa |
| `/cooperativa/pesagem` | Formulário de nova pesagem com upload IPFS | Cooperativa |
| `/auditor` | Pesagens pendentes para validar ou rejeitar | Auditor |
| `/empresa/[id]` | Certificado de impacto público com QR Code | Público |

---

## Estrutura do projeto

```
greentrack/
├── contracts/
│   ├── RecyclingLedger.sol     # Registro, validação, papéis e governança
│   ├── GreenSeal.sol           # NFT ERC-721 Selo Verde
│   └── MockGreenSeal.sol       # Mock para testes
├── scripts/
│   ├── deploy.js               # Deploy de ambos os contratos + copia ABIs
│   ├── grant-role.js           # Concessão manual de papéis
│   └── seed.js                 # Dados de demonstração
├── test/
│   ├── RecyclingLedger.test.js
│   └── GreenSeal.test.js
├── frontend/
│   ├── app/
│   │   ├── page.jsx                        # Landing page
│   │   ├── dashboard/page.jsx              # Dashboard público
│   │   ├── verify/[chainId]/[contractAddress]/[tokenId]/page.jsx  # Verificação do QR Code
│   │   ├── login/page.jsx                  # Login com MetaMask
│   │   ├── cadastro/
│   │   │   ├── cooperativa/page.jsx        # Cadastro de cooperativa
│   │   │   └── auditor/page.jsx            # Solicitação de auditor
│   │   ├── admin/page.jsx                  # Painel administrativo
│   │   ├── cooperativa/
│   │   │   ├── page.jsx                    # Painel da cooperativa
│   │   │   └── pesagem/page.jsx            # Nova pesagem
│   │   ├── auditor/page.jsx                # Painel do auditor
│   │   └── empresa/[id]/page.jsx           # Certificado público
│   ├── components/
│   │   ├── Providers.jsx        # Wrapper de contextos
│   │   ├── QRDisplay.jsx        # QR Code (URL de verificação)
│   │   └── SealCard.jsx         # Card do Selo Verde
│   ├── contexts/
│   │   └── WalletContext.jsx    # Estado global da carteira e roles
│   ├── lib/
│   │   ├── RecyclingLedgerABI.json
│   │   └── GreenSealABI.json
│   └── utils/
│       ├── contract.js          # Instâncias dos contratos
│       └── ipfs.js              # Upload para IPFS via Pinata
├── hardhat.config.js
├── .env.example
└── README.md
```

---

## Como executar

### Pré-requisitos

- Node.js >= 18
- MetaMask instalado no navegador
- Sepolia ETH de teste — obtenha em [sepoliafaucet.com](https://sepoliafaucet.com)
- Conta [Infura](https://app.infura.io) (RPC URL Sepolia)
- Conta [Pinata](https://pinata.cloud) (JWT para IPFS)

### 1. Instalar dependências

```bash
# Dependências do Hardhat (raiz)
npm install

# Dependências do frontend
cd frontend && npm install && cd ..
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env` na raiz:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/SEU_PROJECT_ID
PRIVATE_KEY=sua_chave_privada_sem_0x
PINATA_JWT=seu_jwt_pinata
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/SEU_PROJECT_ID
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Compilar os contratos

```bash
npm run compile
```

### 4. Rodar testes

```bash
npm test
```

### 5. Deploy na Sepolia

```bash
npm run deploy:sepolia
```

O script realiza automaticamente:
- Deploy do `GreenSeal`
- Deploy do `RecyclingLedger` (passando o endereço do GreenSeal)
- Autorização do Ledger no GreenSeal
- Cópia dos ABIs para `frontend/lib/`
- Salva endereços em `deployments.json`

Após o deploy, preencha o `frontend/.env.local`:

```env
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/SEU_PROJECT_ID
NEXT_PUBLIC_CONTRACT_LEDGER=0x... (RecyclingLedger)
NEXT_PUBLIC_CONTRACT_SEAL=0x...   (GreenSeal)
NEXT_PUBLIC_APP_URL=http://localhost:3000
PINATA_JWT=seu_jwt_pinata
```

### 6. Iniciar o frontend

```bash
cd frontend && npm run dev
```

Acesse `http://localhost:3000`

---

## Papéis (Roles)

| Role | Como obter | Permissões |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Carteira que fez o deploy | Aprovar/rejeitar auditores, bloquear cooperativas, configurar meta de kg, cadastrar empresas apoiadoras |
| `COOPERATIVA_ROLE` | Auto-cadastro em `/cadastro/cooperativa` | Registrar entrada e processamento de lotes |
| `AUDITOR_ROLE` | Solicitação aprovada pelo ADM | Validar e rejeitar lotes |

---

## Fluxo completo de demonstração

1. **ADM** acessa `/admin` e cadastra uma empresa apoiadora
2. **Recicladora** acessa `/cadastro/cooperativa`, conecta MetaMask e se registra
3. **Auditor** acessa `/cadastro/auditor` e solicita acesso
4. **ADM** aprova o auditor em `/admin`
5. **Recicladora** acessa `/cooperativa/pesagem` e registra a **entrada** do lote (fase 1, com foto da balança)
6. **Recicladora** registra o **processamento** do lote (fase 2: reciclado/rejeito + fotos) — o contrato valida o balanço
7. **Auditor** (carteira ≠ recicladora) acessa `/auditor` e valida o lote, conferindo o balanço de massa
8. Ao atingir a meta de kg **reciclados**, o **Selo Verde NFT** é emitido automaticamente
9. O certificado com QR Code e o balanço de massa ficam públicos em `/empresa/[id]` e `/verify/...`

---

## Requisitos atendidos

- [x] Blockchain pública (Ethereum Sepolia)
- [x] Registro auditável com eventos on-chain e evidências IPFS
- [x] Smart contracts funcionais (RecyclingLedger + GreenSeal ERC-721)
- [x] Controle de acesso por roles (OpenZeppelin AccessControl)
- [x] Governança administrativa (aprovação, bloqueio, configuração)
- [x] Dashboard público sem necessidade de login
- [x] Certificado verificável por QR Code
- [x] Frontend completo integrado com MetaMask
- [ ] Vídeo-pitch

---

## Equipe

| Nome | GitHub |
|---|---|
| Jonathan Campoi | [@Jonat37](https://github.com/Jonat37) |
