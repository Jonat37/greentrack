# SPEC-008 — Green Seal NFT Emission

| Campo | Valor |
|---|---|
| ID | SPEC-008 |
| Funcionalidade | Emissão Automática do Selo Verde (NFT ERC-721) |
| Rota | Interno — disparado por `validarPesagem()` |
| Ator principal | Sistema (automático) |
| Status | Implementado |

---

## Visão Geral

O Selo Verde é um NFT ERC-721 emitido automaticamente pelo smart contract sempre que uma empresa apoiadora atinge a meta de kg reciclados validados. Nenhuma ação humana é necessária para emitir o selo: ele é gerado na mesma transação em que o auditor valida a pesagem que ultrapassa a meta.

---

## Atores

| Ator | Descrição |
|---|---|
| Sistema | O próprio smart contract RecyclingLedger |
| Auditor | Dispara indiretamente ao validar uma pesagem |

---

## Pré-condições

- Uma pesagem foi validada pelo auditor
- Os kg acumulados da empresa (após a validação) atingem ou ultrapassam um múltiplo da meta (`kgParaSelo`)
- O contrato GreenSeal está autorizado a receber chamadas do RecyclingLedger (`ledger` configurado)

---

## Fluxo de Emissão (Automático)

```
1. Auditor chama validarPesagem(id)
2. Contrato executa validarPesagem():
   a. Atualiza status da pesagem para VALIDADO
   b. Soma pesoKg a kgPorEmpresa[empresaId]
   c. Chama internamente _verificarEmissaoSelo(empresaId)

3. _verificarEmissaoSelo(empresaId):
   a. Calcula selosDevidos = kgPorEmpresa[empresaId] / kgParaSelo
   b. Consulta selosEmitidos = greenSeal.totalSelosPorEmpresa(empresaId)
   c. Se selosDevidos > selosEmitidos:
      → Chama greenSeal.emitirSelo(empresaId, kgPorEmpresa[empresaId])

4. GreenSeal.emitirSelo():
   a. Incrementa nextTokenId
   b. Chama _mint(address(this), tokenId)  ← NFT fica no contrato
   c. Define tokenURI = "ipfs://greentrack/{empresaId}/{tokenId}"
   d. Atualiza totalSelosPorEmpresa[empresaId]++
   e. Adiciona tokenId em _selosPorEmpresa[empresaId]
   f. Registra seloEmpresa[tokenId] = empresaId
   g. Registra seloKg[tokenId] = totalKg
   h. Emite evento SeloEmitido

5. Tudo ocorre na MESMA transação de validarPesagem()
```

---

## Cálculo da Meta

```
selosDevidos  = kgPorEmpresa[empresaId] / kgParaSelo   (divisão inteira)
selosEmitidos = greenSeal.totalSelosPorEmpresa(empresaId)

Se selosDevidos > selosEmitidos → emite 1 selo
```

**Exemplos com meta de 1.000 kg:**

| Kg acumulados | Selos devidos | Selos já emitidos | Emite? |
|---|---|---|---|
| 800 | 0 | 0 | ❌ |
| 1.000 | 1 | 0 | ✅ |
| 1.200 | 1 | 1 | ❌ |
| 2.000 | 2 | 1 | ✅ |
| 2.500 | 2 | 2 | ❌ |

**Caso especial — pesagem grande que ultrapassa múltiplas metas:**
- Se empresa tem 500 kg e recebe validação de 2.000 kg → total 2.500 kg
- `selosDevidos = 2`, `selosEmitidos = 0`
- Apenas **1 selo** é emitido (a verificação emite um por vez)
- Para emitir o segundo, seria necessária outra validação que ultrapasse 2.000 kg

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-S01 | Emissão automática via contrato, sem intervenção humana |
| BR-S02 | Emitido na mesma transação de `validarPesagem()` |
| BR-S03 | NFT custodiado pelo contrato GreenSeal |
| BR-S04 | Não transferível via fluxo padrão |
| BR-S05 | Meta padrão: 1.000 kg |
| BR-S06 | Meta configurável pelo ADM |
| BR-S07 | Meta é global para todas as empresas |
| BR-S08 | Alteração da meta não afeta selos já emitidos |
| BR-S09 | Selos cumulativos e proporcionais |
| BR-S10 | Pesagem grande emite apenas 1 selo por vez |
| BR-S11 | Cada selo registra kg totais no momento da emissão |
| BR-S12 | TokenId único e global |
| BR-S13 | TokenURI no formato `ipfs://greentrack/{empresaId}/{tokenId}` |

---

## Contratos Envolvidos

**RecyclingLedger** — `_verificarEmissaoSelo(string memory empresaId)` (função interna)

**GreenSeal** — `emitirSelo(string calldata empresaId, uint256 totalKg)` (apenas RecyclingLedger pode chamar)

```solidity
modifier onlyLedger() {
    require(msg.sender == ledger, "Apenas o Ledger pode emitir");
    _;
}

function emitirSelo(string calldata empresaId, uint256 totalKg)
    external
    onlyLedger
```

**Evento emitido:**
```solidity
event SeloEmitido(
    uint256 indexed tokenId,
    string empresaId,
    uint256 totalKg,
    string tokenURI
);
```

---

## Dados do NFT

| Campo | Valor |
|---|---|
| Padrão | ERC-721 (ERC721URIStorage) |
| Nome do token | "GreenSeal Impact NFT" |
| Símbolo | "GSEAL" |
| Dono (owner) | Contrato GreenSeal (`address(this)`) |
| TokenURI | `ipfs://greentrack/{empresaId}/{tokenId}` |
| Transferível | Não (permanece no contrato) |

---

## Visualização nos Painéis

**Painel da Cooperativa (`/cooperativa`):**
- Bloco "Selos Verdes Emitidos" aparece se houver selos relacionados
- Exibe: Token ID, empresa, kg certificados, QR Code, link para página pública

**Página Pública da Empresa (`/empresa/[id]`):**
- `SealCard` exibe total de kg, pesagens, selos e barra de progresso
- `QRDisplay` gera QR Code para o certificado

**SealCard — Barra de progresso:**
```
kgNoProximo = totalKg % kgParaSelo
progresso   = (kgNoProximo / kgParaSelo) * 100
faltam      = kgParaSelo - kgNoProximo
```

---

## Casos de Erro / Exceções

| Situação | Comportamento |
|---|---|
| GreenSeal não autorizado (ledger não configurado) | `emitirSelo()` reverte — toda a transação de validação é revertida |
| Meta não atingida | Nenhum selo emitido, validação prossegue normalmente |
| Meta já atingida (selos devidos == emitidos) | Nenhum novo selo, validação prossegue |

---

## Critérios de Aceite

- [ ] Selo emitido automaticamente ao validar pesagem que atinge a meta
- [ ] Selo **não** emitido quando meta não foi atingida
- [ ] Segundo selo emitido ao dobrar a meta de kg
- [ ] TokenId é único e incrementado globalmente
- [ ] `seloEmpresa[tokenId]` registra a empresa correta
- [ ] `seloKg[tokenId]` registra o total de kg no momento da emissão
- [ ] `getSelosPorEmpresa()` retorna os tokenIds corretos
- [ ] NFT custodiado pelo contrato GreenSeal
- [ ] Evento `SeloEmitido` emitido e verificável no Etherscan
- [ ] Painel da cooperativa exibe o novo selo após validação
- [ ] Página pública da empresa exibe o novo selo
