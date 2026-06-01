# GreenTrack — ImpactLedger

> Rastreabilidade de reciclagem na blockchain com emissão automática de NFTs de impacto ambiental.
> Desafio 3 — HackWeb

---

## Visão Geral

O GreenTrack permite que cooperativas registrem pesagens de materiais recicláveis, auditores validem os dados on-chain e empresas geradoras de resíduos acumulem certificações automáticas (NFTs Selos Verdes) a cada 1.000 kg reciclados validados.

### Fluxo Principal

```
Cooperativa → registrarPesagem() → IPFS (evidências)
Auditor     → validarPesagem()  → acumula kg
Contrato    → emitirSelo()      → NFT ERC-721 (a cada 1.000 kg)
```

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Smart Contracts | Solidity ^0.8.20, Hardhat, OpenZeppelin v5 |
| Rede | Polygon Amoy Testnet (chainId 80002) |
| Armazenamento | IPFS via Pinata |
| Frontend | Next.js 14, Tailwind CSS, Ethers.js v6 |
| Testes | Mocha + Chai + hardhat-chai-matchers |

---

## Pré-requisitos

- Node.js >= 18
- MetaMask com MATIC na rede Amoy
- Conta Pinata (para IPFS)
- RPC URL da Amoy (ex: via Alchemy ou Infura)

---

## Instalação

```bash
# Clonar o repositório
git clone <repo-url>
cd greentrack

# Instalar dependências do projeto Hardhat
npm install

# Instalar dependências do frontend
cd frontend && npm install && cd ..

# Copiar e preencher variáveis de ambiente
cp .env.example .env
```

Preencha o `.env` com suas credenciais:

```env
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=sua_chave_privada
PINATA_JWT=seu_jwt_pinata
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_CONTRACT_LEDGER=0x...
NEXT_PUBLIC_CONTRACT_SEAL=0x...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PINATA_JWT=seu_jwt_pinata
```

---

## Desenvolvimento Local

```bash
# Terminal 1 — subir node Hardhat local
npx hardhat node

# Terminal 2 — compilar e fazer deploy local
npm run compile
npm run deploy:local

# Terminal 3 — popular com dados de exemplo
npx hardhat run scripts/seed.js --network localhost

# Terminal 4 — iniciar frontend
cd frontend && npm run dev
```

Acesse `http://localhost:3000`.

---

## Testes

```bash
npm test
```

Os testes cobrem:
- **RecyclingLedger**: controle de roles, registro, validação, rejeição, emissão de selos
- **GreenSeal**: emissão de NFTs, controle de acesso, tokenURI, contadores por empresa

---

## Deploy na Amoy Testnet

```bash
npm run deploy:amoy
```

Após o deploy, copie os endereços de `deployments.json` para as variáveis `NEXT_PUBLIC_CONTRACT_*` no frontend.

---

## Estrutura do Projeto

```
greentrack/
├── contracts/
│   ├── RecyclingLedger.sol   # Registro e validação de pesagens
│   └── GreenSeal.sol         # NFT ERC-721 de Impacto Verde
├── scripts/
│   ├── deploy.js             # Deploy dos contratos
│   └── seed.js               # Dados de demonstração
├── test/
│   ├── RecyclingLedger.test.js
│   └── GreenSeal.test.js
└── frontend/
    ├── app/
    │   ├── page.jsx              # Dashboard público
    │   ├── cooperativa/page.jsx  # Registro de pesagens
    │   ├── auditor/page.jsx      # Validação
    │   └── empresa/[id]/page.jsx # Certificado + QR Code
    ├── components/
    │   ├── PesagemForm.jsx
    │   ├── AuditorPanel.jsx
    │   ├── SealCard.jsx
    │   └── QRDisplay.jsx
    └── utils/
        ├── ipfs.js
        └── contract.js
```

---

## Contratos

### RecyclingLedger

| Função | Acesso | Descrição |
|---|---|---|
| `registrarPesagem(material, pesoKg, ipfsHash, empresaId)` | COOPERATIVA_ROLE | Registra pesagem pendente |
| `validarPesagem(id)` | AUDITOR_ROLE | Valida e acumula kg |
| `rejeitarPesagem(id, motivo)` | AUDITOR_ROLE | Rejeita com justificativa |
| `getPesagensPorEmpresa(empresaId)` | público | Retorna IDs validados |

### GreenSeal (ERC-721)

| Função | Acesso | Descrição |
|---|---|---|
| `setLedger(address)` | owner | Define quem pode emitir selos |
| `emitirSelo(empresaId, totalKg)` | ledger | Cunha NFT para a empresa |
| `tokenURI(tokenId)` | público | Retorna URI do token |

---

## Licença

MIT
