# FUNCTIONALITIES — GreenTrack

> Documento completo de todas as funcionalidades implementadas na plataforma.

---

## Sumário

1. [Smart Contracts](#1-smart-contracts)
2. [Telas e Páginas](#2-telas-e-páginas)
3. [Componentes Reutilizáveis](#3-componentes-reutilizáveis)
4. [APIs e Utilitários](#4-apis-e-utilitários)
5. [Contexto e Autenticação](#5-contexto-e-autenticação)
6. [Fluxos de Negócio](#6-fluxos-de-negócio)
7. [Regras de Negócio e Validações](#7-regras-de-negócio-e-validações)
8. [Funcionalidades por Role](#8-funcionalidades-por-role)

---

## 1. Smart Contracts

### 1.1 RecyclingLedger.sol

Contrato principal. Gerencia pesagens, papéis (roles), cooperativas, auditores e empresas apoiadoras.

#### Enums

| Enum | Valores |
|---|---|
| `Status` | `PENDENTE (0)`, `VALIDADO (1)`, `REJEITADO (2)` |
| `StatusAuditor` | `PENDENTE (0)`, `APROVADO (1)`, `REJEITADO (2)`, `BLOQUEADO (3)` |
| `StatusCooperativa` | `ATIVA (0)`, `BLOQUEADA (1)` |

#### Structs

**Pesagem**

| Campo | Tipo | Descrição |
|---|---|---|
| id | uint256 | ID único incremental |
| cooperativa | address | Carteira que registrou |
| material | string | Tipo de material |
| pesoKg | uint256 | Peso em kg |
| ipfsHash | string | CID IPFS com metadados e fotos |
| timestamp | uint256 | Data/hora do registro |
| status | Status | Estado atual da pesagem |
| auditor | address | Carteira que validou ou rejeitou |
| empresaId | string | ID da empresa apoiadora |
| localColeta | string | Local onde o material foi coletado |
| dataColeta | string | Data informada da coleta |
| observacao | string | Notas adicionais |

**Cooperativa**

| Campo | Tipo | Descrição |
|---|---|---|
| nome | string | Nome da cooperativa |
| cnpj | string | CNPJ |
| cidade | string | Cidade sede |
| estado | string | UF |
| material | string | Material principal trabalhado |
| contato | string | E-mail ou telefone (opcional) |
| carteira | address | Endereço blockchain |
| status | StatusCooperativa | Ativa ou Bloqueada |
| cadastradoEm | uint256 | Timestamp do cadastro |

**SolicitacaoAuditor**

| Campo | Tipo | Descrição |
|---|---|---|
| nome | string | Nome completo |
| organizacao | string | Entidade ou empresa |
| tipoAuditor | string | Tipo (independente, ONG, etc.) |
| cidade | string | Cidade |
| estado | string | UF |
| documento | string | CPF ou registro (opcional) |
| carteira | address | Endereço blockchain |
| status | StatusAuditor | Estado da solicitação |
| solicitadoEm | uint256 | Timestamp da solicitação |

**EmpresaApoiadora**

| Campo | Tipo | Descrição |
|---|---|---|
| nome | string | Nome da empresa |
| cnpj | string | CNPJ (opcional) |
| ativa | bool | Se está ativa na plataforma |

#### Roles (AccessControl OpenZeppelin)

| Role | Hash | Quem tem | O que pode |
|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x000...000` | Carteira deployer | Gerenciar toda a governança |
| `COOPERATIVA_ROLE` | `keccak256("COOPERATIVA_ROLE")` | Cooperativas cadastradas | Registrar pesagens |
| `AUDITOR_ROLE` | `keccak256("AUDITOR_ROLE")` | Auditores aprovados | Validar e rejeitar pesagens |

#### Funções públicas

| Função | Quem pode chamar | Parâmetros | O que faz |
|---|---|---|---|
| `cadastrarCooperativa()` | Qualquer carteira | nome, cnpj, cidade, estado, material, contato | Auto-cadastro: cria registro e concede `COOPERATIVA_ROLE` imediatamente |
| `solicitarAuditor()` | Qualquer carteira | nome, organizacao, tipoAuditor, cidade, estado, documento | Cria solicitação com status `PENDENTE`, aguarda aprovação do ADM |
| `registrarPesagem()` | `COOPERATIVA_ROLE` | material, pesoKg, ipfsHash, empresaId, localColeta, dataColeta, observacao | Registra pesagem com status `PENDENTE` |
| `validarPesagem()` | `AUDITOR_ROLE` | id | Muda para `VALIDADO`, acumula kg na empresa, dispara verificação de Selo Verde |
| `rejeitarPesagem()` | `AUDITOR_ROLE` | id, motivo | Muda para `REJEITADO`, registra auditor responsável |

#### Funções administrativas (`DEFAULT_ADMIN_ROLE`)

| Função | Parâmetros | O que faz |
|---|---|---|
| `aprovarAuditor()` | carteira | Status → `APROVADO` + concede `AUDITOR_ROLE` |
| `rejeitarAuditor()` | carteira | Status → `REJEITADO` + revoga `AUDITOR_ROLE` |
| `bloquearAuditor()` | carteira | Status → `BLOQUEADO` + revoga `AUDITOR_ROLE` |
| `desbloquearAuditor()` | carteira | Status → `APROVADO` + concede `AUDITOR_ROLE` |
| `bloquearCooperativa()` | carteira | Status → `BLOQUEADA` + revoga `COOPERATIVA_ROLE` |
| `desbloquearCooperativa()` | carteira | Status → `ATIVA` + concede `COOPERATIVA_ROLE` |
| `setKgParaSelo()` | kg | Define nova meta de kg para emissão de 1 Selo Verde |
| `cadastrarEmpresaApoiadora()` | empresaId, nome, cnpj | Registra empresa que receberá certificados |

#### Funções de leitura (view)

| Função | Retorna | Descrição |
|---|---|---|
| `getPesagensPorEmpresa(empresaId)` | `uint256[]` | IDs de pesagens VALIDADAS de uma empresa |
| `getPesagensPorCooperativa(carteira)` | `uint256[]` | IDs de todas as pesagens de uma cooperativa |
| `getEmpresas()` | `string[]` | IDs de empresas com pelo menos 1 pesagem validada |
| `getListaCooperativas()` | `address[]` | Endereços de todas as cooperativas cadastradas |
| `getListaAuditores()` | `address[]` | Endereços de todos que solicitaram ser auditor |
| `getListaEmpresasApoiadoras()` | `string[]` | IDs das empresas apoiadoras cadastradas pelo ADM |

#### Variáveis públicas

| Variável | Tipo | Descrição |
|---|---|---|
| `totalPesagens` | uint256 | Contador global de pesagens registradas |
| `totalKgValidadoGlobal` | uint256 | Soma de todos os kg validados na plataforma |
| `kgParaSelo` | uint256 | Meta atual de kg para emissão de 1 Selo Verde (padrão: 1000) |

#### Eventos emitidos

| Evento | Quando |
|---|---|
| `PesagemRegistrada` | Cooperativa registra pesagem |
| `PesagemValidada` | Auditor valida pesagem |
| `PesagemRejeitada` | Auditor rejeita pesagem |
| `CooperativaCadastrada` | Cooperativa se auto-cadastra |
| `AuditorSolicitado` | Auditor solicita cadastro |
| `AuditorAprovado / Rejeitado / Bloqueado / Desbloqueado` | ADM realiza ação sobre auditor |
| `CooperativaBloqueada / Desbloqueada` | ADM realiza ação sobre cooperativa |
| `KgParaSeloAtualizado` | ADM altera meta de kg |
| `EmpresaApoiadoraCadastrada` | ADM cadastra empresa |

---

### 1.2 GreenSeal.sol

Contrato NFT ERC-721. Emite automaticamente Selos Verdes (NFTs de certificação de impacto ambiental).

#### Funções

| Função | Quem pode | O que faz |
|---|---|---|
| `setLedger(address)` | `owner` | Autoriza o RecyclingLedger a emitir selos |
| `emitirSelo(empresaId, totalKg)` | RecyclingLedger (via `onlyLedger`) | Cria novo NFT para a empresa, registra kg no momento da emissão |
| `getSelosPorEmpresa(empresaId)` | view pública | Retorna array de tokenIds emitidos para uma empresa |

#### Mapeamentos públicos

| Mapeamento | Tipo | Descrição |
|---|---|---|
| `totalSelosPorEmpresa` | `mapping(string => uint256)` | Quantidade de selos emitidos por empresa |
| `seloEmpresa` | `mapping(uint256 => string)` | Empresa dona de cada token |
| `seloKg` | `mapping(uint256 => uint256)` | Kg totais no momento de emissão de cada token |

#### Formato do tokenURI

```
ipfs://greentrack/{empresaId}/{tokenId}
```

---

## 2. Telas e Páginas

### 2.1 Landing Page (`/`)

Acessível sem login.

**Seções:**
- **Header** com botão "Entrar na Plataforma" → `/login`
- **Hero** com dois botões: "Entrar / Cadastrar" → `/login` e "Dashboard Público" → `/dashboard`
- **Métricas em tempo real** (3 cards): pesagens registradas, kg validados, selos emitidos
- **Como Funciona** com 3 passos ilustrados
- **CTA final** com botão de acesso à plataforma
- **Footer** com créditos e rede

> O dashboard completo (ranking, selos, QR Codes) vive em `/dashboard` — ver seção 2.10.

---

### 2.2 Login (`/login`)

**Funcionalidades:**
- Botão "Conectar MetaMask" abre popup da extensão
- Após conexão, exibe endereço formatado da carteira
- Detecta automaticamente o role da carteira e redireciona:
  - `ADM` → `/admin`
  - `Auditor` → `/auditor`
  - `Cooperativa` → `/cooperativa`
- Se sem role, verifica status no contrato:
  - Auditor com solicitação **pendente** → badge "⏳ Aguardando aprovação" + mensagem explicativa
  - Auditor **rejeitado** → badge "❌ Solicitação rejeitada"
  - Auditor **bloqueado** → badge "🚫 Acesso bloqueado"
  - Cooperativa cadastrada mas sem role → badge de aviso
  - Sem cadastro → exibe botões de cadastro
- Link "Dashboard público" no header

---

### 2.3 Cadastro de Cooperativa (`/cadastro/cooperativa`)

**Campos do formulário:**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome da Cooperativa | Texto | Sim |
| CNPJ | Texto | Sim |
| Cidade | Texto | Sim |
| Estado | Select (27 UFs) | Sim |
| Material principal | Select (7 opções) | Sim |
| E-mail ou contato | Texto | Não |
| Carteira MetaMask | Botão conectar / exibe endereço | Sim |

**Fluxo após envio:**
1. Valida campos obrigatórios
2. Conecta MetaMask (se não conectado)
3. Chama `cadastrarCooperativa()` no contrato
4. Aguarda confirmação da transação
5. Atualiza roles no contexto (`refreshRoles`)
6. Exibe mensagem de sucesso
7. Botão "Ir para o Painel" redireciona para `/cooperativa`

---

### 2.4 Cadastro de Auditor (`/cadastro/auditor`)

**Campos do formulário:**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome completo | Texto | Sim |
| Organização ou entidade | Texto | Sim |
| Tipo de auditor | Select (4 opções) | Sim |
| Cidade | Texto | Sim |
| Estado | Select (27 UFs) | Sim |
| Documento de identificação | Texto | Não |
| Carteira MetaMask | Botão conectar / exibe endereço | Sim |

**Tipos de auditor disponíveis:** Auditor independente, Ecoponto, ONG, Fiscal parceiro

**Fluxo após envio:**
1. Valida campos obrigatórios
2. Conecta MetaMask
3. Chama `solicitarAuditor()` no contrato
4. Exibe mensagem: "Solicitação enviada. Um administrador precisa aprovar sua carteira antes que você possa validar pesagens."

---

### 2.5 Painel Administrativo (`/admin`)

Acesso exclusivo: `DEFAULT_ADMIN_ROLE`. Redireciona para `/login` se não autorizado.

**Cards de métricas (7):**
- Total de cooperativas cadastradas
- Auditores aprovados
- Auditores pendentes
- Pesagens registradas
- Kg validados globais
- Selos Verdes emitidos
- Meta atual (kg por selo)

**Abas:**

#### Aba — Auditores
- Lista todos os auditores com: nome, tipo, organização, cidade/estado, endereço, badge de status
- Ações disponíveis por status:
  - `PENDENTE`: botões **Aprovar** e **Rejeitar**
  - `APROVADO`: botão **Bloquear**
  - `BLOQUEADO`: botão **Desbloquear**

#### Aba — Cooperativas
- Lista todas as cooperativas com: nome, CNPJ, material, cidade/estado, endereço, badge de status
- Ações disponíveis:
  - `ATIVA`: botão **Bloquear**
  - `BLOQUEADA`: botão **Desbloquear**

#### Aba — Empresas Apoiadoras
- Formulário para cadastrar nova empresa (ID, nome, CNPJ)
- Lista de empresas cadastradas com link para página pública

#### Aba — Configurações
- Campo para alterar a meta de kg necessários para emissão de 1 Selo Verde
- Exibe valor atual
- Botão "Salvar" chama `setKgParaSelo()` no contrato

---

### 2.6 Painel da Cooperativa (`/cooperativa`)

Acesso exclusivo: `COOPERATIVA_ROLE`.

**Informações exibidas:**
- Nome, material principal, cidade/estado, CNPJ
- Botão "+ Nova Pesagem" → `/cooperativa/pesagem`

**Cards de estatísticas (4):**
- Kg enviados (todas as pesagens)
- Kg validados
- Kg pendentes
- Kg rejeitados

**Tabela de histórico de pesagens:**

| Coluna | Descrição |
|---|---|
| ID | Número da pesagem |
| Data | Data de registro na blockchain |
| Empresa | ID da empresa apoiadora |
| Material | Tipo de material |
| Peso | Kg |
| Status | Badge colorido (PENDENTE / VALIDADA / REJEITADA) |
| Auditor | Endereço formatado do auditor (se validado/rejeitado) |
| Evidências | Link "Ver →" para IPFS com fotos |

**Bloco de Selos Verdes (se houver):**
- Grid de cards por selo emitido
- Cada card: Token ID, empresa, kg certificados, QR Code compacto, botão "Abrir página pública"

---

### 2.7 Nova Pesagem (`/cooperativa/pesagem`)

Acesso exclusivo: `COOPERATIVA_ROLE`.

**Campos do formulário:**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Empresa apoiadora | Dropdown (se cadastradas) ou texto livre | Sim |
| Tipo de material | Select (PET, Alumínio, Papelão, Vidro, Eletrônicos, Plástico Misto, Outros) | Sim |
| Peso em kg | Número (mín. 1) | Sim |
| Local da coleta | Texto | Não |
| Data da pesagem | Date picker | Não |
| Foto do tíquete da balança | Upload de imagem | Sim |
| Foto dos fardos / material | Upload de imagem | Sim |
| Observação | Textarea | Não |

**Etapas do processo de envio:**
1. `📤 Enviando foto da balança para IPFS...`
2. `📤 Enviando foto dos fardos para IPFS...`
3. `🔗 Criando metadados no IPFS...`
4. `⛓️ Conectando carteira...`
5. `📝 Registrando pesagem na blockchain...`

**Tela de sucesso:**
- Exibe ID da pesagem extraído do evento on-chain
- Botão "Nova pesagem" (reseta formulário)
- Link "Ver histórico" → `/cooperativa`

---

### 2.8 Painel do Auditor (`/auditor`)

Acesso exclusivo: `AUDITOR_ROLE`.

**Informações do auditor** (se tiver solicitação registrada): nome, tipo, organização.

**Lista de pesagens pendentes:**

Para cada pesagem:
- Badge `PENDENTE`
- ID e material
- Peso em kg e empresa
- Local e data da coleta (se preenchidos)
- Endereço da cooperativa (formatado)
- Data de registro
- Link "Ver evidências no IPFS" (abre em nova aba)
- Botão **✅ Validar**
- Botão **❌ Rejeitar**

**Modal de rejeição:**
- Campo textarea para motivo (obrigatório)
- Botão "Confirmar Rejeição"
- Botão "Cancelar"

**Estados visuais:**
- Carregando: "Carregando pesagens pendentes..."
- Sem pendentes: card verde "Nenhuma pesagem pendente de validação"

---

### 2.9 Certificado Público de Empresa (`/empresa/[id]`)

Acessível sem login. URL compartilhável e acessível por QR Code.

**Dados exibidos:**
- ID da empresa
- **SealCard**: total de kg, pesagens validadas, selos emitidos, barra de progresso
- **QRDisplay**: QR Code com botões de copiar link e baixar PNG
- **Histórico de pesagens validadas**: ID, material, data, peso em kg

---

### 2.10 Dashboard Público (`/dashboard`)

Acessível sem login. Carrega todos os dados diretamente da blockchain (sem MetaMask).

**Seções:**

1. **Métricas Globais** (6 cards):
   - Kg validados (`totalKgValidadoGlobal`)
   - Pesagens registradas (`totalPesagens`)
   - Pesagens validadas (soma das pesagens validadas por empresa)
   - Selos emitidos (`GreenSeal.nextTokenId`)
   - Cooperativas (`getListaCooperativas().length`)
   - Empresas certificadas (`getEmpresas().length`)

2. **Ranking de Empresas por Kg Certificado:**
   - Tabela ordenada por kg decrescente
   - Colunas: posição, empresa, materiais, kg certificados, selos, pesagens

3. **Últimos Selos Verdes Emitidos** (até 5, mais recentes primeiro):
   - Card por selo com: Token ID, empresa, kg certificados, material(is)
   - QR Code (URL de verificação) embutido
   - Botão "Ver auditoria completa" → `/verify/...`
   - Link "Ver no Etherscan"

4. **Contratos na Blockchain:**
   - Cards do RecyclingLedger e GreenSeal com endereço e link Etherscan

**Carregamento:** todas as chamadas RPC são sequenciais com `delay` para evitar rate limiting do Infura. Falha de RPC exibe banner de erro.

---

### 2.11 Verificação do Selo Verde (`/verify/[chainId]/[contractAddress]/[tokenId]`)

Página pública de auditoria de um Selo Verde, aberta ao escanear o QR Code. Não requer login.

**Validação de URL:**
- `chainId` deve ser `11155111` (Sepolia)
- `contractAddress` deve corresponder ao endereço do GreenSeal
- URLs inválidas exibem mensagem de erro sem consultar a blockchain

**Dados exibidos:**

| Bloco | Conteúdo |
|---|---|
| Cabeçalho do selo | Token ID, status "✅ Válido", empresa, kg certificados, material(is), rede, contratos (com links Etherscan), transação de mint |
| Cooperativas envolvidas | Endereços únicos das cooperativas das pesagens, com links Etherscan |
| QR Code | URL pública de verificação do próprio selo |
| On-chain vs Off-chain | Bloco explicativo sobre o que fica na blockchain vs IPFS |
| Pesagens certificadas | Lista das pesagens validadas que compõem o selo |

**Por pesagem certificada:**
- ID, status "✅ CERTIFICADA", data
- Material, peso em kg
- Empresa, cooperativa (link Etherscan), auditor (link Etherscan)
- CID IPFS e link para evidências
- Hash da transação de registro (link Etherscan)
- Hash da transação de validação (link Etherscan)

**Busca de hashes de transação:** via `queryFilter` nos eventos `SeloEmitido`, `PesagemRegistrada` e `PesagemValidada` (janela de ~9000 blocos). Caso não encontre, exibe fallback com link genérico para o Etherscan.

---

## 3. Componentes Reutilizáveis

### SealCard

**Props:** `empresaId`, `totalKg`, `totalPesagens`, `selosEmitidos`

**Exibe:**
- 3 métricas: kg validados, pesagens, selos
- Barra de progresso animada em direção ao próximo selo
- Percentual de progresso
- Mensagem dinâmica:
  - "Faltam X kg para o próximo Selo Verde"
  - "Novo selo disponível para emissão!" (quando atinge meta exata)

**Cálculo:**
```
kgNoProximo = totalKg % kgParaSelo
progresso   = (kgNoProximo / kgParaSelo) * 100
faltam      = kgParaSelo - kgNoProximo
```

---

### QRDisplay

**Props:**
- `url` — URL completa a codificar (tem prioridade). Usada para a URL de verificação do selo.
- `empresaId` — fallback: se `url` não for passada, gera `{NEXT_PUBLIC_APP_URL}/empresa/{empresaId}`
- `compact` — boolean, padrão `false`

**Modo compacto:** QR Code 100×100 sem botões (usado nos cards de selos)

**Modo normal:**
- QR Code 180×180 em verde (`#16a34a`)
- Exibe a URL codificada abaixo do QR
- Botão **Copiar link** — copia URL para clipboard (fallback via `execCommand`)
- Botão **Baixar QR** — converte SVG → Canvas → PNG e faz download

**Hidratação:** o componente usa um guard `mounted` (via `useEffect`) e renderiza um skeleton no SSR. Isso evita erro de hydration mismatch causado por valores de `process.env` que podem divergir entre servidor e cliente.

**URL codificada:**
- Selos: `{NEXT_PUBLIC_APP_URL}/verify/{chainId}/{contractAddress}/{tokenId}` (via `getVerifyUrl()`)
- Empresa (legado): `{NEXT_PUBLIC_APP_URL}/empresa/{empresaId}`

---

## 4. APIs e Utilitários

### 4.1 API — Upload de Arquivo IPFS (`POST /api/ipfs/upload`)

Recebe `FormData` com campo `file`, faz upload para Pinata e retorna o CID.

**Response:** `{ "cid": "QmXxxx..." }`

---

### 4.2 API — Upload de JSON IPFS (`POST /api/ipfs/json`)

Recebe `{ objeto, nome }`, faz upload do JSON para Pinata e retorna o CID.

**Response:** `{ "cid": "QmXxxx..." }`

---

### 4.3 IPFS Utils (`frontend/utils/ipfs.js`)

| Função | O que faz |
|---|---|
| `uploadArquivoIPFS(file)` | Envia arquivo para IPFS via `/api/ipfs/upload`, retorna CID |
| `uploadJSONIPFS(objeto, nome)` | Envia JSON para IPFS via `/api/ipfs/json`, retorna CID |
| `criarMetadataPesagem(dados)` | Monta objeto de metadata padronizado e faz upload |
| `getIPFSUrl(cid)` | Converte CID em URL pública via gateway Pinata |

**Estrutura do metadata de pesagem:**
```json
{
  "versao": "1.0",
  "tipo": "pesagem_reciclagem",
  "material": "PET",
  "pesoKg": 350,
  "empresaId": "00.000.000/0001-00",
  "localColeta": "Galpão Central SP",
  "dataColeta": "2026-06-04",
  "observacao": "...",
  "timestamp": "2026-06-04T18:00:00.000Z",
  "evidencias": {
    "foto_balanca": "ipfs://Qm...",
    "foto_fardos": "ipfs://Qm..."
  }
}
```

---

### 4.4 Contract Utils (`frontend/utils/contract.js`)

| Função | O que faz |
|---|---|
| `getLedgerReadOnly()` | Instância do RecyclingLedger para leitura (JsonRpcProvider, sem batch) |
| `getLedgerSigner(signer)` | Instância do RecyclingLedger para transações |
| `getSealReadOnly()` | Instância do GreenSeal para leitura |
| `getSealSigner(signer)` | Instância do GreenSeal para transações |
| `getVerifyUrl(tokenId)` | Gera a URL pública de verificação: `{APP_URL}/verify/11155111/{SEAL_ADDRESS}/{tokenId}` |
| `getEtherscanTx(txHash)` | Link da transação no Sepolia Etherscan |
| `getEtherscanAddress(address)` | Link do endereço no Sepolia Etherscan |
| `getEtherscanToken(tokenId)` | Link do token NFT no Sepolia Etherscan |
| `conectarCarteira()` | Solicita acesso ao MetaMask, valida rede Sepolia, retorna `{signer, address}` |

**Validação de rede em `conectarCarteira()`:**
- Verifica Chain ID atual (deve ser `0xaa36a7` — Sepolia)
- Tenta trocar de rede automaticamente
- Se rede não existir no MetaMask: adiciona Sepolia automaticamente

---

## 5. Contexto e Autenticação

### WalletContext (`frontend/contexts/WalletContext.jsx`)

Contexto global React com estado de carteira e roles.

**Estado fornecido:**

| Propriedade | Tipo | Descrição |
|---|---|---|
| `address` | `string \| null` | Endereço da carteira conectada |
| `roles` | `{ isAdmin, isAuditor, isCooperativa }` | Roles detectados on-chain |
| `loaded` | `boolean` | Se a verificação inicial de roles foi concluída |
| `loading` | `boolean` | Se está em processo de conexão |

**Funções fornecidas:**

| Função | O que faz |
|---|---|
| `conectar()` | Conecta MetaMask, valida Sepolia, busca roles |
| `desconectar()` | Limpa address e roles do estado |
| `refreshRoles()` | Rebusca os roles do endereço atual (usado após cadastro) |

**Comportamento automático:**
- Ao montar, verifica se MetaMask já tem contas conectadas e restaura o estado
- Escuta evento `accountsChanged` do MetaMask para atualizar em troca de conta

**Detecção de roles (sequencial para evitar rate limiting):**
1. `hasRole(DEFAULT_ADMIN_ROLE, address)` → `isAdmin`
2. `hasRole(AUDITOR_ROLE, address)` → `isAuditor`
3. `hasRole(COOPERATIVA_ROLE, address)` → `isCooperativa`

---

## 6. Fluxos de Negócio

### Fluxo 1 — Cooperativa se cadastra e registra uma pesagem

```
/cadastro/cooperativa
  → Preenche formulário + conecta MetaMask
  → cadastrarCooperativa() → recebe COOPERATIVA_ROLE
  → refreshRoles() → redireciona para /cooperativa

/cooperativa/pesagem
  → Seleciona empresa, material, peso, local, data
  → Faz upload das fotos para IPFS (2 arquivos)
  → Cria metadata JSON e faz upload para IPFS
  → registrarPesagem() → pesagem #N criada com status PENDENTE

/cooperativa
  → Tabela mostra pesagem #N como PENDENTE
```

---

### Fluxo 2 — Auditor valida uma pesagem

```
/auditor
  → Lista pesagens com status PENDENTE
  → Auditor abre evidências no IPFS para verificar
  → Clica "Validar"
    → validarPesagem(id)
    → Status muda para VALIDADO
    → Kg somam ao total da empresa
    → Se empresa atingiu meta: GreenSeal.emitirSelo() é chamado automaticamente

  OU

  → Clica "Rejeitar"
    → Modal pede motivo
    → rejeitarPesagem(id, motivo)
    → Status muda para REJEITADO
```

---

### Fluxo 3 — Emissão automática do Selo Verde NFT

```
validarPesagem() é chamada pelo auditor
  → RecyclingLedger._verificarEmissaoSelo(empresaId)
  → kgPorEmpresa[empresaId] / kgParaSelo > totalSelosPorEmpresa[empresaId]?
    → SIM: GreenSeal.emitirSelo(empresaId, totalKg)
      → _mint(address(this), tokenId)  ← NFT fica no contrato GreenSeal
      → _selosPorEmpresa[empresaId].push(tokenId)
      → evento SeloEmitido emitido
```

---

### Fluxo 4 — Auditor solicita acesso e aguarda aprovação

```
/cadastro/auditor
  → Preenche formulário + conecta MetaMask
  → solicitarAuditor() → status PENDENTE no contrato

/login (ao tentar entrar)
  → Sem AUDITOR_ROLE
  → Consulta ledger.auditores(address)
  → status == PENDENTE → exibe "⏳ Aguardando aprovação"

/admin (ADM)
  → Aba "Auditores" lista solicitação
  → ADM clica "Aprovar"
    → aprovarAuditor(carteira)
    → Status → APROVADO + AUDITOR_ROLE concedido

/login (auditor tenta de novo)
  → hasRole(AUDITOR_ROLE) = true
  → Redireciona para /auditor
```

---

### Fluxo 5 — Governança pelo Administrador

```
/admin
  → Aba Auditores: Aprovar / Rejeitar / Bloquear / Desbloquear
  → Aba Cooperativas: Bloquear / Desbloquear
  → Aba Empresas: Cadastrar novas empresas apoiadoras
  → Aba Configurações: Alterar meta de kg/selo
```

---

## 7. Regras de Negócio e Validações

### Pesagens

- Peso deve ser maior que zero
- Hash IPFS é obrigatório
- Auditor não pode validar pesagem de sua própria cooperativa
- Apenas pesagens com status `PENDENTE` podem ser validadas ou rejeitadas
- Rejeição exige motivo (validado no frontend)
- Pesagens `VALIDADAS` contam para o acúmulo de kg da empresa

### Cooperativas

- Cada carteira pode se cadastrar apenas uma vez
- Recebe `COOPERATIVA_ROLE` imediatamente após o cadastro
- Se bloqueada: perde o role e não pode registrar pesagens
- Se desbloqueada: role é restaurado

### Auditores

- Cada carteira pode solicitar apenas uma vez
- Não recebe role até aprovação do ADM
- Se aprovado: recebe `AUDITOR_ROLE`
- Se rejeitado ou bloqueado: sem role / role revogado
- Se desbloqueado: role restaurado como `APROVADO`

### Selos Verdes

- Emitidos automaticamente ao validar pesagem que ultrapassa a meta
- Meta padrão: 1.000 kg (configurável pelo ADM)
- Selos são cumulativos: 2.000 kg = 2 selos, 3.000 kg = 3 selos, etc.
- NFT fica custodiado no próprio contrato `GreenSeal` (`address(this)`)
- Cada empresa possui uma contagem independente de selos

---

## 8. Funcionalidades por Role

### Público (sem login)

- [x] Ver métricas globais da plataforma em tempo real
- [x] Ver página pública de qualquer empresa (`/empresa/[id]`)
- [x] Ver selos emitidos, kg validados e histórico de pesagens de uma empresa
- [x] Escanear QR Code da empresa
- [x] Copiar link do certificado
- [x] Baixar QR Code como PNG
- [x] Solicitar cadastro como cooperativa
- [x] Solicitar cadastro como auditor

### Cooperativa (`COOPERATIVA_ROLE`)

- [x] Ver informações do próprio cadastro
- [x] Ver estatísticas de kg (enviados, validados, pendentes, rejeitados)
- [x] Registrar nova pesagem com fotos como evidência
- [x] Acompanhar status de cada pesagem
- [x] Ver selos emitidos a partir das próprias pesagens
- [x] Compartilhar página pública do certificado via QR Code

### Auditor (`AUDITOR_ROLE`)

- [x] Ver lista de pesagens pendentes de validação
- [x] Acessar evidências fotográficas no IPFS
- [x] Validar pesagem aprovada
- [x] Rejeitar pesagem com motivo obrigatório
- [x] Ver informações do próprio cadastro de auditor

### Administrador (`DEFAULT_ADMIN_ROLE`)

- [x] Ver métricas completas da plataforma
- [x] Aprovar solicitações de auditor
- [x] Rejeitar solicitações de auditor
- [x] Bloquear auditores ativos
- [x] Desbloquear auditores bloqueados
- [x] Bloquear cooperativas (fraude ou spam)
- [x] Desbloquear cooperativas bloqueadas
- [x] Cadastrar empresas apoiadoras na blockchain
- [x] Alterar a meta de kg necessários para emissão de Selo Verde

---

*Documento gerado automaticamente com base no estado atual do código — GreenTrack v1.0*
