# SPEC-010 — Public Dashboard

| Campo | Valor |
|---|---|
| ID | SPEC-010 |
| Funcionalidade | Dashboard Público de Métricas |
| Rota | `/` |
| Ator principal | Público (sem login) |
| Status | Implementado |

---

## Visão Geral

Página inicial da plataforma, acessível por qualquer pessoa sem necessidade de autenticação. Exibe métricas globais em tempo real da blockchain, explica como a plataforma funciona e direciona usuários para login ou cadastro.

---

## Atores

| Ator | Descrição |
|---|---|
| Público | Qualquer pessoa, sem MetaMask, sem login |
| Usuário autenticado | Acessa normalmente, vê botão "Painel" no lugar de "Entrar" |

---

## Pré-condições

- Nenhuma — página pública sem requisito de autenticação

---

## Fluxo Principal

```
1. Usuário acessa / (raiz do site)
2. Sistema exibe layout completo imediatamente
3. Sistema inicia carregamento assíncrono de métricas:
   a. ledger.totalPesagens()
   b. ledger.totalKgValidadoGlobal()
   c. seal.nextTokenId()
4. Enquanto carrega: exibe "Carregando dados da blockchain..."
5. Ao concluir: renderiza os 3 cards de métricas
6. Se RPC falhar: exibe zeros (página não quebra)
```

---

## Seções da Página

### Header
- Logo 🌿 GreenTrack
- Botão dinâmico (depende do estado do WalletContext):
  - Sem carteira: "Entrar na Plataforma →" → `/login`
  - ADM: "Painel ADM →" → `/admin`
  - Auditor: "Painel do Auditor →" → `/auditor`
  - Cooperativa: "Painel da Cooperativa →" → `/cooperativa`

### Hero
- Título: "Rastreabilidade de Reciclagem na Blockchain"
- Subtítulo: "Registro imutável, validação auditada e certificação de impacto ambiental com NFTs."
- Dois botões:
  - "🦊 Entrar / Cadastrar" → `/login`
  - "📊 Ver Dashboard Público" → âncora `#dashboard`

### Dashboard Público (id="dashboard")
- Subtítulo: "Dados em tempo real da blockchain Ethereum Sepolia — sem necessidade de login."
- 3 cards de métricas:
  1. 📋 Pesagens Registradas (`totalPesagens`)
  2. ♻️ Total de Kg Validados (`totalKgValidadoGlobal`)
  3. 🏅 Selos Verdes Emitidos (`nextTokenId`)

### Como Funciona
- 3 passos numerados:
  1. Cooperativa Registra — "...registra pesagens com fotos como evidência."
  2. Auditor Valida — "...verificam as evidências e validam cada pesagem na blockchain."
  3. Selo Verde Emitido — "...NFT Selo Verde é emitido automaticamente..."

### Call-to-Action Final
- Título: "Faça parte da rede"
- Subtítulo: "Cooperativas e auditores podem se cadastrar gratuitamente."
- Botão "Acessar Plataforma →" → `/login`

### Footer
- "GreenTrack · Certificação ambiental na blockchain Ethereum Sepolia"

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-AC04 | Dashboard público acessível sem MetaMask |
| BR-I01 | Dados públicos e verificáveis on-chain |
| BR-I02 | Sem banco de dados centralizado |

---

## Contratos Envolvidos (somente leitura)

| Contrato | Função | Dado |
|---|---|---|
| RecyclingLedger | `totalPesagens()` | Contador global |
| RecyclingLedger | `totalKgValidadoGlobal()` | Kg somados de todas as validações |
| GreenSeal | `nextTokenId()` | Número do último token emitido (= total emitidos) |

---

## Comportamento sem MetaMask

- Página carrega normalmente
- Métricas são lidas via RPC público (Infura), sem MetaMask
- Nenhum botão de ação exige carteira
- Botão header mostra "Entrar na Plataforma →"

---

## Comportamento com MetaMask conectado

- WalletContext detecta carteira automaticamente
- Botão header adapta texto e destino ao role do usuário
- Usuário não é redirecionado automaticamente (pode ficar na home)

---

## Validações

| Validação | Onde | Comportamento |
|---|---|---|
| Nenhuma — página pública | — | — |
| Falha de RPC | Frontend | Exibe zeros nos cards, não quebra |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| RPC indisponível | Infura fora do ar | Cards exibem 0 |
| Rate limit Infura | Muitas chamadas simultâneas | Cards exibem 0 (erro silencioso) |

---

## Critérios de Aceite

- [ ] Página acessível sem MetaMask instalado
- [ ] Página acessível sem login
- [ ] Métricas carregam da blockchain em tempo real
- [ ] Falha de RPC não quebra a página (exibe zeros)
- [ ] Botão header muda conforme role conectado
- [ ] Âncora "Ver Dashboard Público" rola para seção de métricas
- [ ] Três passos do "Como Funciona" exibidos
- [ ] Botões de CTA redirecionam para `/login`
- [ ] Página responsiva em mobile e desktop
