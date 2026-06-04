# SPEC-009 — Admin Governance Panel

| Campo | Valor |
|---|---|
| ID | SPEC-009 |
| Funcionalidade | Painel Administrativo de Governança |
| Rota | `/admin` |
| Ator principal | Administrador (`DEFAULT_ADMIN_ROLE`) |
| Status | Implementado |

---

## Visão Geral

Painel exclusivo do administrador para gerenciar a governança da plataforma: aprovar/rejeitar/bloquear auditores, bloquear/desbloquear cooperativas, cadastrar empresas apoiadoras e configurar a meta de emissão dos Selos Verdes.

---

## Atores

| Ator | Descrição |
|---|---|
| ADM | Carteira com `DEFAULT_ADMIN_ROLE` (carteira de deploy) |

---

## Pré-condições

- Carteira com `DEFAULT_ADMIN_ROLE` conectada ao MetaMask
- Rede Sepolia configurada

---

## Funcionalidades por Aba

### Aba 1 — Auditores

Ver **SPEC-004** para o fluxo completo de aprovação.

**O que exibe:**
- Lista de todos os auditores que solicitaram cadastro
- Para cada: nome, tipo, organização, cidade/estado, endereço, status

**Ações disponíveis:**

| Status atual | Ações |
|---|---|
| PENDENTE | Aprovar, Rejeitar |
| APROVADO | Bloquear |
| REJEITADO | — |
| BLOQUEADO | Desbloquear |

**Funções do contrato:**
- `aprovarAuditor(address)` → status APROVADO + grant AUDITOR_ROLE
- `rejeitarAuditor(address)` → status REJEITADO
- `bloquearAuditor(address)` → status BLOQUEADO + revoke AUDITOR_ROLE
- `desbloquearAuditor(address)` → status APROVADO + grant AUDITOR_ROLE

---

### Aba 2 — Cooperativas

**O que exibe:**
- Lista de todas as cooperativas cadastradas
- Para cada: nome, CNPJ, material, cidade/estado, endereço, status

**Ações disponíveis:**

| Status atual | Ação |
|---|---|
| ATIVA | Bloquear |
| BLOQUEADA | Desbloquear |

**Funções do contrato:**
- `bloquearCooperativa(address)` → status BLOQUEADA + revoke COOPERATIVA_ROLE
- `desbloquearCooperativa(address)` → status ATIVA + grant COOPERATIVA_ROLE

---

### Aba 3 — Empresas Apoiadoras

**Formulário de cadastro:**

| Campo | Tipo | Obrigatório |
|---|---|---|
| ID da empresa | Texto (CNPJ ou código) | Sim |
| Nome | Texto | Sim |
| CNPJ | Texto | Não |

**Comportamento:**
- Se ID já existe: atualiza os dados (upsert)
- Se ID novo: cria novo registro

**Lista de empresas:**
- Exibe nome + ID
- Link "Ver página →" abre `/empresa/[id]` em nova aba

**Função do contrato:**
- `cadastrarEmpresaApoiadora(empresaId, nome, cnpj)`

---

### Aba 4 — Configurações

**Campo: Meta de emissão do Selo Verde**
- Input numérico (kg necessários por selo)
- Exibe valor atual
- Botão "Salvar" chama `setKgParaSelo(kg)`
- Validação: valor deve ser > 0

**Função do contrato:**
- `setKgParaSelo(uint256 kg)` → emite evento `KgParaSeloAtualizado`

---

## Dashboard de Métricas (topo da página)

7 cards com dados em tempo real:

| Métrica | Fonte |
|---|---|
| Cooperativas | `getListaCooperativas().length` |
| Auditores aprovados | Filtra status == APROVADO |
| Auditores pendentes | Filtra status == PENDENTE |
| Pesagens registradas | `totalPesagens` |
| Kg validados | `totalKgValidadoGlobal` |
| Selos emitidos | `GreenSeal.nextTokenId` |
| Meta atual (kg/selo) | `kgParaSelo` |

---

## Fluxo de Carregamento

```
1. ADM acessa /admin
2. Sistema verifica DEFAULT_ADMIN_ROLE → se não tem: redireciona /login
3. Sistema carrega dados sequencialmente (anti rate-limiting):
   a. ledger.totalPesagens()
   b. ledger.totalKgValidadoGlobal()
   c. seal.nextTokenId()
   d. ledger.kgParaSelo()
   e. ledger.getListaAuditores()
   f. ledger.getListaCooperativas()
   g. ledger.getListaEmpresasApoiadoras()
4. Para cada auditor: carrega dados individuais sequencialmente
5. Para cada cooperativa: carrega dados individuais sequencialmente
6. Para cada empresa: carrega dados individuais
7. Calcula métricas e renderiza
```

---

## Fluxo de Ação

```
1. ADM clica em ação (ex: "Aprovar" auditor X)
2. Sistema chama função correspondente no contrato
3. MetaMask abre popup
4. ADM confirma e paga gas
5. Sistema aguarda confirmação on-chain
6. Sistema recarrega todos os dados
7. Interface atualizada
```

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-AD01 | ADM é a carteira de deploy |
| BR-AD02 a AD06 | Poderes do ADM |
| BR-AD07 | ADM não pode alterar pesagens históricas |
| BR-AD09 | ADM não pode alterar dados de cadastro |
| BR-AD10 | ADM não pode emitir selos manualmente |
| BR-AD11 | Todas as ações geram eventos on-chain |

---

## Validações

| Validação | Onde | Comportamento |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Frontend + Contrato | Redireciona /login se não autorizado |
| Meta de kg > 0 | Frontend + Contrato | Erro se valor inválido |
| ID de empresa não vazio | Frontend | Não envia formulário |
| Nome de empresa não vazio | Frontend | Não envia formulário |
| Auditor/cooperativa existe | Contrato | Reverte se não encontrado |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| Não é ADM | Carteira sem role | Redirecionado para /login |
| Rate limit Infura | Muitas chamadas durante carregamento | Banner de erro |
| Transação rejeitada | ADM cancelou | Banner de erro |
| Entidade não encontrada | Endereço inválido | Erro do contrato |

---

## Limitações Intencionais

- O ADM **não vê** o motivo de cada pesagem rejeitada no painel (seria necessário filtrar eventos on-chain)
- O ADM **não pode** editar dados de cooperativas/auditores após o cadastro
- O ADM **não pode** excluir registros — apenas bloquear/desbloquear
- Não há paginação: se houver centenas de auditores/cooperativas, o carregamento será lento

---

## Critérios de Aceite

- [ ] Apenas ADM consegue acessar `/admin`
- [ ] Carteira sem role é redirecionada para `/login`
- [ ] 7 métricas são carregadas e exibidas corretamente
- [ ] Aba Auditores lista todos com status e ações corretas
- [ ] Aba Cooperativas lista todas com status e ações corretas
- [ ] Aba Empresas exibe formulário de cadastro e lista
- [ ] Aba Configurações permite alterar meta de kg
- [ ] Cada ação envia transação ao contrato via MetaMask
- [ ] Página recarrega após cada ação concluída
- [ ] Chamadas RPC são feitas sequencialmente (sem rate limit)
- [ ] Erros de contrato exibidos em banner vermelho
