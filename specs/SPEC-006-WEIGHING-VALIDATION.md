# SPEC-006 — Weighing Validation

| Campo | Valor |
|---|---|
| ID | SPEC-006 |
| Funcionalidade | Validação de Pesagem pelo Auditor |
| Rota | `/auditor` |
| Ator principal | Auditor (`AUDITOR_ROLE`) |
| Status | Implementado |

---

## Visão Geral

Permite que um auditor aprovado valide pesagens pendentes. Após a validação, os kg são acumulados para a empresa apoiadora e o sistema verifica automaticamente se a meta de emissão do Selo Verde foi atingida.

---

## Atores

| Ator | Descrição |
|---|---|
| Auditor | Usuário com `AUDITOR_ROLE` aprovado |

---

## Pré-condições

- Auditor conectado com MetaMask na rede Sepolia
- Auditor com `AUDITOR_ROLE` ativo (não bloqueado)
- Existir pelo menos uma pesagem com status `PENDENTE`
- Pesagem pendente **não foi registrada** pela mesma carteira do auditor
- Auditor com Sepolia ETH para o gas

---

## Fluxo Principal

```
1. Auditor acessa /auditor
2. Sistema carrega todas as pesagens com status PENDENTE
3. Para cada pesagem, o auditor vê:
   - ID, material, peso, empresa
   - Local e data da coleta (se informados)
   - Endereço da cooperativa
   - Data de registro
   - Link para evidências no IPFS
4. Auditor abre link "Ver evidências no IPFS"
5. Auditor analisa as fotos da balança e dos fardos
6. Auditor clica em "✅ Validar"
7. MetaMask abre popup para confirmar transação
8. Auditor confirma e paga o gas
9. Sistema aguarda confirmação on-chain
10. Contrato executa validarPesagem(id):
    a. Muda status da pesagem para VALIDADO
    b. Registra endereço do auditor na pesagem
    c. Adiciona pesoKg ao total da empresa (kgPorEmpresa)
    d. Adiciona pesoKg ao total global (totalKgValidadoGlobal)
    e. Registra pesagem em pesagensPorEmpresa
    f. Registra empresa em getEmpresas() se for nova
    g. Chama _verificarEmissaoSelo(empresaId)
    h. Se meta atingida → emite Selo Verde NFT
    i. Emite evento PesagemValidada
11. Sistema recarrega lista de pendentes
12. Pesagem validada não aparece mais na lista
```

---

## Fluxo Alternativo — Pesagem da própria cooperativa do auditor

```
10. Contrato verifica: p.cooperativa != msg.sender
    → Falha: auditor é a mesma carteira da cooperativa
    → Transação reverte com "Auditor nao pode validar propria pesagem"
11. Sistema exibe erro ao auditor
```

---

## Fluxo Alternativo — Meta de Selo Verde atingida

```
10g. _verificarEmissaoSelo(empresaId)
     kgPorEmpresa[empresaId] / kgParaSelo > totalSelosPorEmpresa[empresaId]
     → SIM: GreenSeal.emitirSelo(empresaId, totalKg)
     → NFT criado, evento SeloEmitido emitido
     → Todo esse processo ocorre na MESMA transação de validarPesagem()
```

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-P13 | Apenas `AUDITOR_ROLE` pode validar |
| BR-P14 | Apenas pesagens `PENDENTE` podem ser validadas |
| BR-P15 | Status muda para `VALIDADO`, endereço do auditor registrado |
| BR-P16 | Pesagem validada não pode ser revertida |
| BR-P17 | Kg acumulados para a empresa |
| BR-P18 | Kg acumulados no total global |
| BR-P19 | Verificação automática de Selo Verde após validação |
| BR-A13 | Auditor não pode validar pesagem da própria carteira |
| BR-A14 | Sem restrição por empresa ou material |

---

## Contrato Envolvido

**RecyclingLedger** — `validarPesagem(uint256 id)`

```solidity
function validarPesagem(uint256 id)
    external
    onlyRole(AUDITOR_ROLE)
```

**Efeitos colaterais automáticos:**
- Atualiza `kgPorEmpresa[empresaId]`
- Atualiza `totalKgValidadoGlobal`
- Popula `pesagensPorEmpresa[empresaId]`
- Chama `greenSeal.emitirSelo()` se necessário

**Eventos emitidos:**
- `PesagemValidada(uint256 indexed id, address indexed auditor)`
- `SeloEmitido(uint256 indexed tokenId, string empresaId, uint256 totalKg, string tokenURI)` *(se meta atingida)*

---

## UI — Tela `/auditor`

**Informações do auditor** (se cadastrado):
- Nome, tipo de auditor, organização

**Card de pesagem pendente:**
```
[PENDENTE]  #42 — PET
Peso: 350 kg    Empresa: 00.000.000/0001-00
Local: Galpão Central SP    Data coleta: 04/06/2026
Cooperativa: 0x1234...abcd
Registrada: 04/06/2026
Ver evidências no IPFS →

[✅ Validar]  [❌ Rejeitar]
```

**Estado vazio:**
- Card verde: "🎉 Nenhuma pesagem pendente de validação."

**Contador:**
- "[N] pesagem(ns) aguardando validação"

---

## Validações

| Validação | Onde | Comportamento |
|---|---|---|
| `AUDITOR_ROLE` ativo | Contrato | Transação reverte |
| Pesagem existe | Contrato | Reverte se ID inválido |
| Status é `PENDENTE` | Contrato | Reverte se já validada/rejeitada |
| Não é a própria cooperativa | Contrato | Reverte com mensagem específica |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| Sem `AUDITOR_ROLE` | Bloqueado ou não aprovado | Redirecionado para /login |
| Pesagem não existe | ID inválido | Erro do contrato |
| Pesagem já processada | Status != PENDENTE | Erro do contrato |
| Conflito de interesse | Mesma carteira da cooperativa | Erro específico do contrato |
| Transação rejeitada | Auditor cancelou | Banner de erro |
| Saldo insuficiente | Sem Sepolia ETH | Erro do MetaMask |

---

## Critérios de Aceite

- [ ] Lista apenas pesagens com status PENDENTE
- [ ] Exibe todas as informações relevantes de cada pesagem
- [ ] Link para IPFS abre evidências em nova aba
- [ ] Botão "Validar" envia transação `validarPesagem()`
- [ ] MetaMask solicita confirmação antes de enviar
- [ ] Pesagem validada desaparece da lista após confirmação
- [ ] Se meta atingida: Selo Verde é emitido automaticamente na mesma transação
- [ ] Auditor não consegue validar pesagem de sua própria carteira
- [ ] Erro de conflito é exibido de forma clara
- [ ] Lista recarregada automaticamente após validação
