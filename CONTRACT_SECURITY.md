# CONTRACT_SECURITY — GreenTrack

> Análise de segurança dos smart contracts da plataforma.
> **Este documento não substitui uma auditoria profissional.**
> Nenhum dos contratos foi auditado por terceiros até a data de publicação.

---

## Aviso

Os contratos GreenTrack estão implantados na **Ethereum Sepolia Testnet** com fins de demonstração. Antes de qualquer implantação em mainnet ou uso com valor real, uma **auditoria de segurança independente** é obrigatória. As considerações abaixo refletem a análise interna dos desenvolvedores e **não garantem** ausência de vulnerabilidades.

---

## Sumário

1. [Controle de Acesso](#1-controle-de-acesso)
2. [Prevenção de Reentrância](#2-prevenção-de-reentrância)
3. [Validação de Parâmetros](#3-validação-de-parâmetros)
4. [Tratamento de Permissões](#4-tratamento-de-permissões)
5. [Possibilidade de Pausa](#5-possibilidade-de-pausa)
6. [Imutabilidade](#6-imutabilidade)
7. [Riscos Conhecidos](#7-riscos-conhecidos)
8. [Dependências Externas](#8-dependências-externas)
9. [Auditoria](#9-auditoria)

---

## 1. Controle de Acesso

### Modelo implementado

O `RecyclingLedger` utiliza **OpenZeppelin AccessControl** (v5), um padrão battle-tested de controle de acesso baseado em roles. Cada função sensível é protegida pelo modifier `onlyRole(bytes32 role)`, que reverte a transação se `msg.sender` não possuir o role exigido.

```solidity
// Roles definidos
bytes32 public constant COOPERATIVA_ROLE = keccak256("COOPERATIVA_ROLE");
bytes32 public constant AUDITOR_ROLE     = keccak256("AUDITOR_ROLE");
// DEFAULT_ADMIN_ROLE = bytes32(0) — herdado do AccessControl
```

O `GreenSeal` usa **OpenZeppelin Ownable** para `setLedger()` e um modifier customizado `onlyLedger` para `emitirSelo()`.

### Proteções por função

| Função | Proteção | Contrato |
|---|---|---|
| `cadastrarCooperativa()` | Sem role — qualquer carteira | RecyclingLedger |
| `solicitarAuditor()` | Sem role — qualquer carteira | RecyclingLedger |
| `registrarPesagem()` | `onlyRole(COOPERATIVA_ROLE)` | RecyclingLedger |
| `validarPesagem()` | `onlyRole(AUDITOR_ROLE)` | RecyclingLedger |
| `rejeitarPesagem()` | `onlyRole(AUDITOR_ROLE)` | RecyclingLedger |
| `aprovarAuditor()` e demais ADM | `onlyRole(DEFAULT_ADMIN_ROLE)` | RecyclingLedger |
| `setKgParaSelo()` | `onlyRole(DEFAULT_ADMIN_ROLE)` | RecyclingLedger |
| `setLedger()` | `onlyOwner` (Ownable) | GreenSeal |
| `emitirSelo()` | `onlyLedger` (modifier customizado) | GreenSeal |

### Considerações

- **Ponto único de falha do ADM:** o `DEFAULT_ADMIN_ROLE` é concedido apenas à carteira de deploy no constructor. Se a chave privada dessa carteira for comprometida ou perdida, não há mecanismo de recuperação ou transferência do papel de administrador sem redeploy. Em produção, recomenda-se usar uma multisig (ex: Gnosis Safe) como ADM.

- **`grantRole` / `revokeRole` de baixo nível:** o OpenZeppelin AccessControl expõe `grantRole()` e `revokeRole()` para qualquer portador do `DEFAULT_ADMIN_ROLE`. Essas funções não emitem os eventos customizados do projeto (ex: `AuditorAprovado`), apenas os eventos padrão do AccessControl (`RoleGranted`, `RoleRevoked`). Uso direto bypass a rastreabilidade do sistema.

- **`onlyLedger` no GreenSeal:** verifica `msg.sender == ledger`. Se o RecyclingLedger for redeployado, `setLedger()` deve ser chamado novamente — caso contrário, nenhum selo poderá ser emitido. Não há validação de que `_ledger` é um contrato (não um EOA).

---

## 2. Prevenção de Reentrância

### Status atual

**Nenhum dos contratos utiliza `ReentrancyGuard`.**

### Análise de risco

A reentrância ocorre quando um contrato externo malicioso é chamado no meio de uma função e chama de volta o contrato original antes que o estado seja atualizado.

#### RecyclingLedger

A única chamada a contrato externo é `greenSeal.emitirSelo()` dentro de `_verificarEmissaoSelo()`, que é chamada ao final de `validarPesagem()`.

```solidity
function validarPesagem(uint256 id) external onlyRole(AUDITOR_ROLE) {
    // ... toda a atualização de estado ocorre ANTES ...
    p.status = Status.VALIDADO;          // ← estado atualizado
    p.auditor = msg.sender;              // ← estado atualizado
    kgPorEmpresa[p.empresaId] += p.pesoKg; // ← estado atualizado
    totalKgValidadoGlobal += p.pesoKg;   // ← estado atualizado

    emit PesagemValidada(id, msg.sender);
    _verificarEmissaoSelo(p.empresaId);  // ← chamada externa por último
}
```

O padrão **Checks-Effects-Interactions** (CEI) é seguido: todo o estado é atualizado antes da chamada externa. Isso mitiga reentrância clássica — um GreenSeal malicioso que tentasse re-entrar em `validarPesagem()` encontraria a pesagem com status `VALIDADO`, não mais `PENDENTE`, e a segunda chamada reverteria com `"Status invalido"`.

#### GreenSeal

A função `emitirSelo()` chama `_mint()` e `_setTokenURI()`, ambas internas do OpenZeppelin ERC721. `_mint()` chama `onERC721Received()` em contratos receptores (padrão ERC721). Como o mint é feito para `address(this)` (o próprio contrato GreenSeal), e GreenSeal não implementa `onERC721Received`, não há chamada de retorno externa.

### Avaliação

O risco de reentrância é **baixo** no estado atual devido ao padrão CEI em `validarPesagem()` e ao mint para `address(this)`. Contudo, a ausência de `ReentrancyGuard` é uma fragilidade arquitetural — qualquer alteração futura que adicione chamadas externas antes das atualizações de estado poderia introduzir vulnerabilidade.

**Recomendação:** adicionar `ReentrancyGuard` ao `RecyclingLedger` como medida de defesa em profundidade.

---

## 3. Validação de Parâmetros

### Validações implementadas

| Função | Parâmetro | Validação | Erro |
|---|---|---|---|
| `registrarPesagem()` | `pesoKg` | `> 0` | `"Peso invalido"` |
| `registrarPesagem()` | `ipfsHash` | `bytes(ipfsHash).length > 0` | `"IPFS hash obrigatorio"` |
| `validarPesagem()` | `id` | `id > 0 && id <= totalPesagens` | `"Pesagem inexistente"` |
| `validarPesagem()` | `p.status` | `== Status.PENDENTE` | `"Status invalido"` |
| `validarPesagem()` | `msg.sender` | `!= p.cooperativa` | `"Auditor nao pode validar propria pesagem"` |
| `rejeitarPesagem()` | `id` | `id > 0 && id <= totalPesagens` | `"Pesagem inexistente"` |
| `rejeitarPesagem()` | `p.status` | `== Status.PENDENTE` | `"Status invalido"` |
| `setKgParaSelo()` | `kg` | `> 0` | `"Valor invalido"` |
| `cadastrarCooperativa()` | `msg.sender` | `cooperativas[msg.sender].carteira == address(0)` | `"Cooperativa ja cadastrada"` |
| `solicitarAuditor()` | `msg.sender` | `auditores[msg.sender].carteira == address(0)` | `"Auditor ja solicitado"` |
| `aprovarAuditor()` etc. | `carteira` | `auditores[carteira].carteira != address(0)` | `"Auditor nao encontrado"` |
| `bloquearCooperativa()` etc. | `carteira` | `cooperativas[carteira].carteira != address(0)` | `"Cooperativa nao encontrada"` |

### Ausências de validação (riscos)

| Parâmetro | Função | Risco |
|---|---|---|
| `nome`, `cnpj`, `cidade` etc. | `cadastrarCooperativa()` | Strings vazias ou inválidas são aceitas pelo contrato |
| `material` | `registrarPesagem()` | Qualquer string é aceita, inclusive vazia |
| `empresaId` | `registrarPesagem()` | Qualquer string é aceita, sem verificação de empresa cadastrada |
| `documento` | `solicitarAuditor()` | Campo opcional — string vazia aceita, sem validação |
| `_ledger` | `setLedger()` (GreenSeal) | Aceita qualquer `address`, inclusive `address(0)` ou um EOA |
| `motivo` | `rejeitarPesagem()` | Contrato aceita string vazia; validação é apenas no frontend |
| `cnpj` | `cadastrarEmpresaApoiadora()` | Formato não é validado on-chain |

**Recomendação:** adicionar `require(bytes(nome).length > 0, "Nome obrigatorio")` e validações similares para campos críticos. Para `setLedger()`, adicionar `require(_ledger != address(0), "Endereco invalido")`.

---

## 4. Tratamento de Permissões

### Concessão e revogação

Roles são gerenciados exclusivamente via funções do contrato. O ADM não deve usar `grantRole()` / `revokeRole()` diretamente para evitar inconsistências entre o estado do struct (`StatusAuditor`) e o estado do role on-chain.

**Exemplo de inconsistência possível:** ADM chama `grantRole(AUDITOR_ROLE, carteira)` diretamente em vez de `aprovarAuditor(carteira)`. A carteira recebe o role mas `auditores[carteira].status` permanece `PENDENTE` — o painel ADM exibirá o auditor como pendente, mas ele já poderá validar pesagens.

### Separação de papéis

| Papel | Pode registrar pesagem | Pode validar | Pode aprovar auditores |
|---|:---:|:---:|:---:|
| ADM | ❌ | ❌ | ✅ |
| Cooperativa | ✅ | ❌ | ❌ |
| Auditor | ❌ | ✅ | ❌ |

O ADM deliberadamente **não pode** registrar nem validar pesagens sem os roles correspondentes. Isso é um controle correto — o papel administrativo deve ser separado das operações.

### Auto-registro irrestrito

`cadastrarCooperativa()` é chamável por qualquer endereço sem restrição prévia. Isso é intencional (auto-serviço), mas representa uma superfície de ataque para **spam de registros**. Um agente mal-intencionado poderia criar milhares de cooperativas fictícias, inchando os arrays `listaCooperativas` e potencialmente tornando `getListaCooperativas()` custoso ou inutilizável.

**Mitigação atual:** nenhuma — o ADM pode bloquear cooperativas, mas não há limitação de taxa (rate limit) on-chain.

---

## 5. Possibilidade de Pausa

### Status atual

**Nenhum dos contratos implementa mecanismo de pausa (`Pausable`).**

Os contratos não herdam `OpenZeppelin/Pausable` e não possuem função `pause()` / `unpause()`.

### Implicações

Em caso de descoberta de vulnerabilidade crítica, bug grave ou ataque em andamento:

- **Não é possível pausar** o registro de novas pesagens
- **Não é possível pausar** a validação de pesagens
- **Não é possível pausar** a emissão de Selos Verdes
- A única ação disponível é **revogar roles** individualmente, o que não impede que novos atores se cadastrem

### Alternativas disponíveis sem redeploy

| Ação | Efeito |
|---|---|
| Bloquear todas as cooperativas | Para novos registros de pesagens |
| Bloquear todos os auditores | Para novas validações |
| Chamar `setLedger(address(0))` no GreenSeal | Impede emissão de novos selos (quebraria `validarPesagem()` com revert) |

Essas ações são parciais, manuais, custosas em gas e não equivalem a uma pausa real.

**Recomendação:** em versão de produção, herdar `Pausable` e adicionar `whenNotPaused` nas funções de escrita críticas. Controlar `pause()` via multisig ADM.

---

## 6. Imutabilidade

### O que é imutável por design

| Dado | Localização | Pode ser alterado? |
|---|---|---|
| Pesagens (todos os campos exceto status e auditor) | Blockchain | ❌ Nunca |
| Status de pesagem | Blockchain | Apenas PENDENTE → VALIDADO ou REJEITADO (unidirecional) |
| Dados de cadastro de cooperativa | Blockchain | ❌ Nunca |
| Dados de solicitação de auditor | Blockchain | ❌ Nunca |
| Histórico de selos emitidos | Blockchain | ❌ Nunca |
| Eventos on-chain | Blockchain | ❌ Nunca |
| Evidências (fotos, metadata JSON) | IPFS | ❌ Nunca (conteúdo endereçado por hash) |

### O que pode ser alterado

| Dado | Como | Quem |
|---|---|---|
| `kgParaSelo` | `setKgParaSelo()` | ADM |
| Status do auditor | `aprovar/rejeitar/bloquear/desbloquear` | ADM |
| Status da cooperativa | `bloquear/desbloquear` | ADM |
| `ledger` no GreenSeal | `setLedger()` | Owner do GreenSeal |
| Dados da empresa apoiadora | `cadastrarEmpresaApoiadora()` (upsert) | ADM |

### Transições de status (máquina de estados)

```
Pesagem:
  PENDENTE → VALIDADO    (apenas por auditor)
  PENDENTE → REJEITADO   (apenas por auditor)
  VALIDADO → (nenhuma)   ← terminal
  REJEITADO → (nenhuma)  ← terminal

Auditor:
  PENDENTE → APROVADO    (ADM)
  PENDENTE → REJEITADO   (ADM)
  APROVADO → BLOQUEADO   (ADM)
  BLOQUEADO → APROVADO   (ADM)
  REJEITADO → (nenhuma)  ← terminal

Cooperativa:
  ATIVA → BLOQUEADA      (ADM)
  BLOQUEADA → ATIVA      (ADM)
```

### Risco de imutabilidade

Dados incorretos registrados on-chain (CNPJ errado, peso errado, empresaId errado) **não podem ser corrigidos**. O único recurso é registrar uma nova entrada correta e, no caso de pesagens, rejeitar a incorreta (se ainda estiver PENDENTE).

---

## 7. Riscos Conhecidos

### R-01 — Administrador único sem multisig

**Severidade:** Alta  
**Descrição:** O `DEFAULT_ADMIN_ROLE` pertence a uma única carteira (EOA). Se a chave privada for perdida, roubada ou comprometida, toda a governança da plataforma fica inoperante ou nas mãos do atacante.  
**Mitigação recomendada:** Transferir `DEFAULT_ADMIN_ROLE` para uma carteira multisig (ex: Gnosis Safe 2/3).

---

### R-02 — Sem mecanismo de pausa

**Severidade:** Alta  
**Descrição:** Vulnerabilidade descoberta em produção não pode ser contida sem redeploy completo ou ações manuais parciais.  
**Mitigação recomendada:** Implementar `Pausable` do OpenZeppelin com controle via multisig.

---

### R-03 — Spam de cadastros

**Severidade:** Média  
**Descrição:** `cadastrarCooperativa()` e `solicitarAuditor()` aceitam qualquer endereço sem limitação. Um atacante pode criar milhares de registros fictícios, tornando os arrays `listaCooperativas` e `listaAuditores` excessivamente grandes e onerando o painel ADM.  
**Mitigação recomendada:** Adicionar taxa mínima (fee) em ETH para cadastro, ou um mecanismo de whitelist prévia.

---

### R-04 — `empresaId` livre e não validado

**Severidade:** Média  
**Descrição:** Qualquer cooperativa pode registrar pesagens para qualquer string como `empresaId`, inclusive empresas não cadastradas pelo ADM ou IDs que imitam outras empresas (typosquatting). Não há verificação de que a empresa existe na lista do ADM.  
**Mitigação recomendada:** Adicionar `require(empresasApoiadoras[empresaId].ativa, "Empresa nao cadastrada")` em `registrarPesagem()`.

---

### R-05 — Emissão de apenas 1 selo por validação

**Severidade:** Baixa  
**Descrição:** `_verificarEmissaoSelo()` emite no máximo 1 NFT por chamada. Uma pesagem que faça a empresa saltar de 0 para 5.000 kg (com meta de 1.000 kg) deveria gerar 5 selos, mas apenas 1 é emitido. Os demais nunca serão recuperados — a empresa precisará de validações adicionais para atingir cada limiar.  
**Mitigação recomendada:** Substituir `if` por `while` em `_verificarEmissaoSelo()`:

```solidity
// atual (emite no máximo 1):
if (selosDevidos > selosEmitidos) {
    greenSeal.emitirSelo(empresaId, kgPorEmpresa[empresaId]);
}

// corrigido (emite todos os pendentes):
while (selosDevidos > selosEmitidos) {
    greenSeal.emitirSelo(empresaId, kgPorEmpresa[empresaId]);
    selosEmitidos++;
}
```
Atenção: o loop pode consumir muito gas se a diferença for grande — considerar limite máximo de iterações.

---

### R-06 — `setLedger()` sem validação de endereço

**Severidade:** Baixa  
**Descrição:** `GreenSeal.setLedger(address(0))` é aceito sem erro, o que tornaria impossível emitir selos até que `setLedger()` fosse chamado novamente com endereço válido.  
**Mitigação recomendada:** `require(_ledger != address(0), "Endereco invalido")`.

---

### R-07 — Ausência de `ReentrancyGuard`

**Severidade:** Baixa (baixo risco no design atual)  
**Descrição:** Nenhum contrato usa `ReentrancyGuard`. O padrão CEI protege no estado atual, mas alterações futuras podem introduzir vulnerabilidade inadvertidamente.  
**Mitigação recomendada:** Adicionar `ReentrancyGuard` ao `RecyclingLedger` como defesa em profundidade.

---

### R-08 — Strings de dados pessoais on-chain

**Severidade:** Baixa (contexto regulatório)  
**Descrição:** Nome, CNPJ, cidade, contato e documento de auditores e cooperativas são armazenados diretamente on-chain, de forma pública e permanente. Em jurisdições com LGPD/GDPR, isso pode ser problemático pois dados pessoais não podem ser apagados da blockchain.  
**Mitigação recomendada:** Armazenar apenas o hash dos dados off-chain (IPFS/servidor) e verificar integridade pelo hash on-chain.

---

### R-09 — Iteração linear sobre pesagens no frontend

**Severidade:** Baixa (impacto de performance, não segurança)  
**Descrição:** O painel do auditor itera de `i = 1` até `totalPesagens` para encontrar pesagens com status PENDENTE. Com milhares de pesagens, essa operação se torna lenta e pode exceder timeouts de RPC.  
**Mitigação recomendada:** Manter mapping de pesagens pendentes separado, ou usar indexação via eventos (The Graph).

---

## 8. Dependências Externas

### OpenZeppelin Contracts v5

| Componente | Uso | Risco |
|---|---|---|
| `AccessControl` | Controle de roles no RecyclingLedger | Baixo — amplamente auditado |
| `ERC721URIStorage` | NFT no GreenSeal | Baixo — padrão ERC-721 amplamente auditado |
| `Ownable` | Proteção de `setLedger()` | Baixo — implementação mínima e testada |
| `Strings` | Conversão de uint para string no tokenURI | Baixo — função utilitária sem efeito colateral |

**Versão:** `@openzeppelin/contracts ^5.6.1`  
**Status:** OpenZeppelin v5 é a versão atual estável. Atualizações de segurança devem ser monitoradas em [github.com/OpenZeppelin/openzeppelin-contracts/security](https://github.com/OpenZeppelin/openzeppelin-contracts/security).

---

### IPFS / Pinata

| Aspecto | Detalhe | Risco |
|---|---|---|
| **Disponibilidade** | Conteúdo IPFS depende de nós que o hospedam | Médio — se a Pinata encerrar o serviço, evidências podem sumir |
| **Integridade** | CID é hash do conteúdo — imutável por definição | Baixo |
| **Autenticação** | JWT da Pinata protegido em variável de ambiente server-side | Baixo (se bem configurado) |
| **Centralização** | Pinata é um serviço centralizado de pinning | Médio — ponto único de falha para disponibilidade |

**Mitigação recomendada:** usar múltiplos serviços de pinning (ex: Pinata + web3.storage + nó próprio) para garantir persistência das evidências.

---

### Infura (RPC Provider)

| Aspecto | Detalhe | Risco |
|---|---|---|
| **Disponibilidade** | RPC centralizado — indisponível se Infura cair | Médio |
| **Rate limiting** | Plano gratuito tem limite de requisições/segundo | Alto no frontend atual |
| **Censura** | Infura pode bloquear endereços ou regiões | Baixo (Sepolia) |

**Mitigação recomendada:** suportar múltiplos providers RPC (fallback para RPC público), ou usar provider descentralizado (Alchemy, QuickNode ou nó próprio).

---

### MetaMask (wallet provider)

| Aspecto | Detalhe | Risco |
|---|---|---|
| **Disponibilidade** | Extensão de browser — pode estar ausente | Sem impacto nas funções de leitura |
| **Phishing** | Usuários podem ser enganados por sites falsos | Alto — risco de usuário |
| **Atualização** | MetaMask pode mudar API `window.ethereum` | Baixo |

**Mitigação recomendada:** exibir aviso explícito ao usuário para verificar a URL antes de confirmar transações. Considerar suporte a WalletConnect para carteiras móveis.

---

## 9. Auditoria

### Status

**Nenhuma auditoria de segurança externa foi realizada.**

Os contratos foram desenvolvidos e revisados internamente pela equipe do projeto. Não houve revisão por auditores de segurança independentes especializados em smart contracts.

### O que ainda não foi verificado por terceiros

- [ ] Análise estática automatizada (Slither, MythX, Echidna)
- [ ] Revisão manual de lógica de negócio por auditor independente
- [ ] Testes de fuzzing e invariantes
- [ ] Revisão de conformidade com padrões ERC-721
- [ ] Análise de vetores de front-running
- [ ] Análise de manipulação de `block.timestamp`
- [ ] Verificação formal das máquinas de estado
- [ ] Pentest do frontend e APIs

### Ferramentas recomendadas para análise prévia

| Ferramenta | Tipo | Uso |
|---|---|---|
| [Slither](https://github.com/crytic/slither) | Análise estática | `slither contracts/` |
| [MythX](https://mythx.io) | Análise simbólica | Plugin Hardhat |
| [Echidna](https://github.com/crytic/echidna) | Fuzzing | Testes de invariante |
| [Hardhat Coverage](https://github.com/sc-forks/solidity-coverage) | Cobertura de testes | `npx hardhat coverage` |

### O que deve ser feito antes de produção

1. **Auditoria independente:** contratar firma especializada (ex: OpenZeppelin, Trail of Bits, Consensys Diligence)
2. **Corrigir riscos R-01 a R-07** listados na seção 7
3. **Ampliar cobertura de testes:** cobrir edge cases, falhas de role e transições de estado
4. **Migrar ADM para multisig:** nunca usar EOA simples como administrador em produção
5. **Implementar Pausable:** mecanismo de emergência é obrigatório em produção
6. **Bug bounty:** programa de recompensas antes do lançamento público
7. **Verificar contratos no Etherscan:** transparência pública do código-fonte

---

### Nota final

A documentação oficial do Solidity alerta:

> *"Security considerations: Software that handles money needs to be written with security in mind. If any check fails, the transaction is reverted. Make sure you fully understand the security implications of each function call."*

Smart contracts são **imutáveis após o deploy** e **irreversíveis em caso de exploit**. Dinheiro roubado de um contrato auditado de forma inadequada geralmente não pode ser recuperado.

**Não faça deploy em mainnet sem auditoria.**

---

*Documento de análise interna — GreenTrack v1.0 · Atualizado em 2026-06-04*
