# SPEC-004 — Auditor Approval (Admin)

| Campo | Valor |
|---|---|
| ID | SPEC-004 |
| Funcionalidade | Aprovação / Rejeição / Bloqueio de Auditores |
| Rota | `/admin` → Aba "Auditores" |
| Ator principal | Administrador (`DEFAULT_ADMIN_ROLE`) |
| Status | Implementado |

---

## Visão Geral

O ADM gerencia o ciclo de vida completo de auditores: aprova solicitações pendentes, rejeita solicitações indevidas, bloqueia auditores problemáticos e desbloqueia auditores previamente bloqueados. Todas as ações são transações on-chain e concedente/revogam o `AUDITOR_ROLE` em tempo real.

---

## Atores

| Ator | Descrição |
|---|---|
| ADM | Carteira com `DEFAULT_ADMIN_ROLE` |

---

## Pré-condições

- ADM conectado com MetaMask na rede Sepolia
- Existir pelo menos uma solicitação de auditor registrada on-chain

---

## Fluxo — Aprovar Auditor

```
1. ADM acessa /admin → aba "Auditores"
2. Sistema lista todos os auditores com status PENDENTE
3. ADM visualiza nome, tipo, organização, cidade/estado e endereço
4. ADM clica em "Aprovar"
5. MetaMask abre popup para confirmar transação
6. ADM confirma e paga o gas
7. Sistema chama aprovarAuditor(carteira)
8. Contrato:
   a. Muda status para APROVADO
   b. Concede AUDITOR_ROLE à carteira
   c. Emite evento AuditorAprovado
9. Página recarrega dados
10. Auditor aprovado não aparece mais na lista de pendentes
```

---

## Fluxo — Rejeitar Auditor

```
1. ADM encontra solicitação PENDENTE na lista
2. ADM clica em "Rejeitar"
3. MetaMask abre popup para confirmar transação
4. ADM confirma
5. Sistema chama rejeitarAuditor(carteira)
6. Contrato:
   a. Muda status para REJEITADO
   b. Revoga AUDITOR_ROLE (se houver)
   c. Emite evento AuditorRejeitado
7. Página recarrega dados
```

---

## Fluxo — Bloquear Auditor Aprovado

```
1. ADM encontra auditor com status APROVADO na lista
2. ADM clica em "Bloquear"
3. MetaMask abre popup para confirmar transação
4. ADM confirma
5. Sistema chama bloquearAuditor(carteira)
6. Contrato:
   a. Muda status para BLOQUEADO
   b. Revoga AUDITOR_ROLE
   c. Emite evento AuditorBloqueado
7. Página recarrega dados
```

---

## Fluxo — Desbloquear Auditor

```
1. ADM encontra auditor com status BLOQUEADO na lista
2. ADM clica em "Desbloquear"
3. MetaMask abre popup para confirmar transação
4. ADM confirma
5. Sistema chama desbloquearAuditor(carteira)
6. Contrato:
   a. Muda status para APROVADO
   b. Concede AUDITOR_ROLE novamente
   c. Emite evento AuditorDesbloqueado
7. Página recarrega dados
```

---

## Ciclo de Status do Auditor

```
             ┌─────────────┐
             │   PENDENTE  │ ← solicitarAuditor()
             └──────┬──────┘
          __________|__________
         ↓                     ↓
    aprovarAuditor()     rejeitarAuditor()
         ↓                     ↓
    ┌─────────┐          ┌──────────┐
    │ APROVADO│          │ REJEITADO│ (terminal)
    └────┬────┘          └──────────┘
         │
    bloquearAuditor()
         ↓
    ┌──────────┐
    │ BLOQUEADO│
    └────┬─────┘
         │
    desbloquearAuditor()
         ↓
    ┌─────────┐
    │ APROVADO│
    └─────────┘
```

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-A05 | Apenas o ADM pode aprovar auditores |
| BR-A06 | Aprovação concede `AUDITOR_ROLE` |
| BR-A07 | Aprovação é imediata após confirmação da transação |
| BR-A08 | Rejeição revoga role e muda status |
| BR-A09 | Bloqueio revoga role |
| BR-A10 | Desbloqueio restaura role |
| BR-A11 | Auditores rejeitados/bloqueados não podem validar |
| BR-AD07 | ADM não pode alterar dados históricos de pesagens |

---

## Contratos Envolvidos

**RecyclingLedger:**

| Função | Parâmetro | Efeito |
|---|---|---|
| `aprovarAuditor(address)` | carteira | Status → APROVADO + grant AUDITOR_ROLE |
| `rejeitarAuditor(address)` | carteira | Status → REJEITADO + revoke AUDITOR_ROLE |
| `bloquearAuditor(address)` | carteira | Status → BLOQUEADO + revoke AUDITOR_ROLE |
| `desbloquearAuditor(address)` | carteira | Status → APROVADO + grant AUDITOR_ROLE |

**Eventos:** `AuditorAprovado`, `AuditorRejeitado`, `AuditorBloqueado`, `AuditorDesbloqueado`

---

## UI — Aba "Auditores" em `/admin`

**Card de cada auditor:**
- Nome + badge de status (cor por estado)
- Tipo de auditor · Organização · Cidade/Estado
- Endereço formatado (monospace)

**Badges de status:**

| Status | Cor |
|---|---|
| PENDENTE | Amarelo |
| APROVADO | Verde |
| REJEITADO | Vermelho |
| BLOQUEADO | Cinza |

**Botões de ação por status:**

| Status atual | Botões disponíveis |
|---|---|
| PENDENTE | Aprovar (verde), Rejeitar (vermelho) |
| APROVADO | Bloquear (cinza) |
| REJEITADO | — (nenhum) |
| BLOQUEADO | Desbloquear (azul) |

**Indicadores de loading:** cada botão mostra "..." enquanto a transação está pendente.

---

## Validações

| Validação | Onde | Comportamento |
|---|---|---|
| Carteira ADM conectada | Frontend + Contrato | Redireciona para /login se não autorizado |
| Auditor existe no contrato | Contrato | Reverte se carteira não registrada |
| Rede Sepolia | Frontend | Troca automática |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| Não é ADM | Carteira sem role | Redireciona para /login |
| Auditor não encontrado | Endereço inválido | Erro do contrato exibido |
| Transação rejeitada | ADM cancelou no MetaMask | Banner de erro |
| Rate limit Infura | Muitas chamadas | Banner de erro, dados podem não atualizar |

---

## Critérios de Aceite

- [ ] Aba "Auditores" lista todos os auditores com seus status
- [ ] Auditor PENDENTE exibe botões "Aprovar" e "Rejeitar"
- [ ] Auditor APROVADO exibe botão "Bloquear"
- [ ] Auditor BLOQUEADO exibe botão "Desbloquear"
- [ ] Auditor REJEITADO não exibe botões de ação
- [ ] Aprovação concede `AUDITOR_ROLE` on-chain
- [ ] Bloqueio revoga `AUDITOR_ROLE` on-chain
- [ ] Desbloqueio restaura `AUDITOR_ROLE` on-chain
- [ ] Página recarrega após cada ação
- [ ] Auditor aprovado consegue acessar `/auditor`
- [ ] Auditor bloqueado é redirecionado para `/login`
