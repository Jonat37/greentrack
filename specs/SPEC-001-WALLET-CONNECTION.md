# SPEC-001 — Wallet Connection & Role Detection

| Campo | Valor |
|---|---|
| ID | SPEC-001 |
| Funcionalidade | Conexão de Carteira e Detecção de Role |
| Rota | `/login` |
| Ator principal | Qualquer usuário |
| Status | Implementado |

---

## Visão Geral

Permite que qualquer usuário conecte sua carteira MetaMask à plataforma. Após a conexão, o sistema verifica automaticamente qual role a carteira possui on-chain e redireciona o usuário para sua área correspondente.

---

## Atores

| Ator | Descrição |
|---|---|
| Público | Qualquer pessoa que acessa a plataforma |
| Cooperativa | Usuário com `COOPERATIVA_ROLE` |
| Auditor | Usuário com `AUDITOR_ROLE` |
| ADM | Usuário com `DEFAULT_ADMIN_ROLE` |

---

## Pré-condições

- Usuário possui a extensão MetaMask instalada no navegador
- MetaMask possui ao menos uma conta configurada
- Usuário tem acesso à internet (para comunicação com a rede Sepolia)

---

## Fluxo Principal

```
1. Usuário acessa /login
2. Sistema exibe botão "Conectar MetaMask"
3. Usuário clica no botão
4. MetaMask abre popup solicitando aprovação de acesso
5. Usuário aprova o acesso
6. Sistema verifica a rede atual da carteira
   6a. Se não for Sepolia → sistema tenta trocar automaticamente
   6b. Se Sepolia não existir no MetaMask → sistema adiciona a rede e troca
7. Sistema consulta os roles on-chain (sequencialmente):
   7a. hasRole(DEFAULT_ADMIN_ROLE, address)
   7b. hasRole(AUDITOR_ROLE, address)
   7c. hasRole(COOPERATIVA_ROLE, address)
8. Sistema redireciona conforme o role detectado:
   - ADM       → /admin
   - Auditor   → /auditor
   - Cooperativa → /cooperativa
   - Sem role  → permanece em /login com opções de cadastro
```

---

## Fluxo Alternativo — Carteira sem role

```
8. Sistema não encontra role
9. Sistema consulta ledger.auditores(address)
   9a. Status PENDENTE → exibe "⏳ Auditor — aguardando aprovação"
   9b. Status REJEITADO → exibe "❌ Auditor — solicitação rejeitada"
   9c. Status BLOQUEADO → exibe "🚫 Auditor — acesso bloqueado"
10. Se não for auditor, consulta ledger.cooperativas(address)
    10a. Carteira encontrada → exibe aviso de cooperativa sem role
11. Se nenhum cadastro → exibe links para /cadastro/cooperativa e /cadastro/auditor
```

---

## Fluxo Alternativo — MetaMask não instalado

```
3. Sistema detecta ausência do MetaMask
4. Exibe mensagem de erro: "MetaMask não encontrado. Instale a extensão."
5. Fluxo encerrado
```

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-AC01 | Acesso a áreas restritas requer conexão com MetaMask |
| BR-AC02 | Carteira deve estar na rede Ethereum Sepolia |
| BR-AC03 | Sistema tenta trocar ou adicionar a rede automaticamente |
| BR-AC05 | Redirecionamento automático após detecção de role |
| BR-AC06 | Prioridade: ADM > Auditor > Cooperativa |
| BR-AC09 | Aguarda `loaded = true` antes de redirecionar |

---

## Contrato Envolvido

**RecyclingLedger** — função `hasRole(bytes32 role, address account)`

| Role | Hash |
|---|---|
| `DEFAULT_ADMIN_ROLE` | `ethers.ZeroHash` |
| `AUDITOR_ROLE` | `ethers.id("AUDITOR_ROLE")` |
| `COOPERATIVA_ROLE` | `ethers.id("COOPERATIVA_ROLE")` |

---

## UI — Tela `/login`

**Estado 1 — Desconectado:**
- Logo GreenTrack
- Título "Entrar no GreenTrack"
- Botão laranja "🦊 Conectar MetaMask"
- Seção "Novo por aqui?" com links de cadastro
- Link "Dashboard público" no header

**Estado 2 — Conectando:**
- Botão com texto "Conectando..." em animação pulse

**Estado 3 — Conectado com role:**
- Endereço formatado (`0x1234...abcd`)
- Badge colorido com o role detectado
- Texto "Redirecionando..."

**Estado 4 — Conectado sem role:**
- Endereço formatado
- Badge cinza "Sem permissão cadastrada"
- Ou badge específico para pendente/rejeitado/bloqueado
- Links de cadastro visíveis

---

## Validações

| Validação | Onde | Comportamento |
|---|---|---|
| MetaMask instalado | Frontend | Exibe erro, não prossegue |
| Rede Sepolia | Frontend | Tenta trocar automaticamente |
| Role verificado | On-chain | Leitura de `hasRole` |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| MetaMask não instalado | Extensão ausente | Exibe mensagem de erro |
| Usuário rejeita conexão | Clicou "Rejeitar" no MetaMask | Exibe mensagem de erro |
| Falha ao trocar de rede | Usuário recusou | Exibe mensagem de erro |
| RPC rate limit | Muitas chamadas ao Infura | Roles zerados, sem redirecionamento |

---

## Critérios de Aceite

- [ ] Botão conectar abre popup do MetaMask
- [ ] Sistema detecta e valida rede Sepolia
- [ ] Adiciona rede Sepolia ao MetaMask se necessário
- [ ] Endereço conectado é exibido após conexão
- [ ] ADM é redirecionado para `/admin`
- [ ] Auditor aprovado é redirecionado para `/auditor`
- [ ] Cooperativa ativa é redirecionada para `/cooperativa`
- [ ] Auditor pendente vê badge "⏳ Aguardando aprovação"
- [ ] Sem cadastro: exibe opções de cadastro
- [ ] Erro de MetaMask ausente é exibido corretamente
