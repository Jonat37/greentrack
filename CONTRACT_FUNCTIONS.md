# CONTRACT_FUNCTIONS — GreenTrack

> Documentação detalhada de cada função dos smart contracts.
> Rede: **Ethereum Sepolia** · Solidity `^0.8.24`

---

## Sumário

### RecyclingLedger

| Função | Tipo | Acesso |
|---|---|---|
| [cadastrarCooperativa](#cadastrarcooperativa) | write | público |
| [solicitarAuditor](#solicitarauditor) | write | público |
| [aprovarAuditor](#aprovarauditor) | write | ADM |
| [rejeitarAuditor](#rejeitarauditor) | write | ADM |
| [bloquearAuditor](#bloquearauditor) | write | ADM |
| [desbloquearAuditor](#desbloquearauditor) | write | ADM |
| [bloquearCooperativa](#bloquearcooperativa) | write | ADM |
| [desbloquearCooperativa](#desbloquearcooperativa) | write | ADM |
| [setKgParaSelo](#setkgparaselo) | write | ADM |
| [cadastrarEmpresaApoiadora](#cadastrarempresaapoiadora) | write | ADM |
| [registrarPesagem](#registrarpesagem) | write | Cooperativa |
| [validarPesagem](#validarpesagem) | write | Auditor |
| [rejeitarPesagem](#rejeitarpesagem) | write | Auditor |
| [getPesagensPorEmpresa](#getpesagensporempresa) | view | público |
| [getPesagensPorCooperativa](#getpesagensporcooperativa) | view | público |
| [getEmpresas](#getempresas) | view | público |
| [getListaCooperativas](#getlistacooperativas) | view | público |
| [getListaAuditores](#getlistaauditores) | view | público |
| [getListaEmpresasApoiadoras](#getlistaempresasapoiadoras) | view | público |

### GreenSeal

| Função | Tipo | Acesso |
|---|---|---|
| [setLedger](#setledger) | write | owner |
| [emitirSelo](#emitirselo) | write | RecyclingLedger |
| [getSelosPorEmpresa](#getselosporempresa) | view | público |

---

## RecyclingLedger

---

## cadastrarCooperativa

### Descrição
Registra uma nova cooperativa na plataforma. O cadastro é auto-serviço: qualquer carteira pode se registrar sem aprovação prévia. Ao confirmar, a carteira recebe automaticamente o `COOPERATIVA_ROLE` e fica habilitada a registrar pesagens imediatamente.

### Assinatura
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

### Quem pode chamar
Qualquer endereço. A carteira não pode já estar cadastrada como cooperativa.

### Parâmetros
- `nome` — Nome da cooperativa. Ex: `"Cooperativa Verde SP"`
- `cnpj` — CNPJ da cooperativa. Ex: `"00.000.000/0001-00"`
- `cidade` — Cidade sede. Ex: `"São Paulo"`
- `estado` — Sigla do estado (UF). Ex: `"SP"`
- `material` — Material principal trabalhado. Ex: `"PET"`
- `contato` — E-mail ou telefone de contato (pode ser string vazia)

### Retorno
Nenhum.

### Evento
```solidity
event CooperativaCadastrada(address indexed carteira, string nome)
```

### Efeitos colaterais
- Salva struct `Cooperativa` no mapping `cooperativas[msg.sender]`
- Adiciona `msg.sender` ao array `listaCooperativas`
- Concede `COOPERATIVA_ROLE` a `msg.sender` via `_grantRole()`
- Cooperativa inicia com `status = StatusCooperativa.ATIVA`

### Possíveis erros
| Erro | Causa |
|---|---|
| `"Cooperativa ja cadastrada"` | A carteira (`msg.sender`) já possui um registro em `cooperativas` |

---

## solicitarAuditor

### Descrição
Submete uma solicitação de acesso como auditor. O cadastro **não concede** o `AUDITOR_ROLE` imediatamente — a solicitação fica com status `PENDENTE` e aguarda aprovação do administrador. Enquanto pendente, a carteira não pode validar pesagens.

### Assinatura
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

### Quem pode chamar
Qualquer endereço. A carteira não pode já ter enviado uma solicitação.

### Parâmetros
- `nome` — Nome completo do auditor. Ex: `"João da Silva"`
- `organizacao` — Entidade ou empresa que representa. Ex: `"Instituto Verde"`
- `tipoAuditor` — Categoria do auditor. Ex: `"ONG"`, `"Ecoponto"`, `"Auditor independente"`, `"Fiscal parceiro"`
- `cidade` — Cidade de atuação. Ex: `"Recife"`
- `estado` — Sigla do estado. Ex: `"PE"`
- `documento` — CPF ou número de registro profissional (pode ser string vazia)

### Retorno
Nenhum.

### Evento
```solidity
event AuditorSolicitado(address indexed carteira, string nome)
```

### Efeitos colaterais
- Salva struct `SolicitacaoAuditor` no mapping `auditores[msg.sender]` com `status = StatusAuditor.PENDENTE`
- Adiciona `msg.sender` ao array `listaAuditores`
- **Não** concede nenhum role

### Possíveis erros
| Erro | Causa |
|---|---|
| `"Auditor ja solicitado"` | A carteira já possui um registro em `auditores` |

---

## aprovarAuditor

### Descrição
Aprova uma solicitação de auditor pendente. Muda o status para `APROVADO` e concede o `AUDITOR_ROLE` à carteira, permitindo que ela valide pesagens imediatamente.

### Assinatura
```solidity
function aprovarAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### Quem pode chamar
Apenas carteiras com `DEFAULT_ADMIN_ROLE`.

### Parâmetros
- `carteira` — Endereço do auditor a ser aprovado

### Retorno
Nenhum.

### Evento
```solidity
event AuditorAprovado(address indexed carteira)
```

### Efeitos colaterais
- Atualiza `auditores[carteira].status` para `StatusAuditor.APROVADO`
- Concede `AUDITOR_ROLE` via `_grantRole()`

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Chamador não possui `DEFAULT_ADMIN_ROLE` |
| `"Auditor nao encontrado"` | Nenhuma solicitação registrada para o endereço informado |

---

## rejeitarAuditor

### Descrição
Rejeita uma solicitação de auditor. Muda o status para `REJEITADO` e revoga o `AUDITOR_ROLE` caso a carteira o possua. Uma solicitação rejeitada não pode ser reaberta.

### Assinatura
```solidity
function rejeitarAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### Quem pode chamar
Apenas carteiras com `DEFAULT_ADMIN_ROLE`.

### Parâmetros
- `carteira` — Endereço do auditor a ser rejeitado

### Retorno
Nenhum.

### Evento
```solidity
event AuditorRejeitado(address indexed carteira)
```

### Efeitos colaterais
- Atualiza `auditores[carteira].status` para `StatusAuditor.REJEITADO`
- Revoga `AUDITOR_ROLE` via `_revokeRole()` (sem efeito se não possuía o role)

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Chamador não possui `DEFAULT_ADMIN_ROLE` |
| `"Auditor nao encontrado"` | Nenhuma solicitação registrada para o endereço informado |

---

## bloquearAuditor

### Descrição
Bloqueia um auditor previamente aprovado por motivo de conduta inadequada, fraude ou qualquer outra razão administrativa. Revoga o `AUDITOR_ROLE` imediatamente, impedindo novas validações. O histórico de validações anteriores permanece inalterado.

### Assinatura
```solidity
function bloquearAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### Quem pode chamar
Apenas carteiras com `DEFAULT_ADMIN_ROLE`.

### Parâmetros
- `carteira` — Endereço do auditor a ser bloqueado

### Retorno
Nenhum.

### Evento
```solidity
event AuditorBloqueado(address indexed carteira)
```

### Efeitos colaterais
- Atualiza `auditores[carteira].status` para `StatusAuditor.BLOQUEADO`
- Revoga `AUDITOR_ROLE` via `_revokeRole()`

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Chamador não possui `DEFAULT_ADMIN_ROLE` |
| `"Auditor nao encontrado"` | Nenhuma solicitação registrada para o endereço informado |

---

## desbloquearAuditor

### Descrição
Desbloqueia um auditor previamente bloqueado, restaurando seu acesso à plataforma. O status volta para `APROVADO` e o `AUDITOR_ROLE` é concedido novamente.

### Assinatura
```solidity
function desbloquearAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### Quem pode chamar
Apenas carteiras com `DEFAULT_ADMIN_ROLE`.

### Parâmetros
- `carteira` — Endereço do auditor a ser desbloqueado

### Retorno
Nenhum.

### Evento
```solidity
event AuditorDesbloqueado(address indexed carteira)
```

### Efeitos colaterais
- Atualiza `auditores[carteira].status` para `StatusAuditor.APROVADO`
- Concede `AUDITOR_ROLE` via `_grantRole()`

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Chamador não possui `DEFAULT_ADMIN_ROLE` |
| `"Auditor nao encontrado"` | Nenhuma solicitação registrada para o endereço informado |

---

## bloquearCooperativa

### Descrição
Bloqueia uma cooperativa ativa, impedindo o registro de novas pesagens. Pesagens já registradas não são afetadas e continuam disponíveis para validação. Utilizado em casos de fraude, dados incorretos ou spam.

### Assinatura
```solidity
function bloquearCooperativa(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### Quem pode chamar
Apenas carteiras com `DEFAULT_ADMIN_ROLE`.

### Parâmetros
- `carteira` — Endereço da cooperativa a ser bloqueada

### Retorno
Nenhum.

### Evento
```solidity
event CooperativaBloqueada(address indexed carteira)
```

### Efeitos colaterais
- Atualiza `cooperativas[carteira].status` para `StatusCooperativa.BLOQUEADA`
- Revoga `COOPERATIVA_ROLE` via `_revokeRole()`

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Chamador não possui `DEFAULT_ADMIN_ROLE` |
| `"Cooperativa nao encontrada"` | Nenhum cadastro registrado para o endereço informado |

---

## desbloquearCooperativa

### Descrição
Desbloqueia uma cooperativa previamente bloqueada, restaurando sua capacidade de registrar pesagens. O status volta para `ATIVA` e o `COOPERATIVA_ROLE` é concedido novamente.

### Assinatura
```solidity
function desbloquearCooperativa(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### Quem pode chamar
Apenas carteiras com `DEFAULT_ADMIN_ROLE`.

### Parâmetros
- `carteira` — Endereço da cooperativa a ser desbloqueada

### Retorno
Nenhum.

### Evento
```solidity
event CooperativaDesbloqueada(address indexed carteira)
```

### Efeitos colaterais
- Atualiza `cooperativas[carteira].status` para `StatusCooperativa.ATIVA`
- Concede `COOPERATIVA_ROLE` via `_grantRole()`

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Chamador não possui `DEFAULT_ADMIN_ROLE` |
| `"Cooperativa nao encontrada"` | Nenhum cadastro registrado para o endereço informado |

---

## setKgParaSelo

### Descrição
Atualiza a meta de kg validados necessários para que uma empresa receba um Selo Verde NFT. A mudança aplica-se apenas a validações futuras — selos já emitidos e kg já acumulados não são recalculados.

### Assinatura
```solidity
function setKgParaSelo(uint256 kg) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### Quem pode chamar
Apenas carteiras com `DEFAULT_ADMIN_ROLE`.

### Parâmetros
- `kg` — Nova meta em quilogramas. Deve ser maior que zero. Ex: `500`, `1000`, `2000`

### Retorno
Nenhum.

### Evento
```solidity
event KgParaSeloAtualizado(uint256 novoValor)
```

### Efeitos colaterais
- Atualiza a variável de estado `kgParaSelo`
- Todas as próximas chamadas a `_verificarEmissaoSelo()` usarão o novo valor

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Chamador não possui `DEFAULT_ADMIN_ROLE` |
| `"Valor invalido"` | Parâmetro `kg` igual a zero |

---

## cadastrarEmpresaApoiadora

### Descrição
Registra ou atualiza uma empresa apoiadora na plataforma. Empresas cadastradas ficam disponíveis como opções no dropdown do formulário de nova pesagem. O cadastro é identificado por `empresaId` — se o ID já existir, os dados são sobrescritos (upsert).

### Assinatura
```solidity
function cadastrarEmpresaApoiadora(
    string calldata empresaId,
    string calldata nome,
    string calldata cnpj
) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### Quem pode chamar
Apenas carteiras com `DEFAULT_ADMIN_ROLE`.

### Parâmetros
- `empresaId` — Identificador único da empresa, geralmente o CNPJ. Ex: `"00.000.000/0001-00"`
- `nome` — Nome da empresa. Ex: `"Empresa Apoiadora Ltda"`
- `cnpj` — CNPJ (pode ser string vazia se `empresaId` já for o CNPJ)

### Retorno
Nenhum.

### Evento
```solidity
event EmpresaApoiadoraCadastrada(string empresaId, string nome)
```

### Efeitos colaterais
- Se `empresaId` for novo: adiciona ao array `listaEmpresasApoiadoras`
- Salva ou sobrescreve `empresasApoiadoras[empresaId]` com `ativa = true`

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Chamador não possui `DEFAULT_ADMIN_ROLE` |

---

## registrarPesagem

### Descrição
Registra uma nova pesagem de material reciclável na blockchain. A pesagem nasce com status `PENDENTE` e aguarda validação de um auditor aprovado. O hash IPFS deve apontar para a metadata JSON que contém as fotos de evidência e os dados detalhados da coleta.

### Assinatura
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

### Quem pode chamar
Apenas carteiras com `COOPERATIVA_ROLE` (cooperativas cadastradas e não bloqueadas).

### Parâmetros
- `material` — Tipo de material reciclável. Ex: `"PET"`, `"Alumínio"`, `"Papelão"`
- `pesoKg` — Peso em quilogramas. Deve ser maior que zero. Ex: `350`
- `ipfsHash` — CID IPFS da metadata JSON com fotos e dados. Ex: `"QmZDjkKoi7taMwQD5jU44mFnwC9GnadhNU9nDQGDA3aHMf"`
- `empresaId` — ID da empresa apoiadora que gerou o resíduo. Ex: `"00.000.000/0001-00"`
- `localColeta` — Local onde o material foi coletado (opcional, pode ser string vazia). Ex: `"Galpão Central SP"`
- `dataColeta` — Data da coleta informada pela cooperativa (opcional). Ex: `"2026-06-04"`
- `observacao` — Notas adicionais sobre a coleta (opcional). Ex: `"Material separado e prensado"`

### Retorno
Nenhum. O ID gerado é extraído do evento `PesagemRegistrada`.

### Evento
```solidity
event PesagemRegistrada(
    uint256 indexed id,
    address indexed cooperativa,
    string material,
    uint256 pesoKg,
    string ipfsHash,
    string empresaId
)
```

### Efeitos colaterais
- Incrementa `totalPesagens` (pre-incremento — ID começa em 1)
- Salva struct `Pesagem` completo em `pesagens[id]`
- Adiciona `id` ao array `pesagensPorCooperativa[msg.sender]`
- Pesagem inicia com `status = Status.PENDENTE` e `auditor = address(0)`

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Carteira sem `COOPERATIVA_ROLE` (não cadastrada ou bloqueada) |
| `"Peso invalido"` | Parâmetro `pesoKg` igual a zero |
| `"IPFS hash obrigatorio"` | Parâmetro `ipfsHash` é uma string vazia |

---

## validarPesagem

### Descrição
Valida uma pesagem pendente, acumulando os kg para a empresa apoiadora e verificando automaticamente se a meta de emissão do Selo Verde foi atingida. Se atingida, o NFT é emitido na mesma transação. Um auditor não pode validar pesagem registrada pela mesma carteira.

### Assinatura
```solidity
function validarPesagem(uint256 id) external onlyRole(AUDITOR_ROLE)
```

### Quem pode chamar
Apenas carteiras com `AUDITOR_ROLE` (auditores aprovados e não bloqueados).

### Parâmetros
- `id` — ID da pesagem a ser validada. Deve ser um ID existente com status `PENDENTE`

### Retorno
Nenhum.

### Evento
```solidity
event PesagemValidada(uint256 indexed id, address indexed auditor)
```
E potencialmente, se a meta for atingida:
```solidity
event SeloEmitido(uint256 indexed tokenId, string empresaId, uint256 totalKg, string tokenURI)
```

### Efeitos colaterais
- Atualiza `pesagens[id].status` para `Status.VALIDADO`
- Registra `pesagens[id].auditor = msg.sender`
- Adiciona `id` ao array `pesagensPorEmpresa[empresaId]`
- Soma `pesoKg` a `kgPorEmpresa[empresaId]`
- Soma `pesoKg` a `totalKgValidadoGlobal`
- Registra `empresaId` em `empresas[]` se for a primeira pesagem validada dela
- Chama internamente `_verificarEmissaoSelo(empresaId)`:
  - Se `kgPorEmpresa / kgParaSelo > totalSelosPorEmpresa` → chama `greenSeal.emitirSelo()`

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Carteira sem `AUDITOR_ROLE` |
| `"Pesagem inexistente"` | `id` é zero ou maior que `totalPesagens` |
| `"Status invalido"` | Pesagem já foi validada ou rejeitada anteriormente |
| `"Auditor nao pode validar propria pesagem"` | `msg.sender` é o mesmo endereço que registrou a pesagem |

---

## rejeitarPesagem

### Descrição
Rejeita uma pesagem pendente com um motivo obrigatório. A pesagem muda para `REJEITADO` e os kg **não** são contabilizados para a empresa. A cooperativa pode submeter uma nova pesagem com evidências corrigidas. O motivo é registrado no evento mas não armazenado no storage (economia de gas).

### Assinatura
```solidity
function rejeitarPesagem(uint256 id, string calldata motivo) external onlyRole(AUDITOR_ROLE)
```

### Quem pode chamar
Apenas carteiras com `AUDITOR_ROLE`.

### Parâmetros
- `id` — ID da pesagem a ser rejeitada. Deve ser um ID existente com status `PENDENTE`
- `motivo` — Justificativa da rejeição. Validado como não vazio apenas no frontend; o contrato aceita string vazia

### Retorno
Nenhum.

### Evento
```solidity
event PesagemRejeitada(uint256 indexed id, address indexed auditor, string motivo)
```

### Efeitos colaterais
- Atualiza `pesagens[id].status` para `Status.REJEITADO`
- Registra `pesagens[id].auditor = msg.sender`
- **Não** acumula kg para nenhuma empresa
- **Não** verifica emissão de Selo Verde

### Possíveis erros
| Erro | Causa |
|---|---|
| `AccessControl: ...` | Carteira sem `AUDITOR_ROLE` |
| `"Pesagem inexistente"` | `id` é zero ou maior que `totalPesagens` |
| `"Status invalido"` | Pesagem já foi validada ou rejeitada anteriormente |

---

## getPesagensPorEmpresa

### Descrição
Retorna os IDs de todas as pesagens **validadas** de uma empresa apoiadora. Pesagens pendentes ou rejeitadas não são incluídas.

### Assinatura
```solidity
function getPesagensPorEmpresa(string calldata empresaId)
    external view returns (uint256[] memory)
```

### Quem pode chamar
Qualquer endereço (função `view`).

### Parâmetros
- `empresaId` — ID da empresa. Ex: `"00.000.000/0001-00"`

### Retorno
Array de `uint256` com os IDs das pesagens validadas. Retorna array vazio se a empresa não tiver pesagens validadas.

### Evento
Nenhum.

### Possíveis erros
Nenhum — retorna array vazio para empresas inexistentes.

---

## getPesagensPorCooperativa

### Descrição
Retorna os IDs de **todas** as pesagens registradas por uma cooperativa, independentemente do status (pendentes, validadas e rejeitadas).

### Assinatura
```solidity
function getPesagensPorCooperativa(address carteira)
    external view returns (uint256[] memory)
```

### Quem pode chamar
Qualquer endereço (função `view`).

### Parâmetros
- `carteira` — Endereço da cooperativa

### Retorno
Array de `uint256` com todos os IDs de pesagens. Retorna array vazio se a cooperativa não registrou nenhuma.

### Evento
Nenhum.

### Possíveis erros
Nenhum — retorna array vazio para endereços não cadastrados.

---

## getEmpresas

### Descrição
Retorna os IDs de todas as empresas que tiveram pelo menos uma pesagem validada na plataforma. Empresas com apenas pesagens pendentes ou rejeitadas não são incluídas.

### Assinatura
```solidity
function getEmpresas() external view returns (string[] memory)
```

### Quem pode chamar
Qualquer endereço (função `view`).

### Parâmetros
Nenhum.

### Retorno
Array de `string` com os IDs das empresas. Retorna array vazio se nenhuma pesagem foi validada ainda.

### Evento
Nenhum.

### Possíveis erros
Nenhum.

---

## getListaCooperativas

### Descrição
Retorna os endereços de todas as cooperativas que se cadastraram na plataforma, incluindo as bloqueadas.

### Assinatura
```solidity
function getListaCooperativas() external view returns (address[] memory)
```

### Quem pode chamar
Qualquer endereço (função `view`).

### Parâmetros
Nenhum.

### Retorno
Array de `address` com todos os endereços de cooperativas cadastradas.

### Evento
Nenhum.

### Possíveis erros
Nenhum — retorna array vazio se nenhuma cooperativa foi cadastrada.

---

## getListaAuditores

### Descrição
Retorna os endereços de todos que enviaram solicitação de auditor, incluindo pendentes, aprovados, rejeitados e bloqueados.

### Assinatura
```solidity
function getListaAuditores() external view returns (address[] memory)
```

### Quem pode chamar
Qualquer endereço (função `view`).

### Parâmetros
Nenhum.

### Retorno
Array de `address` com todos os endereços de solicitantes.

### Evento
Nenhum.

### Possíveis erros
Nenhum — retorna array vazio se nenhuma solicitação foi enviada.

---

## getListaEmpresasApoiadoras

### Descrição
Retorna os IDs de todas as empresas apoiadoras cadastradas pelo administrador. Diferente de `getEmpresas()`, lista apenas as empresas explicitamente registradas pelo ADM — não as que receberam pesagens com ID livre.

### Assinatura
```solidity
function getListaEmpresasApoiadoras() external view returns (string[] memory)
```

### Quem pode chamar
Qualquer endereço (função `view`).

### Parâmetros
Nenhum.

### Retorno
Array de `string` com os IDs das empresas cadastradas pelo ADM.

### Evento
Nenhum.

### Possíveis erros
Nenhum — retorna array vazio se nenhuma empresa foi cadastrada.

---

## GreenSeal

---

## setLedger

### Descrição
Configura o endereço do contrato `RecyclingLedger` autorizado a chamar `emitirSelo()`. Deve ser chamada uma única vez logo após o deploy do `RecyclingLedger`, pelo mesmo endereço que fez o deploy do `GreenSeal` (owner). Se não for configurado, nenhum selo poderá ser emitido.

### Assinatura
```solidity
function setLedger(address _ledger) external onlyOwner
```

### Quem pode chamar
Apenas o `owner` do contrato (carteira que fez o deploy do GreenSeal).

### Parâmetros
- `_ledger` — Endereço do contrato `RecyclingLedger` a ser autorizado

### Retorno
Nenhum.

### Evento
Nenhum.

### Efeitos colaterais
- Atualiza a variável de estado `ledger` com o endereço fornecido
- A partir deste momento, apenas `_ledger` pode chamar `emitirSelo()`

### Possíveis erros
| Erro | Causa |
|---|---|
| `OwnableUnauthorizedAccount(address)` | Chamador não é o `owner` do contrato |

---

## emitirSelo

### Descrição
Cria um novo NFT ERC-721 (Selo Verde) para uma empresa apoiadora. Chamada automaticamente pelo `RecyclingLedger` quando a empresa atinge a meta de kg validados. O NFT é custodiado pelo próprio contrato GreenSeal (`address(this)`) e não por uma carteira externa.

### Assinatura
```solidity
function emitirSelo(string calldata empresaId, uint256 totalKg) external onlyLedger
```

### Quem pode chamar
Exclusivamente o endereço configurado em `ledger` (o contrato `RecyclingLedger`). Qualquer outra chamada é revertida.

### Parâmetros
- `empresaId` — ID da empresa que receberá o selo. Ex: `"00.000.000/0001-00"`
- `totalKg` — Total de kg validados para a empresa no momento da emissão. Registrado no NFT para auditoria

### Retorno
Nenhum. O `tokenId` gerado é extraído do evento `SeloEmitido`.

### Evento
```solidity
event SeloEmitido(
    uint256 indexed tokenId,
    string empresaId,
    uint256 totalKg,
    string tokenURI
)
```

### Efeitos colaterais
- Incrementa `nextTokenId` (pre-incremento — IDs globais, não por empresa)
- Monta `tokenURI = "ipfs://greentrack/{empresaId}/{tokenId}"`
- Chama `_mint(address(this), tokenId)` — NFT vai para o próprio contrato
- Chama `_setTokenURI(tokenId, uri)`
- Incrementa `totalSelosPorEmpresa[empresaId]`
- Adiciona `tokenId` a `_selosPorEmpresa[empresaId]`
- Registra `seloEmpresa[tokenId] = empresaId`
- Registra `seloKg[tokenId] = totalKg`

### Possíveis erros
| Erro | Causa |
|---|---|
| `"Apenas o Ledger pode emitir"` | Chamador não é o endereço configurado em `ledger` |

---

## getSelosPorEmpresa

### Descrição
Retorna os `tokenId`s de todos os Selos Verdes emitidos para uma empresa. Necessário porque o mapping interno `_selosPorEmpresa` é `private`.

### Assinatura
```solidity
function getSelosPorEmpresa(string calldata empresaId)
    external view returns (uint256[] memory)
```

### Quem pode chamar
Qualquer endereço (função `view`).

### Parâmetros
- `empresaId` — ID da empresa. Ex: `"00.000.000/0001-00"`

### Retorno
Array de `uint256` com os tokenIds dos selos emitidos para a empresa. Retorna array vazio se a empresa não tiver selos.

### Evento
Nenhum.

### Possíveis erros
Nenhum — retorna array vazio para empresas sem selos.

---

*Documentação gerada com base no código-fonte — GreenTrack v1.0 · Ethereum Sepolia*
