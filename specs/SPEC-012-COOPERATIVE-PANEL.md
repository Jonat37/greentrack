# SPEC-012 — Cooperative Panel

| Campo | Valor |
|---|---|
| ID | SPEC-012 |
| Funcionalidade | Painel da Cooperativa |
| Rota | `/cooperativa` |
| Ator principal | Cooperativa (`COOPERATIVA_ROLE`) |
| Status | Implementado |

---

## Visão Geral

Painel central da cooperativa, exibindo suas informações cadastrais, estatísticas de kg por status, histórico completo de pesagens registradas e os Selos Verdes emitidos a partir das pesagens que ela enviou.

---

## Atores

| Ator | Descrição |
|---|---|
| Cooperativa | Usuário com `COOPERATIVA_ROLE` ativo |

---

## Pré-condições

- Carteira com `COOPERATIVA_ROLE` conectada ao MetaMask
- Cooperativa previamente cadastrada via `/cadastro/cooperativa`

---

## Fluxo Principal

```
1. Cooperativa acessa /cooperativa
2. Sistema verifica COOPERATIVA_ROLE → se não tem: redireciona /login
3. Sistema carrega dados da blockchain:
   a. ledger.cooperativas(address) → informações do cadastro
   b. ledger.getPesagensPorCooperativa(address) → IDs de todas as pesagens
4. Para cada ID: carrega detalhes da pesagem (sequencial)
5. Sistema calcula estatísticas:
   a. Kg enviados = soma de TODAS as pesagens
   b. Kg validados = soma das pesagens VALIDADAS
   c. Kg pendentes = soma das pesagens PENDENTES
   d. Kg rejeitados = soma das pesagens REJEITADAS
6. Sistema identifica empresas únicas com pesagens VALIDADAS
7. Sistema carrega selos emitidos para cada empresa
8. Renderiza painel completo
```

---

## Seções do Painel

### Cabeçalho
- Nome da cooperativa
- Material · Cidade/Estado · CNPJ
- Botão "+ Nova Pesagem" → `/cooperativa/pesagem`
- Badge "Cooperativa" + endereço formatado no header

### Cards de Estatísticas (4 cards)

| Card | Cor | Fonte |
|---|---|---|
| Kg enviados | Cinza | Soma de todas as pesagens |
| Kg validados | Verde | Soma de pesagens status == 1 |
| Kg pendentes | Amarelo | Soma de pesagens status == 0 |
| Kg rejeitados | Vermelho | Soma de pesagens status == 2 |

### Tabela de Histórico de Pesagens

Colunas:

| Coluna | Dado | Descrição |
|---|---|---|
| ID | `#[id]` | Número da pesagem |
| Data | timestamp pt-BR | Data de registro na blockchain |
| Empresa | empresaId | ID da empresa apoiadora |
| Material | material | Tipo de material reciclado |
| Peso | pesoKg + "kg" | Peso em quilogramas |
| Status | badge colorido | PENDENTE / VALIDADA / REJEITADA |
| Auditor | endereço formatado | Quem processou (se processado) |
| Evidências | link "Ver →" | Abre IPFS com fotos em nova aba |

**Badges de status:**

| Status | Cor do badge |
|---|---|
| PENDENTE | Amarelo |
| VALIDADA | Verde |
| REJEITADA | Vermelho |

**Auditores:**
- Se `auditor == address(0)` → exibe "—"
- Se auditado → exibe `0x1234...abcd`

**Ordenação:** por ID descendente (mais recentes primeiro)

---

### Bloco de Selos Verdes (condicional)

Exibido apenas se a cooperativa tiver pesagens VALIDADAS que geraram selos.

**Processo de carregamento:**
1. Coleta empresaIds únicos de pesagens VALIDADAS
2. Para cada empresa: `seal.getSelosPorEmpresa(empresaId)`
3. Para cada tokenId: `seal.seloKg(tokenId)`
4. Monta lista de selos

**Card de cada Selo:**
```
🏅 Selo Verde #3
  Empresa: 00.000.000/0001-00
  2.000 kg certificados

  [QR Code compacto 100x100]

  [Abrir página pública →]
```

**Botão "Abrir página pública"** → `/empresa/[empresaId]`

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-C06 | Cooperativa vê apenas suas próprias pesagens |
| BR-C07 | Cooperativa não pode validar ou rejeitar |
| BR-C08 | Cooperativa não pode emitir selos |
| BR-AC08 | Protegido — redireciona sem role |
| BR-AC09 | Aguarda `loaded` antes de redirecionar |
| BR-P28 | Histórico completo e imutável |

---

## Contratos Envolvidos (somente leitura)

| Contrato | Função | Dado |
|---|---|---|
| RecyclingLedger | `cooperativas(address)` | Dados do cadastro |
| RecyclingLedger | `getPesagensPorCooperativa(address)` | IDs de todas as pesagens |
| RecyclingLedger | `pesagens(uint256)` | Detalhes de cada pesagem |
| GreenSeal | `getSelosPorEmpresa(string)` | TokenIds por empresa |
| GreenSeal | `seloKg(uint256)` | Kg no momento da emissão |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| Sem `COOPERATIVA_ROLE` | Não cadastrada ou bloqueada | Redirecionada para /login |
| Nenhuma pesagem | Cooperativa nova | Tabela vazia com mensagem |
| Nenhum selo | Meta não atingida ainda | Bloco de selos não exibido |
| Erro de RPC | Infura indisponível | Banner de erro |
| Cooperativa cadastrada sem info | Role concedido manualmente sem cadastro | Nome exibe "Cooperativa", campos vazios |

---

## Critérios de Aceite

- [ ] Apenas carteiras com `COOPERATIVA_ROLE` acessam o painel
- [ ] Carteira sem role é redirecionada para `/login`
- [ ] Nome e dados do cadastro são exibidos no cabeçalho
- [ ] 4 cards de estatísticas calculados corretamente
- [ ] Tabela exibe todas as pesagens da cooperativa (todas as abas de status)
- [ ] Pesagens ordenadas por ID descendente
- [ ] Link de evidências abre IPFS em nova aba
- [ ] Auditor exibido apenas em pesagens processadas
- [ ] Bloco de selos aparece somente se houver selos relacionados
- [ ] QR Code compacto exibido em cada card de selo
- [ ] Botão "+ Nova Pesagem" redireciona para `/cooperativa/pesagem`
- [ ] Botão "Abrir página pública" abre `/empresa/[id]`
