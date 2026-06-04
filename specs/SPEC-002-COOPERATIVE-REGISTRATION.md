# SPEC-002 — Cooperative Registration

| Campo | Valor |
|---|---|
| ID | SPEC-002 |
| Funcionalidade | Cadastro de Cooperativa |
| Rota | `/cadastro/cooperativa` |
| Ator principal | Qualquer usuário sem role |
| Status | Implementado |

---

## Visão Geral

Permite que qualquer pessoa com uma carteira MetaMask cadastre uma cooperativa na blockchain. O cadastro é auto-serviço: não requer aprovação prévia. Ao concluir, a carteira recebe automaticamente o `COOPERATIVA_ROLE` e pode começar a registrar pesagens.

---

## Atores

| Ator | Descrição |
|---|---|
| Usuário novo | Qualquer carteira ainda não cadastrada como cooperativa |

---

## Pré-condições

- MetaMask instalado e com conta configurada
- Carteira **não** cadastrada previamente como cooperativa (mesmo endereço)
- Carteira com Sepolia ETH suficiente para pagar o gas da transação

---

## Fluxo Principal

```
1. Usuário acessa /cadastro/cooperativa
2. Usuário preenche o formulário
3. Usuário clica em "🦊 Conectar MetaMask" (campo de carteira)
4. MetaMask abre popup → usuário aprova
5. Endereço conectado é exibido no campo de carteira
6. Usuário clica em "Cadastrar Cooperativa"
7. Sistema valida campos obrigatórios
8. Sistema chama cadastrarCooperativa() no contrato
9. MetaMask abre popup para confirmar transação
10. Usuário confirma e paga o gas
11. Sistema aguarda confirmação on-chain
12. Contrato concede COOPERATIVA_ROLE à carteira
13. Sistema chama refreshRoles() no contexto
14. Exibe mensagem de sucesso
15. Botão "Ir para o Painel →" redireciona para /cooperativa
```

---

## Fluxo Alternativo — Cooperativa já cadastrada

```
8. Contrato verifica que cooperativas[msg.sender].carteira != address(0)
9. Transação reverte com "Cooperativa ja cadastrada"
10. Sistema exibe erro ao usuário
```

---

## Fluxo Alternativo — Saldo insuficiente

```
9. MetaMask exibe aviso de saldo insuficiente
10. Usuário não consegue confirmar a transação
11. Sistema exibe erro recebido do MetaMask
```

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-C01 | Cadastro sem aprovação prévia |
| BR-C02 | Cada carteira pode se cadastrar apenas uma vez |
| BR-C03 | `COOPERATIVA_ROLE` concedido automaticamente |
| BR-C04 | Status inicial é `ATIVA` |
| BR-C05 | Dados imutáveis após cadastro |

---

## Contrato Envolvido

**RecyclingLedger** — `cadastrarCooperativa(nome, cnpj, cidade, estado, material, contato)`

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

**Evento emitido:** `CooperativaCadastrada(address indexed carteira, string nome)`

---

## UI — Tela `/cadastro/cooperativa`

**Campos do formulário:**

| Campo | Tipo | Obrigatório | Placeholder |
|---|---|---|---|
| Nome da Cooperativa | Texto | Sim | "Ex: Cooperativa Verde SP" |
| CNPJ | Texto | Sim | "00.000.000/0001-00" |
| Cidade | Texto | Sim | "São Paulo" |
| Estado | Select 27 UFs | Sim | — |
| Material principal | Select 7 opções | Sim | — |
| E-mail ou contato | Texto | Não | "contato@cooperativa.com" |
| Carteira MetaMask | Botão / Exibe endereço | Sim | — |

**Opções de material:** PET, Alumínio, Papelão, Vidro, Eletrônicos, Plástico Misto, Outros

**Estados do botão de submit:**
- Sem carteira conectada: `"Conecte a carteira para continuar"` (disabled)
- Carteira conectada: `"Cadastrar Cooperativa"`
- Processando: `"Processando..."` (disabled)

**Tela de sucesso:**
- Ícone ✅
- Mensagem: "Cadastro realizado com sucesso. Você já pode registrar pesagens. As pesagens ficarão pendentes até validação de um auditor aprovado."
- Botão "Ir para o Painel →"

---

## Validações

| Validação | Onde | Mensagem |
|---|---|---|
| Nome não vazio | Frontend | "Preencha todos os campos obrigatórios." |
| CNPJ não vazio | Frontend | "Preencha todos os campos obrigatórios." |
| Cidade não vazia | Frontend | "Preencha todos os campos obrigatórios." |
| Estado selecionado | Frontend | "Preencha todos os campos obrigatórios." |
| Material selecionado | Frontend | "Preencha todos os campos obrigatórios." |
| Carteira conectada | Frontend | Botão desabilitado |
| Carteira não duplicada | Contrato | Transação revertida |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| Campos obrigatórios vazios | Formulário incompleto | Exibe mensagem de erro, não envia |
| Carteira não conectada | MetaMask desconectado | Botão desabilitado |
| Cooperativa já cadastrada | Mesmo endereço usado antes | Exibe erro do contrato |
| Transação rejeitada | Usuário cancelou no MetaMask | Exibe mensagem de erro |
| Saldo insuficiente | Sem Sepolia ETH | Exibe erro do MetaMask |

---

## Critérios de Aceite

- [ ] Formulário exibe todos os campos especificados
- [ ] Select de estados tem as 27 UFs brasileiras
- [ ] Select de material tem as 7 opções definidas
- [ ] Botão de carteira abre MetaMask ao clicar
- [ ] Endereço é exibido após conexão da carteira
- [ ] Botão submit é desabilitado sem carteira conectada
- [ ] Campos obrigatórios são validados antes do envio
- [ ] Transação é enviada ao contrato após confirmação
- [ ] Mensagem de sucesso é exibida após confirmação on-chain
- [ ] Roles são atualizados no contexto após sucesso
- [ ] Botão "Ir para o Painel" redireciona para `/cooperativa`
- [ ] Erro de carteira duplicada é exibido corretamente
