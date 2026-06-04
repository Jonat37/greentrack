# CONTRACT_OVERVIEW — GreenTrack Smart Contracts

> Documentação técnica completa dos smart contracts da plataforma GreenTrack.
> Rede: **Ethereum Sepolia Testnet** · Solidity `^0.8.24` · OpenZeppelin v5

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [RecyclingLedger.sol](#2-recyclingledgersol)
3. [GreenSeal.sol](#3-greenSealsol)
4. [MockGreenSeal.sol](#4-mockgreenSealsol)
5. [Relação entre Contratos](#5-relação-entre-contratos)
6. [Heranças OpenZeppelin](#6-heranças-openzeppelin)
7. [Sistema de Roles](#7-sistema-de-roles)
8. [Regras de Emissão do Selo Verde](#8-regras-de-emissão-do-selo-verde)
9. [Eventos On-Chain](#9-eventos-on-chain)
10. [Limitações Conhecidas](#10-limitações-conhecidas)
11. [Endereços na Sepolia](#11-endereços-na-sepolia)

---

## 1. Visão Geral da Arquitetura

O sistema é composto por **dois contratos de produção** e **um mock de teste**:

```
┌────────────────────────────────────────────────────────┐
│                   USUÁRIO / FRONTEND                   │
└───────────────────────────┬────────────────────────────┘
                            │ chama
              ┌─────────────▼──────────────┐
              │      RecyclingLedger        │  ← contrato principal
              │  (AccessControl + Lógica)   │
              └─────────────┬──────────────┘
                            │ chama via interface IGreenSeal
              ┌─────────────▼──────────────┐
              │          GreenSeal          │  ← contrato NFT
              │    (ERC721 + Ownable)       │
              └────────────────────────────┘
```

**Fluxo de implantação obrigatório:**
1. Deploy `GreenSeal` → obtém endereço `A`
2. Deploy `RecyclingLedger(A)` → passa endereço do GreenSeal no constructor
3. Chamar `GreenSeal.setLedger(RecyclingLedger)` → autoriza o Ledger a emitir NFTs

---

## 2. RecyclingLedger.sol

### Responsabilidade

Contrato principal da plataforma. Centraliza toda a lógica de negócio: gerenciamento de identidades (cooperativas, auditores), registro e validação de pesagens, governança administrativa e disparo automático da emissão de Selos Verdes.

### Endereço na Sepolia
```
0x602AE94DAbA2D99a0253c5e010a3d9dc77ACB616
```

### Herança
```solidity
contract RecyclingLedger is AccessControl
```

### Enums

```solidity
enum Status          { PENDENTE, VALIDADO, REJEITADO }
enum StatusAuditor   { PENDENTE, APROVADO, REJEITADO, BLOQUEADO }
enum StatusCooperativa { ATIVA, BLOQUEADA }
```

### Structs

#### `Pesagem`
Representa um registro de coleta de material reciclável.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uint256` | ID único incremental (começa em 1) |
| `cooperativa` | `address` | Carteira que registrou a pesagem |
| `material` | `string` | Tipo de material (ex: "PET") |
| `pesoKg` | `uint256` | Peso em quilogramas |
| `ipfsHash` | `string` | CID IPFS da metadata JSON com evidências |
| `timestamp` | `uint256` | `block.timestamp` do registro |
| `status` | `Status` | Estado atual da pesagem |
| `auditor` | `address` | Carteira que processou (validou/rejeitou) |
| `empresaId` | `string` | ID da empresa apoiadora (ex: CNPJ) |
| `localColeta` | `string` | Local onde o material foi coletado |
| `dataColeta` | `string` | Data da coleta informada pela cooperativa |
| `observacao` | `string` | Notas adicionais opcionais |

#### `Cooperativa`
Dados cadastrais de uma cooperativa de reciclagem.

| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | `string` | Nome da cooperativa |
| `cnpj` | `string` | CNPJ |
| `cidade` | `string` | Cidade sede |
| `estado` | `string` | Sigla do estado (UF) |
| `material` | `string` | Material principal trabalhado |
| `contato` | `string` | E-mail ou telefone (opcional) |
| `carteira` | `address` | Endereço blockchain — usado como chave de existência |
| `status` | `StatusCooperativa` | `ATIVA` ou `BLOQUEADA` |
| `cadastradoEm` | `uint256` | `block.timestamp` do cadastro |

#### `SolicitacaoAuditor`
Dados de uma solicitação de acesso como auditor.

| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | `string` | Nome completo |
| `organizacao` | `string` | Entidade ou empresa |
| `tipoAuditor` | `string` | Ex: "ONG", "Ecoponto" |
| `cidade` | `string` | Cidade |
| `estado` | `string` | UF |
| `documento` | `string` | CPF ou registro (opcional) |
| `carteira` | `address` | Endereço blockchain — chave de existência |
| `status` | `StatusAuditor` | Estado da solicitação |
| `solicitadoEm` | `uint256` | `block.timestamp` da solicitação |

#### `EmpresaApoiadora`
Empresa cadastrada pelo ADM que receberá certificações.

| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | `string` | Nome da empresa |
| `cnpj` | `string` | CNPJ (opcional) |
| `ativa` | `bool` | Flag de existência para upsert |

---

### Variáveis de Estado

| Variável | Tipo | Visibilidade | Descrição |
|---|---|---|---|
| `totalPesagens` | `uint256` | `public` | Contador global; também é o ID da última pesagem |
| `totalKgValidadoGlobal` | `uint256` | `public` | Soma de todos os kg validados na plataforma |
| `kgParaSelo` | `uint256` | `public` | Meta de kg para emissão de 1 Selo Verde (padrão: 1000) |
| `pesagens` | `mapping(uint256 => Pesagem)` | `public` | Pesagens por ID |
| `pesagensPorEmpresa` | `mapping(string => uint256[])` | `public` | IDs de pesagens VALIDADAS por empresa |
| `kgPorEmpresa` | `mapping(string => uint256)` | `public` | Total de kg validados por empresa |
| `pesagensPorCooperativa` | `mapping(address => uint256[])` | `public` | Todos os IDs de pesagens por cooperativa |
| `cooperativas` | `mapping(address => Cooperativa)` | `public` | Dados de cada cooperativa por endereço |
| `listaCooperativas` | `address[]` | `public` | Endereços de todas as cooperativas cadastradas |
| `auditores` | `mapping(address => SolicitacaoAuditor)` | `public` | Dados de cada auditor por endereço |
| `listaAuditores` | `address[]` | `public` | Endereços de todos os solicitantes |
| `empresasApoiadoras` | `mapping(string => EmpresaApoiadora)` | `public` | Dados das empresas por ID |
| `listaEmpresasApoiadoras` | `string[]` | `public` | IDs de todas as empresas cadastradas |
| `greenSeal` | `IGreenSeal` | `public` | Referência ao contrato GreenSeal |
| `empresas` | `string[]` | `private` | IDs de empresas com pelo menos 1 pesagem validada |
| `empresaRegistrada` | `mapping(string => bool)` | `private` | Flag para deduplicar `empresas[]` |

---

### Interface `IGreenSeal`

Contrato parcial usado pelo RecyclingLedger para comunicar-se com o GreenSeal sem importar o contrato completo:

```solidity
interface IGreenSeal {
    function emitirSelo(string calldata empresaId, uint256 totalKg) external;
    function totalSelosPorEmpresa(string calldata empresaId) external view returns (uint256);
}
```

---

### Funções Públicas

#### `cadastrarCooperativa`
```solidity
function cadastrarCooperativa(
    string calldata nome,
    string calldata cnpj,
    string calldata cidade,
    string calldata estado,
    string calldata material,
    string calldata contato
) external
```
- **Acesso:** qualquer carteira
- **Guard:** `cooperativas[msg.sender].carteira == address(0)` — impede duplicatas
- **Efeitos:** cria struct, adiciona a `listaCooperativas`, chama `_grantRole(COOPERATIVA_ROLE)`
- **Evento:** `CooperativaCadastrada`

#### `solicitarAuditor`
```solidity
function solicitarAuditor(
    string calldata nome,
    string calldata organizacao,
    string calldata tipoAuditor,
    string calldata cidade,
    string calldata estado,
    string calldata documento
) external
```
- **Acesso:** qualquer carteira
- **Guard:** `auditores[msg.sender].carteira == address(0)` — impede duplicatas
- **Efeitos:** cria struct com `status = PENDENTE`, adiciona a `listaAuditores`
- **Sem role:** o AUDITOR_ROLE só é concedido após aprovação do ADM
- **Evento:** `AuditorSolicitado`

#### `aprovarAuditor / rejeitarAuditor / bloquearAuditor / desbloquearAuditor`
```solidity
function aprovarAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
function rejeitarAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
function bloquearAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
function desbloquearAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
```
- **Acesso:** `DEFAULT_ADMIN_ROLE`
- **Guard:** `auditores[carteira].carteira != address(0)` — verifica existência
- **Efeitos:** altera `status` + concede ou revoga `AUDITOR_ROLE`

#### `bloquearCooperativa / desbloquearCooperativa`
```solidity
function bloquearCooperativa(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
function desbloquearCooperativa(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
```
- **Acesso:** `DEFAULT_ADMIN_ROLE`
- **Efeitos:** altera `status` + concede ou revoga `COOPERATIVA_ROLE`

#### `setKgParaSelo`
```solidity
function setKgParaSelo(uint256 kg) external onlyRole(DEFAULT_ADMIN_ROLE)
```
- **Acesso:** `DEFAULT_ADMIN_ROLE`
- **Guard:** `kg > 0`
- **Efeitos:** atualiza `kgParaSelo` — aplica-se a validações futuras
- **Evento:** `KgParaSeloAtualizado`

#### `cadastrarEmpresaApoiadora`
```solidity
function cadastrarEmpresaApoiadora(
    string calldata empresaId,
    string calldata nome,
    string calldata cnpj
) external onlyRole(DEFAULT_ADMIN_ROLE)
```
- **Acesso:** `DEFAULT_ADMIN_ROLE`
- **Efeito:** upsert — se ID novo, adiciona a `listaEmpresasApoiadoras`; se existente, atualiza dados
- **Evento:** `EmpresaApoiadoraCadastrada`

#### `registrarPesagem`
```solidity
function registrarPesagem(
    string calldata material,
    uint256 pesoKg,
    string calldata ipfsHash,
    string calldata empresaId,
    string calldata localColeta,
    string calldata dataColeta,
    string calldata observacao
) external onlyRole(COOPERATIVA_ROLE)
```
- **Acesso:** `COOPERATIVA_ROLE`
- **Guards:** `pesoKg > 0`, `bytes(ipfsHash).length > 0`
- **Efeitos:** cria struct com `status = PENDENTE`, adiciona a `pesagensPorCooperativa`
- **Nota:** `id = ++totalPesagens` (pre-incremento — começa em 1)
- **Evento:** `PesagemRegistrada`

#### `validarPesagem`
```solidity
function validarPesagem(uint256 id) external onlyRole(AUDITOR_ROLE)
```
- **Acesso:** `AUDITOR_ROLE`
- **Guards:**
  - `id > 0 && id <= totalPesagens`
  - `p.status == Status.PENDENTE`
  - `p.cooperativa != msg.sender` (conflito de interesse)
- **Efeitos:**
  - `p.status = VALIDADO`, `p.auditor = msg.sender`
  - Acumula kg em `kgPorEmpresa` e `totalKgValidadoGlobal`
  - Registra empresa em `empresas[]` se for a primeira vez
  - Chama `_verificarEmissaoSelo()`
- **Evento:** `PesagemValidada`

#### `rejeitarPesagem`
```solidity
function rejeitarPesagem(uint256 id, string calldata motivo) external onlyRole(AUDITOR_ROLE)
```
- **Acesso:** `AUDITOR_ROLE`
- **Guards:** `id` válido, `p.status == PENDENTE`
- **Efeitos:** `p.status = REJEITADO`, `p.auditor = msg.sender`
- **Nota:** `motivo` vai apenas para o evento, **não é armazenado** em storage (economia de gas)
- **Evento:** `PesagemRejeitada`

---

### Função Interna

#### `_verificarEmissaoSelo`
```solidity
function _verificarEmissaoSelo(string memory empresaId) internal
```
- Chamada automaticamente ao final de `validarPesagem()`
- Calcula `selosDevidos = kgPorEmpresa[empresaId] / kgParaSelo`
- Compara com `greenSeal.totalSelosPorEmpresa(empresaId)`
- Se `selosDevidos > selosEmitidos` → chama `greenSeal.emitirSelo()`
- Emite apenas **1 selo por chamada**, mesmo que a diferença seja > 1

---

### Funções de Leitura (view)

| Função | Retorno | Descrição |
|---|---|---|
| `getPesagensPorEmpresa(string)` | `uint256[]` | IDs de pesagens VALIDADAS de uma empresa |
| `getPesagensPorCooperativa(address)` | `uint256[]` | Todos os IDs de pesagens de uma cooperativa |
| `getEmpresas()` | `string[]` | Empresas com ao menos 1 pesagem validada |
| `getListaCooperativas()` | `address[]` | Endereços de todas as cooperativas |
| `getListaAuditores()` | `address[]` | Endereços de todos os solicitantes de auditor |
| `getListaEmpresasApoiadoras()` | `string[]` | IDs das empresas cadastradas pelo ADM |

---

## 3. GreenSeal.sol

### Responsabilidade

Contrato NFT ERC-721. Emite e armazena os Selos Verdes (certificados de impacto ambiental) de forma imutável na blockchain. Só pode emitir novos tokens quando chamado pelo `RecyclingLedger` autorizado.

### Endereço na Sepolia
```
0x46769676B561D5981F2569A57a4de5ABA78fD011
```

### Herança
```solidity
contract GreenSeal is ERC721URIStorage, Ownable
```

### Variáveis de Estado

| Variável | Tipo | Visibilidade | Descrição |
|---|---|---|---|
| `nextTokenId` | `uint256` | `public` | Contador de tokens; após mint, reflete o último ID criado |
| `totalSelosPorEmpresa` | `mapping(string => uint256)` | `public` | Quantidade de selos emitidos por empresa |
| `_selosPorEmpresa` | `mapping(string => uint256[])` | `private` | TokenIds emitidos por empresa |
| `seloEmpresa` | `mapping(uint256 => string)` | `public` | Empresa dona de cada token |
| `seloKg` | `mapping(uint256 => uint256)` | `public` | Total de kg da empresa no momento da emissão |
| `ledger` | `address` | `public` | Endereço autorizado a chamar `emitirSelo()` |

### Modifier

```solidity
modifier onlyLedger() {
    require(msg.sender == ledger, "Apenas o Ledger pode emitir");
    _;
}
```
Garante que apenas o `RecyclingLedger` configurado pode emitir NFTs. Qualquer outra chamada externa a `emitirSelo()` é revertida.

### Funções

#### `setLedger`
```solidity
function setLedger(address _ledger) external onlyOwner
```
- **Acesso:** `owner` (carteira de deploy)
- **Efeito:** define qual endereço pode chamar `emitirSelo()`
- Chamado uma vez durante o deploy, logo após o RecyclingLedger ser publicado

#### `emitirSelo`
```solidity
function emitirSelo(string calldata empresaId, uint256 totalKg) external onlyLedger
```
- **Acesso:** exclusivo ao endereço configurado em `ledger`
- **Efeitos:**
  1. Incrementa `nextTokenId`
  2. Monta `tokenURI`: `"ipfs://greentrack/{empresaId}/{tokenId}"`
  3. `_mint(address(this), tokenId)` — NFT fica custodiado no próprio contrato
  4. `_setTokenURI(tokenId, uri)`
  5. Atualiza todos os mapeamentos de rastreabilidade
- **Evento:** `SeloEmitido`

#### `getSelosPorEmpresa`
```solidity
function getSelosPorEmpresa(string calldata empresaId)
    external view returns (uint256[] memory)
```
- Retorna todos os tokenIds emitidos para uma empresa
- Necessário porque `_selosPorEmpresa` é `private`

### Formato do tokenURI

```
ipfs://greentrack/{empresaId}/{tokenId}
```

**Exemplos:**
```
ipfs://greentrack/00.000.000/0001-00/1
ipfs://greentrack/empresa-abc/2
```

> **Nota:** O URI aponta para um path IPFS estático que **não existe** como arquivo real no IPFS no estado atual da implementação. Para produção, seria necessário fazer upload dos metadados NFT (JSON com atributos) no IPFS e usar o CID real.

---

## 4. MockGreenSeal.sol

### Responsabilidade

Contrato substituto do `GreenSeal` para uso exclusivo nos testes automatizados do `RecyclingLedger`. Implementa apenas o subconjunto da interface `IGreenSeal` necessário para testar a lógica de emissão sem o overhead do ERC-721 completo.

### Características

```solidity
contract MockGreenSeal {
    mapping(string => uint256) public totalSelosPorEmpresa;

    function emitirSelo(string calldata empresaId, uint256 totalKg) external {
        totalSelosPorEmpresa[empresaId]++;
        emit SeloEmitidoMock(empresaId, totalKg);
    }
}
```

- **Não herda** nenhum contrato OpenZeppelin
- **Não possui** controle de acesso — qualquer um pode chamar `emitirSelo()`
- **Não emite** NFTs reais — apenas incrementa o contador
- **Não deve** ser deployado em produção

---

## 5. Relação entre Contratos

### Diagrama de dependência

```
RecyclingLedger
  │
  ├── herda: OpenZeppelin/AccessControl
  │
  ├── depende (interface): IGreenSeal
  │     └── implementado por: GreenSeal (produção)
  │                        ou: MockGreenSeal (testes)
  │
  └── referencia: greenSeal (endereço configurado no constructor)

GreenSeal
  ├── herda: OpenZeppelin/ERC721URIStorage
  ├── herda: OpenZeppelin/Ownable
  └── referencia: ledger (endereço configurado via setLedger)
```

### Comunicação entre contratos

| De | Para | Função | Quando |
|---|---|---|---|
| `RecyclingLedger` | `GreenSeal` | `emitirSelo()` | Após validar pesagem que atinge meta |
| `RecyclingLedger` | `GreenSeal` | `totalSelosPorEmpresa()` | Para calcular se deve emitir novo selo |

### Acoplamento e segurança

- O `RecyclingLedger` só conhece o `GreenSeal` via interface `IGreenSeal`, não via import direto. Isso permite substituir o GreenSeal por qualquer contrato que implemente a interface.
- O `GreenSeal` só aceita chamadas de `emitirSelo()` do endereço exato configurado em `setLedger()`. Uma mudança de endereço do Ledger (redeploy) requer nova chamada a `setLedger()`.

---

## 6. Heranças OpenZeppelin

### `AccessControl` (RecyclingLedger)

**Pacote:** `@openzeppelin/contracts/access/AccessControl.sol`
**Versão:** v5.x

Fornece um sistema de controle de acesso baseado em roles (papéis):

| Função herdada | Uso no projeto |
|---|---|
| `_grantRole(role, account)` | Conceder roles em cadastro e aprovação |
| `_revokeRole(role, account)` | Revogar roles em bloqueio e rejeição |
| `hasRole(role, account)` | Verificado pelo frontend para detectar permissões |
| `onlyRole(role)` | Modifier usado em `registrarPesagem`, `validarPesagem`, funções ADM |

**Roles padrão:**
- `DEFAULT_ADMIN_ROLE = bytes32(0)` — gerenciador supremo, concedido ao deployer no constructor

---

### `ERC721URIStorage` (GreenSeal)

**Pacote:** `@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol`

Extensão do padrão ERC-721 que permite armazenar um URI de metadados por token individualmente.

| Função herdada | Uso no projeto |
|---|---|
| `_mint(to, tokenId)` | Cria o NFT, custodiado pelo próprio contrato (`address(this)`) |
| `_setTokenURI(tokenId, uri)` | Define o `tokenURI` de cada selo |
| `tokenURI(tokenId)` | Leitura pública do URI de um token |

---

### `Ownable` (GreenSeal)

**Pacote:** `@openzeppelin/contracts/access/Ownable.sol`

Controle de acesso simples baseado em um único dono.

| Função herdada | Uso no projeto |
|---|---|
| `onlyOwner` | Protege `setLedger()` — apenas o deployer pode configurar o Ledger |

---

### `Strings` (GreenSeal)

**Pacote:** `@openzeppelin/contracts/utils/Strings.sol`

| Função herdada | Uso no projeto |
|---|---|
| `uint256.toString()` | Converte `tokenId` para string ao montar o `tokenURI` |

---

## 7. Sistema de Roles

### Definição

```solidity
bytes32 public constant COOPERATIVA_ROLE = keccak256("COOPERATIVA_ROLE");
bytes32 public constant AUDITOR_ROLE     = keccak256("AUDITOR_ROLE");
// DEFAULT_ADMIN_ROLE = bytes32(0) — herdado do AccessControl
```

### Hashes (Ethereum Keccak-256)

| Role | Hash |
|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x0000000000000000000000000000000000000000000000000000000000000000` |
| `COOPERATIVA_ROLE` | `0x8f4f2da22e8ac8f11e15f9fc141ccd062d7a3609e5f698de72c57c2f41b25fe3` |
| `AUDITOR_ROLE` | `0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c` |

### Ciclo de vida dos roles

```
DEFAULT_ADMIN_ROLE
  └── concedido ao deployer no constructor — permanente

COOPERATIVA_ROLE
  ├── concedido em: cadastrarCooperativa()
  ├── revogado em: bloquearCooperativa()
  └── restaurado em: desbloquearCooperativa()

AUDITOR_ROLE
  ├── concedido em: aprovarAuditor()
  ├── revogado em: rejeitarAuditor() / bloquearAuditor()
  └── restaurado em: desbloquearAuditor()
```

### Matriz de permissões por função

| Função | Sem role | COOPERATIVA | AUDITOR | ADM |
|---|:---:|:---:|:---:|:---:|
| `cadastrarCooperativa()` | ✅ | ❌¹ | ✅ | ✅ |
| `solicitarAuditor()` | ✅ | ✅ | ❌¹ | ✅ |
| `registrarPesagem()` | ❌ | ✅ | ❌ | ❌ |
| `validarPesagem()` | ❌ | ❌ | ✅ | ❌ |
| `rejeitarPesagem()` | ❌ | ❌ | ✅ | ❌ |
| `aprovarAuditor()` | ❌ | ❌ | ❌ | ✅ |
| `bloquearAuditor()` | ❌ | ❌ | ❌ | ✅ |
| `setKgParaSelo()` | ❌ | ❌ | ❌ | ✅ |
| `cadastrarEmpresaApoiadora()` | ❌ | ❌ | ❌ | ✅ |
| Funções `view` / `get*` | ✅ | ✅ | ✅ | ✅ |

> ¹ Tecnicamente possível enviar a transação, mas o contrato reverte por duplicata (carteira já cadastrada).

---

## 8. Regras de Emissão do Selo Verde

### Lógica central

```solidity
function _verificarEmissaoSelo(string memory empresaId) internal {
    uint256 selosDevidos  = kgPorEmpresa[empresaId] / kgParaSelo;
    uint256 selosEmitidos = greenSeal.totalSelosPorEmpresa(empresaId);

    if (selosDevidos > selosEmitidos) {
        greenSeal.emitirSelo(empresaId, kgPorEmpresa[empresaId]);
    }
}
```

### Propriedades da emissão

| Propriedade | Valor |
|---|---|
| Padrão NFT | ERC-721 (não fungível) |
| Quem emite | `RecyclingLedger` (via `IGreenSeal`) |
| Para quem | `address(this)` — o próprio contrato GreenSeal |
| Quando | Na mesma transação de `validarPesagem()` |
| Meta padrão | 1.000 kg validados por empresa |
| Meta configurável | Sim, pelo ADM via `setKgParaSelo()` |
| Selos por chamada | Máximo 1 por chamada a `_verificarEmissaoSelo()` |

### Tabela de emissão com meta de 1.000 kg

| Total kg da empresa | Selos devidos | Selos já emitidos | Emite? | Novo total emitido |
|---|---|---|---|---|
| 500 | 0 | 0 | ❌ | 0 |
| 1.000 | 1 | 0 | ✅ | 1 |
| 1.500 | 1 | 1 | ❌ | 1 |
| 2.000 | 2 | 1 | ✅ | 2 |
| 3.000 | 3 | 2 | ✅ | 3 |
| 3.001 | 3 | 3 | ❌ | 3 |

### Ponto de atenção — pesagens grandes

Se uma única pesagem fizer a empresa ir de 0 kg para 3.500 kg:
- `selosDevidos = 3.500 / 1.000 = 3`
- `selosEmitidos = 0`
- `selosDevidos > selosEmitidos` → **emite apenas 1 selo**
- O segundo e terceiro selos só serão emitidos em validações futuras

Isso ocorre porque `_verificarEmissaoSelo()` é chamada apenas uma vez por `validarPesagem()` e emite no máximo 1 NFT por chamada.

---

## 9. Eventos On-Chain

### RecyclingLedger

| Evento | Parâmetros | Quando |
|---|---|---|
| `PesagemRegistrada` | `id`, `cooperativa`, `material`, `pesoKg`, `ipfsHash`, `empresaId` | `registrarPesagem()` |
| `PesagemValidada` | `id`, `auditor` | `validarPesagem()` |
| `PesagemRejeitada` | `id`, `auditor`, `motivo` | `rejeitarPesagem()` |
| `CooperativaCadastrada` | `carteira`, `nome` | `cadastrarCooperativa()` |
| `AuditorSolicitado` | `carteira`, `nome` | `solicitarAuditor()` |
| `AuditorAprovado` | `carteira` | `aprovarAuditor()` |
| `AuditorRejeitado` | `carteira` | `rejeitarAuditor()` |
| `AuditorBloqueado` | `carteira` | `bloquearAuditor()` |
| `AuditorDesbloqueado` | `carteira` | `desbloquearAuditor()` |
| `CooperativaBloqueada` | `carteira` | `bloquearCooperativa()` |
| `CooperativaDesbloqueada` | `carteira` | `desbloquearCooperativa()` |
| `KgParaSeloAtualizado` | `novoValor` | `setKgParaSelo()` |
| `EmpresaApoiadoraCadastrada` | `empresaId`, `nome` | `cadastrarEmpresaApoiadora()` |

### GreenSeal

| Evento | Parâmetros | Quando |
|---|---|---|
| `SeloEmitido` | `tokenId`, `empresaId`, `totalKg`, `tokenURI` | `emitirSelo()` |

### MockGreenSeal (apenas testes)

| Evento | Parâmetros | Quando |
|---|---|---|
| `SeloEmitidoMock` | `empresaId`, `totalKg` | `emitirSelo()` do mock |

> Todos os eventos são verificáveis no Sepolia Etherscan pelos endereços dos contratos.

---

## 10. Limitações Conhecidas

### Limitações de design

| Limitação | Descrição | Impacto |
|---|---|---|
| **tokenURI estático** | O URI `ipfs://greentrack/...` não aponta para arquivo real no IPFS | NFT sem metadados reais; marketplaces não exibem imagem |
| **NFT não transferível** | O GreenSeal minta para `address(this)` — sem função de transferência para empresas | Empresa não "possui" o NFT na carteira |
| **1 ADM fixo** | `DEFAULT_ADMIN_ROLE` é concedido apenas ao deployer; sem mecanismo de transferência de ADM | Se a chave do deployer for perdida, a governança trava |
| **Sem paginação** | `getListaCooperativas()`, `getListaAuditores()` retornam arrays completos | Com centenas de registros, chamadas podem exceder limite de gas em leitura |
| **Pesagem grande = 1 selo** | `_verificarEmissaoSelo()` emite no máximo 1 selo por chamada | Empresa que salta de 0 para 5.000 kg recebe apenas 1 selo na transação |
| **Sem notificação** | Cooperativa não é notificada quando pesagem é rejeitada | Cooperativa precisa verificar o painel periodicamente |
| **Dados cadastrais imutáveis** | Nome, CNPJ, etc. de cooperativas e auditores não podem ser alterados após registro | Erros de cadastro ficam permanentes on-chain |

### Limitações de escala

| Limitação | Descrição |
|---|---|
| **Rate limiting de RPC** | Com RPC gratuito (Infura free), muitas chamadas simultâneas retornam 429. O frontend mitiga com chamadas sequenciais. |
| **Gas por pesagem** | Cada pesagem armazena múltiplos campos de string no storage — custo de gas é alto para strings longas |
| **Loops de leitura** | O painel do auditor itera de 1 a `totalPesagens` para filtrar pendentes — ineficiente em escala |

### Limitações de segurança

| Limitação | Descrição |
|---|---|
| **Sem validação de CNPJ** | O contrato aceita qualquer string como CNPJ — não valida formato |
| **empresaId é string livre** | Qualquer cooperativa pode registrar pesagem para qualquer `empresaId`, mesmo não cadastrado pelo ADM |
| **Motivo de rejeição no evento** | O motivo da rejeição é apenas emitido como evento, não armazenado no storage — inacessível diretamente via `pesagens[id]` |

---

## 11. Endereços na Sepolia

| Contrato | Endereço | Etherscan |
|---|---|---|
| RecyclingLedger | `0x602AE94DAbA2D99a0253c5e010a3d9dc77ACB616` | [Ver no Etherscan](https://sepolia.etherscan.io/address/0x602AE94DAbA2D99a0253c5e010a3d9dc77ACB616) |
| GreenSeal | `0x46769676B561D5981F2569A57a4de5ABA78fD011` | [Ver no Etherscan](https://sepolia.etherscan.io/address/0x46769676B561D5981F2569A57a4de5ABA78fD011) |

### Configurações de deploy

| Parâmetro | Valor |
|---|---|
| Rede | Ethereum Sepolia (chainId: 11155111) |
| Compilador | Solidity 0.8.24 |
| EVM Target | Cancun |
| Optimizer | Habilitado (200 runs) |
| viaIR | true (necessário para contratos com muitos parâmetros) |

---

*Documentação gerada com base no código-fonte — GreenTrack v1.0*
