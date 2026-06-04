# BUSINESS RULES — GreenTrack

> Documento central de todas as regras de negócio da plataforma.
> Qualquer alteração de comportamento deve ser refletida aqui primeiro.

---

## Sumário

1. [Papéis e Permissões](#1-papéis-e-permissões)
2. [Cooperativas](#2-cooperativas)
3. [Auditores](#3-auditores)
4. [Pesagens](#4-pesagens)
5. [Empresas Apoiadoras](#5-empresas-apoiadoras)
6. [Selos Verdes (NFT)](#6-selos-verdes-nft)
7. [Administrador](#7-administrador)
8. [Acesso e Autenticação](#8-acesso-e-autenticação)
9. [Dados e Imutabilidade](#9-dados-e-imutabilidade)
10. [Tabela de Permissões por Ação](#10-tabela-de-permissões-por-ação)

---

## 1. Papéis e Permissões

### 1.1 Definição de roles

A plataforma utiliza o sistema de controle de acesso **OpenZeppelin AccessControl**, baseado em três roles:

| Role | Constante | Quem detém |
|---|---|---|
| Administrador | `DEFAULT_ADMIN_ROLE` | Carteira que realizou o deploy do contrato |
| Cooperativa | `COOPERATIVA_ROLE` | Cooperativas auto-cadastradas |
| Auditor | `AUDITOR_ROLE` | Auditores aprovados pelo ADM |

### 1.2 Hierarquia

```
DEFAULT_ADMIN_ROLE
  ├── Concede / revoga AUDITOR_ROLE
  ├── Concede / revoga COOPERATIVA_ROLE
  └── Executa todas as funções administrativas

COOPERATIVA_ROLE
  └── Registra pesagens

AUDITOR_ROLE
  └── Valida e rejeita pesagens
```

### 1.3 Regras gerais de roles

- **BR-R01** — Uma carteira pode ter apenas um role ativo funcional por vez (ADM, Auditor ou Cooperativa). Tecnicamente é possível ter mais de um, mas não é o fluxo esperado.
- **BR-R02** — O `DEFAULT_ADMIN_ROLE` não se auto-aplica às funções de cooperativa ou auditor: o ADM não pode registrar pesagens nem validá-las sem os roles correspondentes.
- **BR-R03** — Roles são armazenados on-chain e verificados diretamente no smart contract a cada ação.
- **BR-R04** — A revogação de um role é imediata: a carteira perde o acesso assim que a transação é confirmada.

---

## 2. Cooperativas

### 2.1 Cadastro

- **BR-C01** — Qualquer carteira pode se cadastrar como cooperativa sem aprovação prévia.
- **BR-C02** — Cada carteira pode se cadastrar **apenas uma vez** como cooperativa. Tentativa de segundo cadastro reverte a transação.
- **BR-C03** — O `COOPERATIVA_ROLE` é concedido automaticamente no momento do cadastro, sem intervenção do ADM.
- **BR-C04** — A cooperativa começa com status `ATIVA` imediatamente após o cadastro.
- **BR-C05** — Os dados do cadastro (nome, CNPJ, cidade, estado, material, contato) são armazenados on-chain e imutáveis após o registro.

### 2.2 Operação

- **BR-C06** — Uma cooperativa ativa pode registrar pesagens para qualquer empresa apoiadora.
- **BR-C07** — Uma cooperativa **não pode** validar ou rejeitar pesagens, mesmo as que ela mesma registrou.
- **BR-C08** — Uma cooperativa **não pode** emitir Selos Verdes manualmente.
- **BR-C09** — Uma cooperativa pode registrar pesagens para múltiplas empresas apoiadoras diferentes.

### 2.3 Bloqueio

- **BR-C10** — O ADM pode bloquear uma cooperativa a qualquer momento (ex.: fraude, spam, dados incorretos).
- **BR-C11** — Uma cooperativa bloqueada perde o `COOPERATIVA_ROLE` e não pode registrar novas pesagens.
- **BR-C12** — O bloqueio **não afeta** pesagens já registradas anteriormente — elas continuam válidas para validação.
- **BR-C13** — O ADM pode desbloquear uma cooperativa a qualquer momento, restaurando o `COOPERATIVA_ROLE`.
- **BR-C14** — Não existe exclusão de cooperativa. O bloqueio é o mecanismo de desativação.

---

## 3. Auditores

### 3.1 Solicitação de cadastro

- **BR-A01** — Qualquer carteira pode solicitar cadastro como auditor.
- **BR-A02** — Cada carteira pode submeter **apenas uma solicitação**. Tentativa de segunda solicitação reverte a transação.
- **BR-A03** — A solicitação começa com status `PENDENTE`.
- **BR-A04** — Um auditor com status `PENDENTE` **não possui** `AUDITOR_ROLE` e **não pode** validar pesagens.

### 3.2 Aprovação

- **BR-A05** — Apenas o ADM pode aprovar uma solicitação de auditor.
- **BR-A06** — Após aprovação, o status muda para `APROVADO` e o `AUDITOR_ROLE` é concedido.
- **BR-A07** — A aprovação é imediata: o auditor pode validar pesagens assim que a transação é confirmada.

### 3.3 Rejeição e bloqueio

- **BR-A08** — O ADM pode rejeitar uma solicitação pendente. Status muda para `REJEITADO`, sem role.
- **BR-A09** — O ADM pode bloquear um auditor aprovado. Status muda para `BLOQUEADO`, `AUDITOR_ROLE` é revogado.
- **BR-A10** — O ADM pode desbloquear um auditor bloqueado. Status volta para `APROVADO`, `AUDITOR_ROLE` é restaurado.
- **BR-A11** — Um auditor rejeitado ou bloqueado **não pode** validar pesagens.
- **BR-A12** — Não existe exclusão de auditor. Rejeição e bloqueio são os mecanismos de desativação.

### 3.4 Conflito de interesse

- **BR-A13** — Um auditor **não pode** validar pesagens registradas pela mesma carteira que o auditor opera. A transação reverte com erro.
- **BR-A14** — Não há restrição de auditor por empresa ou material: qualquer auditor aprovado pode validar qualquer pesagem pendente.

---

## 4. Pesagens

### 4.1 Registro

- **BR-P01** — Apenas carteiras com `COOPERATIVA_ROLE` podem registrar pesagens.
- **BR-P02** — O peso em kg deve ser **maior que zero**. Peso zero ou negativo reverte a transação.
- **BR-P03** — O hash IPFS (evidência) é **obrigatório**. Pesagem sem hash IPFS reverte a transação.
- **BR-P04** — O ID da empresa apoiadora é **obrigatório** e deve ser informado pela cooperativa no momento do registro.
- **BR-P05** — Local da coleta, data da coleta e observação são **opcionais**.
- **BR-P06** — Toda pesagem nasce com status `PENDENTE`.
- **BR-P07** — O timestamp da pesagem é definido pelo bloco da blockchain, não pelo usuário.
- **BR-P08** — Não existe limite máximo de pesagens por cooperativa ou por empresa.

### 4.2 Evidências (IPFS)

- **BR-P09** — Cada pesagem deve ter duas fotos obrigatórias: foto do tíquete da balança e foto dos fardos/material.
- **BR-P10** — As fotos são armazenadas no IPFS via Pinata. O contrato armazena apenas o CID (hash) da metadata JSON.
- **BR-P11** — A metadata JSON armazenada no IPFS contém: material, peso, empresa, local, data, observação e CIDs das fotos.
- **BR-P12** — Uma vez enviadas para o IPFS, as evidências são imutáveis e permanentemente acessíveis pelo CID.

### 4.3 Validação

- **BR-P13** — Apenas auditores com `AUDITOR_ROLE` podem validar pesagens.
- **BR-P14** — Apenas pesagens com status `PENDENTE` podem ser validadas.
- **BR-P15** — Após validação, o status muda para `VALIDADO` e o endereço do auditor é registrado.
- **BR-P16** — Uma pesagem validada **não pode** ser revertida para PENDENTE ou REJEITADA.
- **BR-P17** — Pesagens validadas acumulam kg no total da empresa apoiadora correspondente.
- **BR-P18** — Pesagens validadas acumulam kg no total global da plataforma (`totalKgValidadoGlobal`).
- **BR-P19** — Após cada validação, o sistema verifica automaticamente se a empresa atingiu a meta para emissão de Selo Verde.

### 4.4 Rejeição

- **BR-P20** — Apenas auditores com `AUDITOR_ROLE` podem rejeitar pesagens.
- **BR-P21** — Apenas pesagens com status `PENDENTE` podem ser rejeitadas.
- **BR-P22** — A rejeição exige um motivo (string não vazia). A validação do motivo é feita no frontend; o contrato aceita qualquer string.
- **BR-P23** — Após rejeição, o status muda para `REJEITADO` e o endereço do auditor é registrado.
- **BR-P24** — Pesagens rejeitadas **não acumulam** kg para nenhuma empresa.
- **BR-P25** — Uma pesagem rejeitada **não pode** ser reaprovada ou resubmetida. A cooperativa deve criar uma nova pesagem caso necessário.

### 4.5 Imutabilidade

- **BR-P26** — Nenhuma pesagem pode ser excluída do contrato.
- **BR-P27** — Os dados de uma pesagem (material, peso, ipfsHash, empresaId) são imutáveis após o registro.
- **BR-P28** — O histórico completo de todas as pesagens é público e verificável on-chain.

---

## 5. Empresas Apoiadoras

### 5.1 Cadastro

- **BR-E01** — Empresas apoiadoras são cadastradas pelo ADM no painel administrativo.
- **BR-E02** — Cada empresa é identificada por um ID único (string), geralmente o CNPJ.
- **BR-E03** — Se o ID já existir, o cadastro substitui os dados anteriores (nome e CNPJ).
- **BR-E04** — O cadastro de empresa não é obrigatório para que uma cooperativa registre pesagens: a cooperativa pode informar qualquer string como `empresaId`.
- **BR-E05** — Empresas cadastradas pelo ADM aparecem no dropdown do formulário de nova pesagem, facilitando a seleção correta.

### 5.2 Vínculo com pesagens e selos

- **BR-E06** — Os kg validados e os selos emitidos são contabilizados por `empresaId` (string).
- **BR-E07** — Qualquer empresa — cadastrada ou não pelo ADM — pode acumular kg e receber selos, desde que seu `empresaId` seja usado em pesagens validadas.
- **BR-E08** — A página pública `/empresa/[id]` é acessível para qualquer `empresaId` que tenha pesagens validadas.

---

## 6. Selos Verdes (NFT)

### 6.1 Emissão

- **BR-S01** — O Selo Verde é um NFT padrão ERC-721, emitido automaticamente pelo contrato `RecyclingLedger` ao validar uma pesagem que faz a empresa atingir a meta de kg.
- **BR-S02** — A emissão é **automática e imediata**: ocorre dentro da mesma transação de `validarPesagem()`, sem intervenção humana.
- **BR-S03** — O NFT é custodiado pelo próprio contrato `GreenSeal` (`address(this)`), não por uma carteira pessoal.
- **BR-S04** — O Selo Verde **não é transferível** para carteiras pessoais via fluxo padrão da plataforma.

### 6.2 Meta de emissão

- **BR-S05** — A meta padrão é **1.000 kg validados** por empresa para emissão de 1 Selo Verde.
- **BR-S06** — A meta é configurável pelo ADM via `setKgParaSelo()`, aplicando-se a **futuras** validações.
- **BR-S07** — A meta é global: vale para todas as empresas igualmente.
- **BR-S08** — A alteração da meta **não afeta** selos já emitidos nem kg já acumulados.

### 6.3 Acúmulo e múltiplos selos

- **BR-S09** — Os selos são cumulativos e proporcionais:
  - 1.000 kg → 1 selo
  - 2.000 kg → 2 selos
  - 3.000 kg → 3 selos
- **BR-S10** — Se uma única validação fizer a empresa saltar de 500 kg para 2.500 kg (ex.: pesagem de 2.000 kg), apenas **1 selo** é emitido (o sistema verifica `selosDevidos > selosEmitidos` e emite apenas o próximo).
- **BR-S11** — Cada selo registra o total de kg acumulados pela empresa **no momento da emissão**.

### 6.4 Identificação e rastreabilidade

- **BR-S12** — Cada selo possui um `tokenId` único e incremental globalmente (não por empresa).
- **BR-S13** — O `tokenURI` de cada selo segue o formato: `ipfs://greentrack/{empresaId}/{tokenId}`.
- **BR-S14** — O contrato registra: qual empresa recebeu cada token (`seloEmpresa`), quantos kg havia no momento (`seloKg`) e quais tokens uma empresa possui (`getSelosPorEmpresa`).
- **BR-S15** — O evento `SeloEmitido` é registrado on-chain a cada emissão, contendo: tokenId, empresaId, totalKg e tokenURI.

---

## 7. Administrador

### 7.1 Poderes

- **BR-AD01** — O ADM é a carteira que realizou o deploy do contrato. Não há processo de troca ou eleição de ADM na versão atual.
- **BR-AD02** — O ADM pode aprovar, rejeitar, bloquear e desbloquear auditores.
- **BR-AD03** — O ADM pode bloquear e desbloquear cooperativas.
- **BR-AD04** — O ADM pode cadastrar e atualizar empresas apoiadoras.
- **BR-AD05** — O ADM pode alterar a meta de kg por Selo Verde.
- **BR-AD06** — O ADM pode conceder e revogar qualquer role via `grantRole` / `revokeRole` do AccessControl (função de baixo nível).

### 7.2 Limitações

- **BR-AD07** — O ADM **não pode** alterar, excluir ou reverter pesagens já registradas.
- **BR-AD08** — O ADM **não pode** alterar dados históricos de selos emitidos.
- **BR-AD09** — O ADM **não pode** alterar os dados cadastrais de cooperativas ou auditores após o registro.
- **BR-AD10** — O ADM **não pode** emitir selos manualmente: a emissão é sempre automática via contrato.
- **BR-AD11** — Todas as ações do ADM geram eventos on-chain auditáveis.

---

## 8. Acesso e Autenticação

### 8.1 Conexão de carteira

- **BR-AC01** — O acesso a qualquer área restrita requer conexão com MetaMask.
- **BR-AC02** — A plataforma exige que a carteira esteja conectada à rede **Ethereum Sepolia** (chainId `0xaa36a7`).
- **BR-AC03** — Se a carteira estiver em outra rede, o sistema tenta trocar automaticamente. Se a rede não existir no MetaMask, ela é adicionada automaticamente.
- **BR-AC04** — O acesso público (dashboard, página de empresa) é liberado sem conexão de carteira.

### 8.2 Redirecionamento por role

- **BR-AC05** — Ao conectar a carteira no `/login`, o sistema verifica os roles on-chain e redireciona:
  - `DEFAULT_ADMIN_ROLE` → `/admin`
  - `AUDITOR_ROLE` → `/auditor`
  - `COOPERATIVA_ROLE` → `/cooperativa`
- **BR-AC06** — Se a carteira tiver múltiplos roles, a prioridade de redirecionamento é: **ADM > Auditor > Cooperativa**.
- **BR-AC07** — Se sem role, o sistema verifica se há solicitação pendente de auditor e exibe o status correspondente.
- **BR-AC08** — Páginas protegidas verificam o role ao montar. Se não autorizado, redirecionam imediatamente para `/login`.
- **BR-AC09** — A verificação de roles aguarda o carregamento inicial (`loaded = true`) antes de redirecionar, evitando falsos redirecionamentos por timing.

### 8.3 Sessão

- **BR-AC10** — O estado da carteira é mantido enquanto o MetaMask estiver conectado. Ao trocar de conta no MetaMask, os roles são verificados novamente para a nova conta.
- **BR-AC11** — Não há sessão server-side: toda autenticação é client-side via MetaMask + leitura on-chain.

---

## 9. Dados e Imutabilidade

### 9.1 O que é imutável

| Dado | Onde está | Pode mudar? |
|---|---|---|
| Pesagens (material, peso, ipfsHash, empresaId) | Blockchain | ❌ Nunca |
| Status de pesagem | Blockchain | ⚠️ Apenas de PENDENTE para VALIDADO ou REJEITADO |
| Fotos de evidência | IPFS | ❌ Nunca |
| Metadata JSON da pesagem | IPFS | ❌ Nunca |
| Selos emitidos (tokenId, empresaId, kg) | Blockchain | ❌ Nunca |
| Dados de cadastro de cooperativa | Blockchain | ❌ Nunca |
| Dados de solicitação de auditor | Blockchain | ❌ Nunca |
| Eventos on-chain | Blockchain | ❌ Nunca |

### 9.2 O que pode ser alterado

| Dado | Quem pode alterar | Como |
|---|---|---|
| Role de auditor | ADM | `aprovarAuditor / rejeitarAuditor / bloquearAuditor / desbloquearAuditor` |
| Role de cooperativa | ADM | `bloquearCooperativa / desbloquearCooperativa` |
| Meta de kg por selo | ADM | `setKgParaSelo()` |
| Dados de empresa apoiadora | ADM | `cadastrarEmpresaApoiadora()` (upsert por ID) |

### 9.3 Transparência

- **BR-I01** — Todos os dados de pesagens, kg, selos e roles são públicos e verificáveis on-chain por qualquer pessoa.
- **BR-I02** — A plataforma não possui banco de dados centralizado: toda informação de negócio está na blockchain ou no IPFS.
- **BR-I03** — O histórico de transações no Sepolia Etherscan serve como auditoria completa e independente.

---

## 10. Tabela de Permissões por Ação

| Ação | Público | Cooperativa | Auditor | ADM |
|---|:---:|:---:|:---:|:---:|
| Ver dashboard público | ✅ | ✅ | ✅ | ✅ |
| Ver página pública de empresa | ✅ | ✅ | ✅ | ✅ |
| Solicitar cadastro como cooperativa | ✅ | ❌ | ✅ | ✅ |
| Solicitar cadastro como auditor | ✅ | ✅ | ❌ | ✅ |
| Registrar pesagem | ❌ | ✅ | ❌ | ❌ |
| Validar pesagem | ❌ | ❌ | ✅ | ❌ |
| Rejeitar pesagem | ❌ | ❌ | ✅ | ❌ |
| Ver painel da cooperativa | ❌ | ✅ | ❌ | ❌ |
| Ver painel do auditor | ❌ | ❌ | ✅ | ❌ |
| Aprovar / rejeitar auditor | ❌ | ❌ | ❌ | ✅ |
| Bloquear / desbloquear auditor | ❌ | ❌ | ❌ | ✅ |
| Bloquear / desbloquear cooperativa | ❌ | ❌ | ❌ | ✅ |
| Cadastrar empresa apoiadora | ❌ | ❌ | ❌ | ✅ |
| Alterar meta de kg/selo | ❌ | ❌ | ❌ | ✅ |
| Emitir Selo Verde manualmente | ❌ | ❌ | ❌ | ❌ |
| Alterar pesagem já registrada | ❌ | ❌ | ❌ | ❌ |
| Excluir pesagem | ❌ | ❌ | ❌ | ❌ |

> ✅ Permitido · ❌ Não permitido

---

*Documento de referência — GreenTrack v1.0 · Rede: Ethereum Sepolia*
