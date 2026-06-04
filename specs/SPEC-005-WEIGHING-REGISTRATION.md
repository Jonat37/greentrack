# SPEC-005 — Weighing Registration

| Campo | Valor |
|---|---|
| ID | SPEC-005 |
| Funcionalidade | Registro de Pesagem de Material Reciclável |
| Rota | `/cooperativa/pesagem` |
| Ator principal | Cooperativa (`COOPERATIVA_ROLE`) |
| Status | Implementado |

---

## Visão Geral

Permite que uma cooperativa registre uma pesagem de material reciclável na blockchain, incluindo upload de evidências fotográficas para o IPFS. A pesagem nasce com status `PENDENTE` e aguarda validação de um auditor aprovado.

---

## Atores

| Ator | Descrição |
|---|---|
| Cooperativa | Usuário com `COOPERATIVA_ROLE` ativo |

---

## Pré-condições

- Carteira com `COOPERATIVA_ROLE` conectada ao MetaMask
- Cooperativa com status `ATIVA` (não bloqueada)
- Carteira com Sepolia ETH suficiente para o gas
- Fotos do tíquete da balança e dos fardos disponíveis
- Empresa apoiadora definida (ID da empresa)

---

## Fluxo Principal

```
1. Cooperativa acessa /cooperativa/pesagem
2. Sistema carrega lista de empresas apoiadoras cadastradas
3. Cooperativa preenche o formulário:
   a. Seleciona empresa apoiadora (dropdown ou texto livre)
   b. Seleciona tipo de material
   c. Informa peso em kg
   d. Informa local da coleta (opcional)
   e. Informa data da pesagem (opcional)
   f. Faz upload da foto do tíquete da balança
   g. Faz upload da foto dos fardos/material
   h. Informa observação (opcional)
4. Cooperativa clica em "Registrar Pesagem na Blockchain"
5. Sistema valida campos obrigatórios
6. Sistema faz upload da foto da balança para IPFS
7. Sistema faz upload da foto dos fardos para IPFS
8. Sistema monta metadata JSON com todos os dados
9. Sistema faz upload do JSON para IPFS
10. Sistema obtém signer do MetaMask
11. Sistema chama registrarPesagem() no contrato
12. MetaMask abre popup para confirmar transação
13. Cooperativa confirma e paga o gas
14. Sistema aguarda confirmação on-chain
15. Sistema extrai o ID da pesagem do evento PesagemRegistrada
16. Exibe tela de sucesso com ID da pesagem
```

---

## Fluxo Alternativo — Empresas cadastradas pelo ADM

```
2. Sistema consulta getListaEmpresasApoiadoras()
3. Se há empresas → exibe dropdown com nome + ID
4. Se não há empresas → exibe campo de texto livre
```

---

## Fluxo Alternativo — Falha no upload IPFS

```
6. Chamada para /api/ipfs/upload falha
7. Sistema exibe mensagem de erro
8. Fluxo interrompido, nenhuma transação é enviada
```

---

## Fluxo Alternativo — Cooperativa bloqueada

```
11. Transação enviada ao contrato
12. Contrato verifica COOPERATIVA_ROLE → falha (role foi revogado)
13. Transação reverte
14. Sistema exibe erro ao usuário
```

---

## Estrutura da Metadata IPFS

```json
{
  "versao": "1.0",
  "tipo": "pesagem_reciclagem",
  "material": "PET",
  "pesoKg": 350,
  "empresaId": "00.000.000/0001-00",
  "localColeta": "Galpão Central SP",
  "dataColeta": "2026-06-04",
  "observacao": "Material seco e separado",
  "timestamp": "2026-06-04T18:00:00.000Z",
  "evidencias": {
    "foto_balanca": "ipfs://QmABC...",
    "foto_fardos": "ipfs://QmDEF..."
  }
}
```

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-P01 | Apenas `COOPERATIVA_ROLE` pode registrar |
| BR-P02 | Peso deve ser maior que zero |
| BR-P03 | Hash IPFS é obrigatório |
| BR-P04 | ID da empresa apoiadora é obrigatório |
| BR-P05 | Local, data e observação são opcionais |
| BR-P06 | Pesagem nasce com status `PENDENTE` |
| BR-P07 | Timestamp definido pelo bloco, não pelo usuário |
| BR-P09 | Duas fotos obrigatórias (balança e fardos) |
| BR-P10 | Contrato armazena apenas o CID IPFS |
| BR-P11 | Metadata JSON armazena todos os dados de evidência |
| BR-P12 | Evidências IPFS são imutáveis |

