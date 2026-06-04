# SPEC-007 — Weighing Rejection

| Campo | Valor |
|---|---|
| ID | SPEC-007 |
| Funcionalidade | Rejeição de Pesagem pelo Auditor |
| Rota | `/auditor` |
| Ator principal | Auditor (`AUDITOR_ROLE`) |
| Status | Implementado |

---

## Visão Geral

Permite que um auditor rejeite uma pesagem pendente, informando um motivo obrigatório. A rejeição impede que os kg da pesagem sejam computados para a empresa apoiadora. A cooperativa pode submeter uma nova pesagem com evidências corrigidas.

---

## Atores

| Ator | Descrição |
|---|---|
| Auditor | Usuário com `AUDITOR_ROLE` aprovado |

---

## Pré-condições

- Auditor conectado com MetaMask na rede Sepolia
- Auditor com `AUDITOR_ROLE` ativo
- Pesagem com status `PENDENTE` existente
- Auditor com Sepolia ETH para o gas

---

## Fluxo Principal

```
1. Auditor acessa /auditor
2. Auditor analisa pesagem pendente e identifica problema nas evidências
3. Auditor clica em "❌ Rejeitar"
4. Sistema abre modal de rejeição
5. Auditor digita o motivo da rejeição (campo obrigatório)
6. Auditor clica em "Confirmar Rejeição"
7. MetaMask abre popup para confirmar transação
8. Auditor confirma e paga o gas
9. Sistema aguarda confirmação on-chain
10. Contrato executa rejeitarPesagem(id, motivo):
    a. Verifica que o auditor possui AUDITOR_ROLE
    b. Verifica que a pesagem existe
    c. Verifica que o status é PENDENTE
    d. Muda status para REJEITADO
    e. Registra endereço do auditor
    f. Emite evento PesagemRejeitada
11. Sistema recarrega lista de pendentes
12. Pesagem rejeitada não aparece mais na lista
```

---

## Fluxo Alternativo — Motivo vazio

```
5. Auditor não preenche o campo de motivo
6. Botão "Confirmar Rejeição" permanece desabilitado
7. Auditor deve preencher o motivo para prosseguir
```

---

## Fluxo Alternativo — Auditor cancela

```
4. Modal é aberto
5. Auditor clica em "Cancelar"
6. Modal fecha, nenhuma transação enviada
7. Pesagem permanece PENDENTE
```

---

## O que acontece após a rejeição

- Status muda para `REJEITADO`
- Os kg **não são** somados ao total da empresa
- O Selo Verde **não é** verificado
- A cooperativa **não é** notificada automaticamente (precisa verificar o painel)
- A cooperativa pode registrar **nova pesagem** com evidências corrigidas
- A pesagem rejeitada permanece no histórico para auditoria

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-P20 | Apenas `AUDITOR_ROLE` pode rejeitar |
| BR-P21 | Apenas pesagens `PENDENTE` podem ser rejeitadas |
| BR-P22 | Motivo de rejeição é obrigatório (validação no frontend) |
| BR-P23 | Status muda para `REJEITADO`, auditor registrado |
| BR-P24 | Pesagens rejeitadas não acumulam kg |
| BR-P25 | Pesagem rejeitada não pode ser reaprovada |
| BR-P26 | Pesagem rejeitada permanece no histórico (imutável) |

---

## Contrato Envolvido

**RecyclingLedger** — `rejeitarPesagem(uint256 id, string calldata motivo)`

```solidity
function rejeitarPesagem(uint256 id, string calldata motivo)
    external
    onlyRole(AUDITOR_ROLE)
```

**Nota:** O motivo é passado apenas no evento, **não é armazenado** no storage da pesagem para economizar gas.

**Evento emitido:** `PesagemRejeitada(uint256 indexed id, address indexed auditor, string motivo)`

---

## UI — Modal de Rejeição

```
┌─────────────────────────────────────────┐
│  Motivo da Rejeição — Pesagem #42       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Fotos ilegíveis. A foto da      │    │
│  │ balança está borrada e não...   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Confirmar Rejeição]  [Cancelar]       │
└─────────────────────────────────────────┘
```

**Comportamento dos botões:**
- "Confirmar Rejeição": desabilitado se motivo vazio
- "Cancelar": fecha o modal sem enviar transação

---

## Validações

| Validação | Onde | Comportamento |
|---|---|---|
| Motivo não vazio | Frontend | Botão desabilitado |
| `AUDITOR_ROLE` ativo | Contrato | Transação reverte |
| Pesagem existe | Contrato | Reverte se ID inválido |
| Status é `PENDENTE` | Contrato | Reverte se já processada |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| Motivo vazio | Campo em branco | Botão desabilitado, não envia |
| Sem `AUDITOR_ROLE` | Bloqueado | Redirecionado para /login |
| Pesagem já processada | Status != PENDENTE | Erro do contrato |
| Transação rejeitada | Auditor cancelou no MetaMask | Banner de erro |
| Saldo insuficiente | Sem Sepolia ETH | Erro do MetaMask |

---

## Diferenças em relação à Validação (SPEC-006)

| Aspecto | Validação | Rejeição |
|---|---|---|
| Motivo | Não exige | Obrigatório |
| Modal | Não tem | Sim (coleta o motivo) |
| Acúmulo de kg | Sim | Não |
| Verificação de Selo | Sim | Não |
| Pesagem pode ser reaprovada | Não se aplica | Não |
| Status final | VALIDADO | REJEITADO |

---

## Critérios de Aceite

- [ ] Botão "❌ Rejeitar" abre o modal de rejeição
- [ ] Modal exibe ID da pesagem no título
- [ ] Campo de motivo é exibido como textarea
- [ ] Botão "Confirmar Rejeição" desabilitado com campo vazio
- [ ] Botão "Cancelar" fecha modal sem enviar transação
- [ ] Transação `rejeitarPesagem()` enviada após confirmação MetaMask
- [ ] Pesagem rejeitada desaparece da lista de pendentes
- [ ] Kg da pesagem rejeitada não são somados à empresa
- [ ] Pesagem rejeitada aparece no histórico da cooperativa com badge "REJEITADA"
- [ ] Motivo registrado no evento on-chain (verificável no Etherscan)
