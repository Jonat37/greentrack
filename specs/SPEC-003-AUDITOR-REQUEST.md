# SPEC-003 — Auditor Registration Request

| Campo | Valor |
|---|---|
| ID | SPEC-003 |
| Funcionalidade | Solicitação de Cadastro como Auditor |
| Rota | `/cadastro/auditor` |
| Ator principal | Qualquer usuário sem role |
| Status | Implementado |

---

## Visão Geral

Permite que qualquer pessoa solicite acesso como auditor na plataforma. Diferente do cadastro de cooperativa, a solicitação **não concede role imediatamente**: fica pendente até que o ADM aprove. Enquanto pendente, o usuário não pode validar pesagens.

---

## Atores

| Ator | Descrição |
|---|---|
| Usuário novo | Qualquer carteira que deseja ser auditora |

---

## Pré-condições

- MetaMask instalado e com conta configurada
- Carteira **não** enviou solicitação de auditor anteriormente
- Carteira com Sepolia ETH suficiente para o gas

---

## Fluxo Principal

```
1. Usuário acessa /cadastro/auditor
2. Usuário preenche o formulário com seus dados
3. Usuário clica em "🦊 Conectar MetaMask"
4. MetaMask abre popup → usuário aprova
5. Endereço é exibido no campo de carteira
6. Usuário clica em "Solicitar aprovação como Auditor"
7. Sistema valida campos obrigatórios
8. Sistema chama solicitarAuditor() no contrato
9. MetaMask abre popup para confirmar transação
10. Usuário confirma e paga o gas
11. Sistema aguarda confirmação on-chain
12. Solicitação criada com status PENDENTE
13. Exibe mensagem de sucesso com instrução de aguardar
14. Botão "Ir para o Dashboard" → /
```

---

## Fluxo Alternativo — Solicitação duplicada

```
8. Contrato verifica que auditores[msg.sender].carteira != address(0)
9. Transação reverte com "Auditor ja solicitado"
10. Sistema exibe erro ao usuário
```

---

## Fluxo de Verificação no Login (após enviar solicitação)

```
Usuário vai para /login e conecta a carteira
→ Sem AUDITOR_ROLE
→ Sistema consulta ledger.auditores(address)
→ Status == 0 (PENDENTE)
→ Exibe badge "⏳ Auditor — aguardando aprovação"
→ Exibe mensagem: "Sua solicitação foi enviada. Um administrador 
  precisa aprovar sua carteira antes de você acessar o painel."
```

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-A01 | Qualquer carteira pode solicitar |
| BR-A02 | Cada carteira pode submeter apenas uma solicitação |
| BR-A03 | Solicitação inicia com status `PENDENTE` |
| BR-A04 | Auditor pendente não possui `AUDITOR_ROLE` |

---

## Contrato Envolvido

**RecyclingLedger** — `solicitarAuditor(nome, organizacao, tipoAuditor, cidade, estado, documento)`

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

**Evento emitido:** `AuditorSolicitado(address indexed carteira, string nome)`

---

## UI — Tela `/cadastro/auditor`

**Campos do formulário:**

| Campo | Tipo | Obrigatório | Placeholder |
|---|---|---|---|
| Nome completo | Texto | Sim | "João da Silva" |
| Organização ou entidade | Texto | Sim | "Instituto Verde" |
| Tipo de auditor | Select 4 opções | Sim | — |
| Cidade | Texto | Sim | "São Paulo" |
| Estado | Select 27 UFs | Sim | — |
| Documento de identificação | Texto | Não | "CPF ou número de registro" |
| Carteira MetaMask | Botão / Exibe endereço | Sim | — |

**Tipos de auditor disponíveis:**
- Auditor independente
- Ecoponto
- ONG
- Fiscal parceiro

**Estados do botão de submit:**
- Sem carteira: `"Conecte a carteira para continuar"` (disabled)
- Com carteira: `"Solicitar aprovação como Auditor"`
- Processando: `"Processando..."` (disabled)

**Tela de sucesso:**
- Ícone ⏳
- Mensagem: "Solicitação enviada. Um administrador precisa aprovar sua carteira antes que você possa validar pesagens."
- Botão "Ir para o Dashboard"

---

## Validações

| Validação | Onde | Mensagem |
|---|---|---|
| Nome não vazio | Frontend | "Preencha todos os campos obrigatórios." |
| Organização não vazia | Frontend | "Preencha todos os campos obrigatórios." |
| Tipo selecionado | Frontend | "Preencha todos os campos obrigatórios." |
| Cidade não vazia | Frontend | "Preencha todos os campos obrigatórios." |
| Estado selecionado | Frontend | "Preencha todos os campos obrigatórios." |
| Carteira conectada | Frontend | Botão desabilitado |
| Solicitação única | Contrato | Transação revertida |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| Campos obrigatórios vazios | Formulário incompleto | Mensagem de erro, não envia |
| Carteira não conectada | MetaMask desconectado | Botão desabilitado |
| Solicitação já enviada | Mesmo endereço | Exibe erro do contrato |
| Transação rejeitada | Usuário cancelou | Exibe mensagem de erro |
| Saldo insuficiente | Sem Sepolia ETH | Exibe erro do MetaMask |

---

## Critérios de Aceite

- [ ] Formulário exibe todos os campos especificados
- [ ] Select de tipo de auditor tem as 4 opções
- [ ] Select de estados tem as 27 UFs
- [ ] Botão submit desabilitado sem carteira conectada
- [ ] Campos obrigatórios validados antes do envio
- [ ] Transação enviada ao contrato após confirmação MetaMask
- [ ] Mensagem de sucesso exibida após confirmação on-chain
- [ ] No `/login`, auditor pendente vê badge "⏳ Aguardando aprovação"
- [ ] Erro de solicitação duplicada é exibido
- [ ] Documento de identificação é opcional (não bloqueia envio)