---

## Contrato Envolvido

**RecyclingLedger** — `registrarPesagem(material, pesoKg, ipfsHash, empresaId, localColeta, dataColeta, observacao)`

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

**Evento emitido:** `PesagemRegistrada(uint256 indexed id, address indexed cooperativa, string material, uint256 pesoKg, string ipfsHash, string empresaId)`

---

## APIs Envolvidas

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/ipfs/upload` | POST | Upload de arquivo (imagem) para IPFS via Pinata |
| `/api/ipfs/json` | POST | Upload de JSON (metadata) para IPFS via Pinata |

---

## UI — Tela `/cooperativa/pesagem`

**Campos do formulário:**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Empresa apoiadora | Dropdown (se cadastradas) ou texto livre | Sim |
| Tipo de material | Select (PET, Alumínio, Papelão, Vidro, Eletrônicos, Plástico Misto, Outros) | Sim |
| Peso em kg | Número (mín. 1) | Sim |
| Local da coleta | Texto | Não |
| Data da pesagem | Date picker | Não |
| Foto do tíquete da balança | Upload de imagem | Sim |
| Foto dos fardos / material | Upload de imagem | Sim |
| Observação | Textarea | Não |

**Mensagens de progresso (durante envio):**
```
📤 Enviando foto da balança para IPFS...
📤 Enviando foto dos fardos para IPFS...
🔗 Criando metadados no IPFS...
⛓️ Conectando carteira...
📝 Registrando pesagem na blockchain...
```

**Tela de sucesso:**
- Mensagem: "Pesagem #[ID] registrada com sucesso! Aguardando validação do auditor."
- Botão "Nova pesagem" (reseta formulário)
- Link "Ver histórico" → `/cooperativa`

---

## Validações

| Validação | Onde | Comportamento |
|---|---|---|
| Empresa selecionada/informada | Frontend | Erro de validação |
| Material selecionado | Frontend | Erro de validação |
| Peso > 0 | Frontend e Contrato | Erro + reverte |
| Foto balança presente | Frontend | Erro de validação |
| Foto fardos presente | Frontend | Erro de validação |
| `COOPERATIVA_ROLE` ativo | Contrato | Transação reverte |
| Hash IPFS não vazio | Contrato | Transação reverte |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| Campos obrigatórios vazios | Formulário incompleto | Mensagem de erro |
| Peso inválido | Valor <= 0 | Mensagem de erro |
| Falha no upload IPFS | Pinata indisponível ou JWT inválido | Mensagem de erro, não envia transação |
| Sem `COOPERATIVA_ROLE` | Cooperativa bloqueada | Erro do contrato |
| Transação rejeitada | Usuário cancelou | Mensagem de erro |
| Saldo insuficiente | Sem Sepolia ETH | Erro do MetaMask |

---

## Critérios de Aceite

- [ ] Empresas cadastradas pelo ADM aparecem no dropdown
- [ ] Sem empresas cadastradas: campo de texto livre exibido
- [ ] Sete opções de material disponíveis
- [ ] Peso aceita apenas números positivos
- [ ] Dois campos de upload de imagem obrigatórios
- [ ] Mensagens de progresso exibidas durante envio
- [ ] Fotos são armazenadas no IPFS antes da transação
- [ ] Metadata JSON é enviada ao IPFS com estrutura correta
- [ ] Transação chama `registrarPesagem()` com todos os parâmetros
- [ ] ID da pesagem é extraído do evento on-chain
- [ ] Tela de sucesso exibe o ID correto
- [ ] Pesagem aparece como PENDENTE em `/cooperativa`
