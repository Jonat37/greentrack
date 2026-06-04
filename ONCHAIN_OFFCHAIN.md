# Dados On-chain e Off-chain — GreenTrack

> Este documento explica **o que vive na blockchain**, **o que vive fora dela**, e
> **como os dois mundos são amarrados** de forma que a fraude se torne detectável.
> É o coração do modelo de confiança do GreenTrack.

**Rede:** Ethereum Sepolia (chainId `11155111`)
**Armazenamento off-chain:** IPFS via Pinata

---

## Sumário

1. [Princípio do modelo](#1-princípio-do-modelo)
2. [O que fica On-chain](#2-o-que-fica-on-chain)
3. [O que fica Off-chain](#3-o-que-fica-off-chain)
4. [Como os dois são amarrados (a âncora de hash)](#4-como-os-dois-são-amarrados-a-âncora-de-hash)
5. [Fluxo de dados completo](#5-fluxo-de-dados-completo)
6. [Por que essa divisão (trade-offs)](#6-por-que-essa-divisão-trade-offs)
7. [Garantia de integridade e detecção de fraude](#7-garantia-de-integridade-e-detecção-de-fraude)
8. [O que nunca é colocado on-chain nem na URL](#8-o-que-nunca-é-colocado-on-chain-nem-na-url)
9. [Como verificar cada camada](#9-como-verificar-cada-camada)
10. [Resumo visual](#10-resumo-visual)

---

## 1. Princípio do modelo

A blockchain é cara e pública: tudo que entra nela custa gas e fica visível para sempre.
Imagens pesam muito e não cabem economicamente on-chain. Por isso o GreenTrack adota o
padrão consolidado de Web3:

> **On-chain fica a prova. Off-chain fica o conteúdo. O hash liga os dois.**

- Os **dados críticos e leves** (peso, material, status, quem fez, quem validou) ficam
  **on-chain** — onde não podem ser alterados.
- As **evidências pesadas** (fotos) ficam **off-chain no IPFS** — onde o armazenamento é
  barato e endereçado por conteúdo.
- O **hash (CID)** das evidências é gravado **on-chain**, criando um vínculo criptográfico
  inquebrável entre o registro e a prova física.

---

## 2. O que fica On-chain

Tudo que define **o impacto e a cadeia de responsabilidade** está nos contratos.

### Contrato `RecyclingLedger`

**Por pesagem (`struct Pesagem`):**

| Dado | Tipo | Por que on-chain |
|---|---|---|
| `id` | uint256 | Identificador imutável da ação de impacto |
| `cooperativa` | address | Quem registrou — responsabilidade |
| `material` | string | O que foi reciclado |
| `pesoKg` | uint256 | **A métrica de impacto** |
| `ipfsHash` | string | Âncora das evidências (CID) |
| `timestamp` | uint256 | Quando — definido pelo bloco, não pelo usuário |
| `status` | enum | PENDENTE / VALIDADO / REJEITADO |
| `auditor` | address | Quem validou — responsabilidade |
| `empresaId` | string | Quem recebe o crédito de impacto |
| `localColeta` | string | Contexto da triagem |
| `dataColeta` | string | Data informada da coleta |
| `observacao` | string | Notas |

**Identidades e governança:**

| Dado | Descrição |
|---|---|
| Cooperativas | Nome, CNPJ, cidade, estado, material, status |
| Auditores | Nome, organização, tipo, cidade, estado, status |
| Empresas apoiadoras | ID, nome, CNPJ |
| Roles | `COOPERATIVA_ROLE`, `AUDITOR_ROLE`, `DEFAULT_ADMIN_ROLE` |

**Métricas agregadas:**

| Dado | Descrição |
|---|---|
| `totalPesagens` | Contador global de pesagens |
| `totalKgValidadoGlobal` | Soma de todos os kg validados |
| `kgPorEmpresa` | Kg validados por empresa |
| `kgParaSelo` | Meta para emissão de selo (padrão 1.000) |

### Contrato `GreenSeal` (NFT ERC-721)

| Dado | Descrição |
|---|---|
| `tokenId` | ID único do Selo Verde |
| `seloEmpresa[tokenId]` | Empresa dona do selo |
| `seloKg[tokenId]` | Kg certificados no momento da emissão |
| `tokenURI` | `ipfs://greentrack/{empresaId}/{tokenId}` |

### Eventos (log on-chain permanente)

`PesagemRegistrada`, `PesagemValidada`, `PesagemRejeitada`, `SeloEmitido`,
`CooperativaCadastrada`, `AuditorAprovado`, etc. — cada ação relevante deixa um rastro
imutável e indexável.

---

## 3. O que fica Off-chain

### IPFS (via Pinata) — evidências físicas

| Item | Descrição |
|---|---|
| **Foto do tíquete da balança** | Prova do peso medido |
| **Foto dos fardos / material** | Prova física do material triado |
| **Metadata JSON da pesagem** | Documento que reúne material, peso, empresa, local, data, observação e os CIDs das duas fotos |

Estrutura do JSON ancorado no IPFS:

```json
{
  "versao": "1.0",
  "tipo": "pesagem_reciclagem",
  "material": "PET",
  "pesoKg": 350,
  "empresaId": "00.000.000/0001-00",
  "localColeta": "Galpão Central SP",
  "dataColeta": "2026-06-04",
  "observacao": "Material seco e separado",
  "timestamp": "2026-06-04T18:00:00.000Z",
  "evidencias": {
    "foto_balanca": "ipfs://Qm...",
    "foto_fardos": "ipfs://Qm..."
  }
}
```

O contrato grava **apenas o CID** desse JSON no campo `ipfsHash` da pesagem.

### Por que as fotos não vão para a blockchain

- Imagens têm centenas de KB a MBs — gravar isso on-chain custaria um valor proibitivo de gas.
- O IPFS é **endereçado por conteúdo**: o CID É o hash do arquivo. Guardar o CID on-chain
  já garante a integridade sem precisar do arquivo na cadeia.

---

## 4. Como os dois são amarrados (a âncora de hash)

O elo entre on-chain e off-chain é o **CID (Content Identifier)** do IPFS:

```
Foto + Metadata  ──(upload IPFS)──▶  CID = hash do conteúdo
                                          │
                                          ▼
                         registrarPesagem(..., ipfsHash = CID, ...)
                                          │
                                          ▼
                          CID gravado on-chain, imutável
```

O CID **é** o hash do conteúdo. Isso significa:

- Se alguém trocar a foto depois, o conteúdo muda → o hash muda → o novo CID **não bate**
  com o que está gravado on-chain.
- O registro on-chain aponta para um conteúdo específico e só para ele. Não há como
  "editar a evidência" sem que a divergência fique evidente.

É essa propriedade que transforma uma foto comum (facilmente falsificável) em uma
**evidência ancorada criptograficamente**.

---

## 5. Fluxo de dados completo

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. COOPERATIVA preenche a pesagem e seleciona 2 fotos                    │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │
        ┌──────────────────────▼───────────────────────┐
        │ 2. OFF-CHAIN: upload das fotos no IPFS         │
        │    foto_balanca → CID_A                        │
        │    foto_fardos  → CID_B                        │
        └──────────────────────┬───────────────────────┘
                               │
        ┌──────────────────────▼───────────────────────┐
        │ 3. OFF-CHAIN: metadata JSON (com CID_A, CID_B) │
        │    → upload IPFS → CID_JSON                     │
        └──────────────────────┬───────────────────────┘
                               │
        ┌──────────────────────▼───────────────────────┐
        │ 4. ON-CHAIN: registrarPesagem(...,             │
        │       ipfsHash = CID_JSON, ...)                │
        │    → struct Pesagem gravada, status PENDENTE   │
        │    → evento PesagemRegistrada                   │
        └──────────────────────┬───────────────────────┘
                               │
        ┌──────────────────────▼───────────────────────┐
        │ 5. ON-CHAIN: AUDITOR valida                     │
        │    validarPesagem(id) → status VALIDADO         │
        │    kgPorEmpresa += pesoKg                        │
        │    → evento PesagemValidada                      │
        └──────────────────────┬───────────────────────┘
                               │ (se atingiu a meta)
        ┌──────────────────────▼───────────────────────┐
        │ 6. ON-CHAIN: GreenSeal.emitirSelo()            │
        │    → NFT criado, seloKg/seloEmpresa gravados    │
        │    → evento SeloEmitido                          │
        └──────────────────────┬───────────────────────┘
                               │
        ┌──────────────────────▼───────────────────────┐
        │ 7. VERIFICAÇÃO: QR Code → /verify/...           │
        │    lê on-chain + resolve CIDs no IPFS           │
        └────────────────────────────────────────────────┘
```

---

## 6. Por que essa divisão (trade-offs)

| Critério | On-chain | Off-chain (IPFS) |
|---|---|---|
| Custo | Alto (gas por byte) | Baixo |
| Tamanho viável | Pequeno (números, strings curtas) | Grande (imagens, documentos) |
| Imutabilidade | Total | Conteúdo imutável pelo CID; disponibilidade depende de pinning |
| Visibilidade | Pública e permanente | Pública via gateway, enquanto pinada |
| Editável | Nunca | O conteúdo não muda; trocar = novo CID |
| Adequado para | Prova, métrica, responsabilidade | Evidência pesada (fotos, PDFs) |

**Decisão de design:** colocamos on-chain só o que precisa ser **inviolável e leve**
(a prova e a métrica), e off-chain o que é **pesado mas verificável pelo hash** (as fotos).

---

## 7. Garantia de integridade e detecção de fraude

| Tentativa de fraude | O que acontece |
|---|---|
| Trocar a foto da balança após o registro | Novo conteúdo → novo CID → não bate com o `ipfsHash` on-chain. Detectável. |
| Alterar o peso registrado | Impossível — `pesoKg` é imutável on-chain. |
| Forjar uma validação | Só carteiras com `AUDITOR_ROLE` validam; a transação fica registrada com o endereço do auditor. |
| Auditor validar a própria pesagem | Bloqueado pelo contrato (`require` de conflito de interesse). |
| Emitir selo sem lastro | Impossível — selo só é emitido pela regra automática de kg acumulados validados. |
| Apagar um registro ruim | Impossível — não há função de exclusão; o histórico é permanente. |

A confiança não vem de acreditar em uma das partes — vem de **qualquer pessoa poder
recalcular e conferir** que o conteúdo off-chain corresponde ao hash on-chain.

---

## 8. O que nunca é colocado on-chain nem na URL

Por segurança, estes itens **jamais** vão para a blockchain, para o QR Code ou para a URL
de verificação:

- ❌ Chaves privadas (private keys)
- ❌ Seed phrases / mnemônicos
- ❌ JWT da Pinata ou qualquer token de API
- ❌ Segredos de servidor
- ❌ Arquivos em base64 ou imagens embutidas

O **JWT da Pinata** fica protegido **apenas no servidor** (rota Next.js `/api/ipfs/*`), nunca
exposto ao navegador. O QR Code contém **somente a URL pública de verificação** — nenhum dado
sensível.

---

## 9. Como verificar cada camada

| Camada | Onde verificar | Como |
|---|---|---|
| **On-chain (dados)** | Sepolia Etherscan | Ler o contrato pelo endereço, inspecionar `pesagens(id)`, `seloKg`, eventos |
| **On-chain (selo NFT)** | Etherscan / página `/verify` | Conferir tokenId, empresa, kg certificados |
| **Off-chain (evidências)** | Gateway IPFS | Abrir o CID e ver as fotos e o JSON |
| **Vínculo entre os dois** | Página `/verify/{chainId}/{contract}/{tokenId}` | A página lê on-chain e resolve os CIDs no IPFS lado a lado |

A página de verificação (`/verify/...`), aberta pelo QR Code, mostra simultaneamente os
dados on-chain e os links para as evidências off-chain — permitindo à banca auditar a
correspondência em um único lugar, sem login.

---

## 10. Resumo visual

```
        ON-CHAIN (Ethereum Sepolia)              OFF-CHAIN (IPFS / Pinata)
   ┌────────────────────────────────┐        ┌──────────────────────────────┐
   │ • peso (kg)        ← MÉTRICA    │        │ • foto do tíquete da balança │
   │ • material                      │        │ • foto dos fardos            │
   │ • cooperativa (address)         │        │ • metadata JSON da pesagem   │
   │ • auditor (address)             │        │                              │
   │ • status                        │        └───────────────┬──────────────┘
   │ • empresa                       │                        │
   │ • timestamp                     │                  CID (hash)
   │ • NFT Selo Verde                │                        │
   │ • ipfsHash (CID) ───────────────┼────────────────────────┘
   │ • eventos (log permanente)      │   o hash on-chain ancora o conteúdo off-chain
   └────────────────────────────────┘
```

> **On-chain = a prova e a métrica. Off-chain = a evidência física.
> O hash amarra os dois e torna a fraude detectável.**

---

*GreenTrack · Modelo de dados verificável na blockchain Ethereum Sepolia*
