# SPEC-010 — Public Dashboard

| Campo | Valor |
|---|---|
| ID | SPEC-010 |
| Funcionalidade | Dashboard Público de Métricas, Ranking e Selos |
| Rota | `/dashboard` |
| Ator principal | Público (sem login) |
| Status | Implementado |

---

## Visão Geral

Dashboard público acessível por qualquer pessoa sem MetaMask e sem login. Exibe métricas globais em tempo real, ranking de empresas por kg certificado e os últimos Selos Verdes emitidos — cada um com QR Code que leva à página de verificação on-chain (SPEC-013).

> A rota raiz `/` é uma **landing page** com hero, 3 métricas resumidas e a seção "Como Funciona". O dashboard completo descrito aqui vive em `/dashboard`.

---

## Atores

| Ator | Descrição |
|---|---|
| Público | Qualquer pessoa, sem MetaMask, sem login |
| Banca avaliadora | Audita o impacto registrado a partir dos dados on-chain |

---

## Pré-condições

- Nenhuma — página pública sem requisito de autenticação
- Os dados dependem de existirem registros on-chain (caso contrário, exibe estados vazios)

---

## Fluxo Principal

```
1. Usuário acessa /dashboard
2. Sistema exibe spinner "Consultando a blockchain..."
3. Sistema carrega sequencialmente (com delay anti rate-limiting):
   a. ledger.totalPesagens()
   b. ledger.totalKgValidadoGlobal()
   c. seal.nextTokenId()
   d. ledger.getListaCooperativas()
   e. ledger.getEmpresas()
4. Para cada empresa: carrega kg e detalhes das pesagens validadas
5. Carrega os últimos 5 selos (seloEmpresa + seloKg por tokenId)
6. Calcula métricas derivadas e ranking
7. Renderiza métricas, ranking, selos e links de contrato
```

---

## Seções da Página

### Métricas Globais (6 cards)
| Card | Fonte |
|---|---|
| ♻️ Kg validados | `totalKgValidadoGlobal` |
| 📋 Pesagens registradas | `totalPesagens` |
| ✅ Pesagens validadas | soma das pesagens validadas por empresa |
| 🏅 Selos emitidos | `GreenSeal.nextTokenId` |
| 🏭 Cooperativas | `getListaCooperativas().length` |
| 🏢 Empresas certificadas | `getEmpresas().length` |

### Ranking de Empresas por Kg Certificado
- Tabela ordenada por kg decrescente
- Colunas: posição, empresa, materiais, kg certificados, selos, pesagens

### Últimos Selos Verdes Emitidos (até 5)
- Card por selo: Token ID, empresa, kg certificados, material(is)
- QR Code com URL de verificação (`getVerifyUrl(tokenId)`)
- Botão "🔍 Ver auditoria completa" → `/verify/11155111/{SEAL}/{tokenId}`
- Link "Ver no Etherscan ↗"

### Contratos na Blockchain
- Cards do RecyclingLedger e GreenSeal com endereço e link Etherscan

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-AC04 | Dashboard público acessível sem MetaMask |
| BR-I01 | Dados públicos e verificáveis on-chain |
| BR-I02 | Sem banco de dados centralizado |

---

## Contratos Envolvidos (somente leitura)

| Contrato | Função | Dado |
|---|---|---|
| RecyclingLedger | `totalPesagens()` | Contador global |
| RecyclingLedger | `totalKgValidadoGlobal()` | Kg validados globais |
| RecyclingLedger | `getListaCooperativas()` | Cooperativas cadastradas |
| RecyclingLedger | `getEmpresas()` | Empresas com pesagens validadas |
| RecyclingLedger | `kgPorEmpresa()` / `getPesagensPorEmpresa()` / `pesagens()` | Dados por empresa |
| GreenSeal | `nextTokenId()` | Total de selos |
| GreenSeal | `seloEmpresa()` / `seloKg()` | Dados de cada selo |

---

## QR Code

- Conteúdo: **URL pública de verificação**, nunca hash solto ou dados brutos
- Formato: `{NEXT_PUBLIC_APP_URL}/verify/{chainId}/{contractAddress}/{tokenId}`
- Exemplo: `http://localhost:3000/verify/11155111/0x4676.../1`

---

## Validações

| Validação | Onde | Comportamento |
|---|---|---|
| Nenhuma — página pública | — | — |
| Falha de RPC | Frontend | Exibe banner de erro |
| Sem selos emitidos | Frontend | Exibe estado vazio explicativo |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| RPC indisponível | Infura fora do ar | Banner "Erro ao carregar" |
| Rate limit Infura | Muitas chamadas | Mitigado por carregamento sequencial com delay |

---

## Critérios de Aceite

- [ ] Página acessível sem MetaMask e sem login
- [ ] 6 métricas carregam da blockchain
- [ ] Ranking ordena empresas por kg decrescente
- [ ] Até 5 selos exibidos, mais recentes primeiro
- [ ] Cada selo mostra QR Code com URL de verificação
- [ ] Botão "Ver auditoria completa" leva à página `/verify/...`
- [ ] Links de contrato apontam ao Sepolia Etherscan
- [ ] Falha de RPC exibe banner de erro, não quebra a página
- [ ] Página responsiva em mobile e desktop
