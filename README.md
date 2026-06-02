# GreenTrack

> Solução desenvolvida para o Desafio 3 — ImpactLedger · Hackathon Web3 RESTIC 36

---

## Sobre o desafio

Desafio oficial **ImpactLedger** do Hackathon Web3 RESTIC 36.

A proposta é construir uma solução baseada em blockchain capaz de **registrar, validar e certificar ações de impacto social e ambiental** de forma auditável, transparente e imutável.

---

## Objetivo

O **GreenTrack** registra pesagens de materiais recicláveis realizadas por cooperativas, permite que auditores validem os dados on-chain e emite automaticamente **NFTs Selos Verdes** para empresas geradoras de resíduos a cada 1.000 kg reciclados validados.

```
Cooperativa  →  registrarPesagem()  →  IPFS (fotos e metadados)
Auditor      →  validarPesagem()    →  acumula kg on-chain
Contrato     →  emitirSelo()        →  NFT ERC-721 automático
```

---

## Exemplos de aplicação

- Certificação de reciclagem para empresas ESG
- NFTs de impacto ambiental auditáveis
- Dashboard público de métricas de reciclagem
- Rastreabilidade de cadeia de resíduos sólidos
- Registro verificável por QR Code

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Smart Contracts | Solidity ^0.8.24, Hardhat, OpenZeppelin v5 |
| Rede | Polygon Amoy Testnet (chainId 80002) |
| Armazenamento | IPFS via Pinata |
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Web3 | Ethers.js v6, MetaMask |
| Testes | Mocha + Chai + hardhat-chai-matchers |

---

## Estrutura

```
greentrack/
├── contracts/
│   ├── RecyclingLedger.sol   # Registro e validação de pesagens
│   ├── GreenSeal.sol         # NFT ERC-721 de Impacto Verde
│   └── MockGreenSeal.sol     # Mock para testes
├── scripts/
│   ├── deploy.js             # Deploy dos contratos
│   └── seed.js               # Dados de demonstração
├── test/
│   ├── RecyclingLedger.test.js
│   └── GreenSeal.test.js
├── frontend/
│   ├── app/
│   │   ├── page.jsx              # Dashboard público
│   │   ├── cooperativa/page.jsx  # Registro de pesagens
│   │   ├── auditor/page.jsx      # Validação
│   │   └── empresa/[id]/page.jsx # Certificado + QR Code
│   ├── components/
│   │   ├── PesagemForm.jsx
│   │   ├── AuditorPanel.jsx
│   │   ├── SealCard.jsx
│   │   └── QRDisplay.jsx
│   └── utils/
│       ├── ipfs.js
│       └── contract.js
├── hardhat.config.js
├── .env.example
└── README.md
```

---

## Como executar

### Pré-requisitos

- Node.js >= 18
- MetaMask com MATIC na rede Amoy
- Conta Pinata (para IPFS)

### Instalar dependências

```bash
# Dependências do projeto Hardhat
npm install

# Dependências do frontend
cd frontend && npm install && cd ..
```

### Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env`:

```env
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=sua_chave_privada
PINATA_JWT=seu_jwt_pinata
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_CONTRACT_LEDGER=0x...
NEXT_PUBLIC_CONTRACT_SEAL=0x...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Compilar contratos

```bash
npm run compile
```

### Rodar testes

```bash
npm test
```

### Deploy local

```bash
# Terminal 1 — node local
npx hardhat node

# Terminal 2 — deploy
npm run deploy:local

# Terminal 3 — dados de exemplo
npx hardhat run scripts/seed.js --network localhost
```

### Deploy na Amoy Testnet

```bash
npm run deploy:amoy
```

### Iniciar frontend

```bash
cd frontend && npm run dev
```

Acesse `http://localhost:3000`

---

## Requisitos mínimos atendidos

- [x] Uso de blockchain (Polygon Amoy Testnet)
- [x] Registro auditável (eventos on-chain + IPFS)
- [x] Smart contract funcional (RecyclingLedger + GreenSeal ERC-721)
- [x] Histórico verificável (mappings públicos + QR Code)
- [x] README funcional
- [ ] Vídeo-pitch

---

## Equipe

| Nome | GitHub |
|---|---|
| Jonathan Campoi | [@Jonat37](https://github.com/Jonat37) |
