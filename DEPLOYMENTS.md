# DEPLOYMENTS — GreenTrack

> Registro histórico de todos os deploys dos smart contracts.
> Atualize este arquivo sempre que realizar um novo deploy.

---

## Como registrar um novo deploy

Após rodar `npm run deploy:sepolia`, copie os endereços do output e adicione uma nova entrada no topo da seção correspondente à rede, seguindo o template:

```markdown
### Deploy #N — YYYY-MM-DD

| Campo            | Valor |
|---|---|
| Data             | YYYY-MM-DDTHH:MM:SS.sssZ |
| Deployer         | 0x... |
| RecyclingLedger  | 0x... |
| GreenSeal        | 0x... |
| kgParaSelo       | 1000 |
| Motivo           | Descreva o motivo do redeploy |
| Commit           | hash curto do git |
| Status           | ✅ Ativo / ❌ Depreciado |
```

---

## Rede: Ethereum Sepolia (chainId: 11155111)

---

### Deploy #3 — 2026-06-04 ✅ ATIVO

| Campo | Valor |
|---|---|
| Data | 2026-06-04T18:27:48.564Z |
| Deployer | `0x0AeA126470894686f7aA11FbE11BF63437f7dCe9` |
| RecyclingLedger | `0x602AE94DAbA2D99a0253c5e010a3d9dc77ACB616` |
| GreenSeal | `0x46769676B561D5981F2569A57a4de5ABA78fD011` |
| kgParaSelo inicial | 1000 |
| Solidity | 0.8.24 |
| viaIR | true |
| Optimizer | 200 runs |
| EVM target | cancun |
| Motivo | Refatoração completa do RecyclingLedger com auto-cadastro de cooperativas, sistema de solicitação de auditores, meta de kg configurável, campos extras na struct Pesagem (localColeta, dataColeta, observacao), pesagensPorCooperativa. GreenSeal atualizado com `_selosPorEmpresa` e `getSelosPorEmpresa()`. |
| Commit | `91f0053` |
| Status | ✅ Ativo — em uso pelo frontend |

**Etherscan:**
- [RecyclingLedger](https://sepolia.etherscan.io/address/0x602AE94DAbA2D99a0253c5e010a3d9dc77ACB616)
- [GreenSeal](https://sepolia.etherscan.io/address/0x46769676B561D5981F2569A57a4de5ABA78fD011)

**Roles concedidos pós-deploy:**
| Carteira | Role | Método |
|---|---|---|
| `0x0AeA126470894686f7aA11FbE11BF63437f7dCe9` | `DEFAULT_ADMIN_ROLE` | constructor |
| `0x0AeA126470894686f7aA11FbE11BF63437f7dCe9` | `COOPERATIVA_ROLE` | `grant-role.js` (revertido depois) |
| `0x0AeA126470894686f7aA11FbE11BF63437f7dCe9` | `AUDITOR_ROLE` | `grant-role.js` (revertido depois) |

**Configuração do frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_CONTRACT_LEDGER=0x602AE94DAbA2D99a0253c5e010a3d9dc77ACB616
NEXT_PUBLIC_CONTRACT_SEAL=0x46769676B561D5981F2569A57a4de5ABA78fD011
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/<SEU_PROJECT_ID>
```

---

### Deploy #2 — 2026-06-04 ❌ DEPRECIADO

| Campo | Valor |
|---|---|
| Data | 2026-06-04T16:36:26.405Z |
| Deployer | `0x0AeA126470894686f7aA11FbE11BF63437f7dCe9` |
| RecyclingLedger | `0x3DA6966690e37C36e6aE6E2B0fD4E11D9C24fb13` |
| GreenSeal | `0x2720e952323Da042B13D1bD41a2F22336FFe80fb` |
| kgParaSelo inicial | 1000 |
| Motivo | Primeiro deploy funcional na Sepolia com RPC Infura corrigido (Project ID `99ef2b815dc94389ac1728038f287999`). Substituiu o Deploy #1 que falhou no RecyclingLedger por saldo insuficiente. |
| Commit | `91f0053` |
| Status | ❌ Depreciado — substituído pelo Deploy #3 |

---

### Deploy #1 — 2026-06-04 ❌ FALHOU

| Campo | Valor |
|---|---|
| Data | 2026-06-04 (parcial) |
| Deployer | `0x0AeA126470894686f7aA11FbE11BF63437f7dCe9` |
| RecyclingLedger | — (falhou) |
| GreenSeal | `0x9dEd5cec70886396fcA36831D999A8a03F67C382` |
| Motivo de falha | Saldo insuficiente para deploy do RecyclingLedger após o GreenSeal ter consumido parte do ETH. Apenas o GreenSeal foi publicado. |
| Status | ❌ Falhou — GreenSeal orphan, sem Ledger configurado |

---

## Carteira Deployer

| Campo | Valor |
|---|---|
| Endereço | `0x0AeA126470894686f7aA11FbE11BF63437f7dCe9` |
| Rede | Ethereum Sepolia |
| Roles atuais | `DEFAULT_ADMIN_ROLE` no Deploy #3 |
| Saldo usado (estimado) | ~0.08 SepoliaETH em todos os deploys |

---

## Histórico de roles manuais

Ações executadas via `scripts/grant-role.js` fora do fluxo de deploy:

| Data | Carteira | Role | Ação | Motivo |
|---|---|---|---|---|
| 2026-06-04 | `0x0AeA...dCe9` | `COOPERATIVA_ROLE` + `AUDITOR_ROLE` | Grant | Testes da demo no Deploy #2 |
| 2026-06-04 | `0x0AeA...dCe9` | `COOPERATIVA_ROLE` + `AUDITOR_ROLE` | Grant | Testes da demo no Deploy #3 |
| 2026-06-04 | `0x0AeA...dCe9` | `COOPERATIVA_ROLE` + `AUDITOR_ROLE` | Revoke | Manter apenas ADM para demonstração final |

---

## Configuração do compilador

Válida para todos os deploys a partir do Deploy #2:

```javascript
// hardhat.config.js
solidity: {
  version: "0.8.24",
  settings: {
    evmVersion: "cancun",
    viaIR: true,
    optimizer: { enabled: true, runs: 200 },
  },
}
```

> `viaIR: true` foi necessário a partir do Deploy #3 devido ao erro "Stack too deep" causado pelo número elevado de parâmetros na função `registrarPesagem()`.

---

## Comandos de deploy

```bash
# Deploy na Sepolia
npm run deploy:sepolia

# Deploy local (node Hardhat)
npx hardhat node
npm run deploy:local

# Conceder roles manualmente (editar endereço no script antes)
npx hardhat run scripts/grant-role.js --network sepolia
```

---

## Checklist pós-deploy

Após cada deploy na Sepolia, verificar:

- [ ] `deployments.json` atualizado com novos endereços
- [ ] ABIs copiados para `frontend/lib/` (feito automaticamente pelo `deploy.js`)
- [ ] `frontend/.env.local` atualizado com `NEXT_PUBLIC_CONTRACT_LEDGER` e `NEXT_PUBLIC_CONTRACT_SEAL`
- [ ] `DEPLOYMENTS.md` atualizado com nova entrada
- [ ] `setLedger()` foi chamado no GreenSeal (feito automaticamente pelo `deploy.js`)
- [ ] Contrato verificado no Sepolia Etherscan (opcional)
- [ ] Roles necessários concedidos via `grant-role.js` (se aplicável)
- [ ] Frontend reiniciado para carregar novos endereços

---

*Última atualização: 2026-06-04 · Deploy #3 ativo*
