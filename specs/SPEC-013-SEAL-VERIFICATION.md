# SPEC-013 — Green Seal Verification Page

| Campo | Valor |
|---|---|
| ID | SPEC-013 |
| Funcionalidade | Página Pública de Verificação do Selo Verde (QR Code) |
| Rota | `/verify/[chainId]/[contractAddress]/[tokenId]` |
| Ator principal | Público / Banca avaliadora (sem login) |
| Status | Implementado |

---

## Visão Geral

Página de auditoria pública aberta ao escanear o QR Code de um Selo Verde. É uma das telas mais importantes para a banca: permite verificar, a partir da blockchain, toda a cadeia de rastreabilidade de um selo — empresa, kg certificados, cooperativas, auditores, pesagens, CIDs IPFS e hashes de transação. Não requer MetaMask nem login.

---

## Atores

| Ator | Descrição |
|---|---|
| Público | Qualquer pessoa que escaneie o QR Code ou abra o link |
| Banca avaliadora | Audita a integridade on-chain do selo |

---

## Pré-condições

- URL no formato `/verify/{chainId}/{contractAddress}/{tokenId}`
- `chainId` = `11155111` (Sepolia)
- `contractAddress` = endereço do contrato GreenSeal
- `tokenId` existente (selo emitido)

---

## Fluxo Principal

```
1. Usuário escaneia o QR Code → abre /verify/11155111/{SEAL}/{tokenId}
2. Sistema valida os parâmetros da URL (chainId e contractAddress)
3. Sistema exibe spinner "Consultando a blockchain..."
4. Sistema carrega dados do selo:
   a. seal.seloEmpresa(tokenId)  → empresaId
   b. seal.seloKg(tokenId)       → kg certificados
5. Sistema carrega pesagens validadas da empresa:
   - ledger.getPesagensPorEmpresa(empresaId)
   - ledger.pesagens(id) para cada uma
6. Sistema busca hashes de transação via queryFilter:
   - SeloEmitido(tokenId)      → tx de mint
   - PesagemRegistrada()        → tx de registro por pesagem
   - PesagemValidada()          → tx de validação por pesagem
7. Renderiza cabeçalho do selo, cooperativas, QR Code,
   bloco on-chain vs off-chain e lista de pesagens certificadas
```

---

## Fluxo Alternativo — URL inválida

```
2. chainId != 11155111 OU contractAddress != endereço do GreenSeal
3. Sistema exibe "URL de verificação inválida" SEM consultar a blockchain
4. Link para voltar ao dashboard
```

---

## Fluxo Alternativo — Token inexistente

```
4. seal.seloEmpresa(tokenId) retorna vazio / reverte
5. Sistema exibe banner "Erro ao carregar dados"
```

---

## Fluxo Alternativo — Hashes não encontrados

```
6. queryFilter não retorna eventos (janela de blocos ou RPC)
7. Sistema exibe fallback: link genérico para o Etherscan
   (a verificação principal não é bloqueada)
```

---

## Dados Exibidos

### Cabeçalho do Selo
| Campo | Fonte |
|---|---|
| Token ID | parâmetro da URL |
| Status | "✅ Válido" (selo existe on-chain) |
| Empresa | `seloEmpresa(tokenId)` |
| Kg certificados | `seloKg(tokenId)` |
| Material(is) | derivado das pesagens da empresa |
| Rede | Ethereum Sepolia (chainId 11155111) |
| Contrato GreenSeal | endereço + link Etherscan |
| Contrato RecyclingLedger | endereço + link Etherscan |
| Transação de mint | via `queryFilter(SeloEmitido)` + link Etherscan |

### Cooperativas Envolvidas
- Endereços únicos das cooperativas das pesagens
- Cada um com link para o Etherscan

### QR Code
- Codifica a própria URL de verificação (`getVerifyUrl(tokenId)`)
- Botões "Copiar link" e "Baixar QR"

### Bloco On-chain vs Off-chain
Texto explicativo fixo:
> Os dados críticos do impacto ficam **on-chain**: peso, material, cooperativa, auditor, status, CID IPFS e NFT emitido. As evidências físicas (fotos do tíquete e dos fardos) ficam **off-chain no IPFS**. A blockchain armazena o hash dessas evidências, garantindo rastreabilidade e integridade.

### Pesagens Certificadas
Por pesagem validada que compõe o selo:
| Campo | Fonte |
|---|---|
| ID da pesagem | `pesagens(id).id` |
| Status | "✅ CERTIFICADA" |
| Material | `pesagens(id).material` |
| Peso em kg | `pesagens(id).pesoKg` |
| Empresa | `pesagens(id).empresaId` |
| Cooperativa | `pesagens(id).cooperativa` + link Etherscan |
| Auditor | `pesagens(id).auditor` + link Etherscan |
| CID IPFS | `pesagens(id).ipfsHash` |
| Link de evidências | gateway IPFS (Pinata) |
| Hash tx de registro | via `queryFilter(PesagemRegistrada)` |
| Hash tx de validação | via `queryFilter(PesagemValidada)` |

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-AC04 | Página pública sem autenticação |
| BR-S12 | TokenId único e global |
| BR-S13 | TokenURI no formato `ipfs://greentrack/{empresaId}/{tokenId}` |
| BR-P10 | Contrato armazena apenas o CID das evidências |
| BR-P12 | Evidências IPFS imutáveis |
| BR-I01 | Dados públicos e verificáveis on-chain |
| BR-I03 | Etherscan como auditoria independente |

---

## Contratos Envolvidos (somente leitura)

| Contrato | Função / Evento | Uso |
|---|---|---|
| GreenSeal | `seloEmpresa(tokenId)` | Empresa dona do selo |
| GreenSeal | `seloKg(tokenId)` | Kg certificados |
| GreenSeal | evento `SeloEmitido` | Hash da tx de mint |
| RecyclingLedger | `getPesagensPorEmpresa(empresaId)` | IDs das pesagens |
| RecyclingLedger | `pesagens(id)` | Detalhes de cada pesagem |
| RecyclingLedger | evento `PesagemRegistrada` | Hash da tx de registro |
| RecyclingLedger | evento `PesagemValidada` | Hash da tx de validação |

---

## QR Code — Conteúdo

- **Sempre** uma URL pública, nunca hash solto, imagem ou base64
- Formato: `{NEXT_PUBLIC_APP_URL}/verify/{chainId}/{contractAddress}/{tokenId}`
- A URL não contém dados sensíveis (sem private key, JWT ou segredo de API)
- A partir da URL é possível consultar: chainId, contrato, tokenId, empresa, kg, pesagens, CIDs IPFS, hashes de transação, auditor, cooperativa e status

---

## Validações

| Validação | Onde | Comportamento |
|---|---|---|
| `chainId` = 11155111 | Frontend | URL inválida exibe erro sem consultar a chain |
| `contractAddress` = GreenSeal | Frontend | URL inválida exibe erro sem consultar a chain |
| `tokenId` numérico válido | Frontend | URL inválida exibe erro |
| Token existe on-chain | Contrato | Banner de erro se não existir |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| URL inválida | chainId/contrato errados | Mensagem "URL de verificação inválida" |
| Token inexistente | tokenId não emitido | Banner "Erro ao carregar dados" |
| Hashes não encontrados | janela de blocos / RPC | Fallback com link genérico Etherscan |
| RPC indisponível | Infura fora do ar | Banner de erro |

---

## Critérios de Aceite

- [ ] URL válida carrega todos os dados do selo
- [ ] URL com chainId errado exibe erro sem consultar a blockchain
- [ ] URL com contrato errado exibe erro sem consultar a blockchain
- [ ] Token inexistente exibe banner de erro
- [ ] Status "✅ Válido" exibido para selos existentes
- [ ] Cooperativas envolvidas listadas com links Etherscan
- [ ] QR Code codifica a própria URL de verificação
- [ ] Bloco on-chain vs off-chain visível
- [ ] Pesagens certificadas listadas com material, peso, cooperativa, auditor, CID
- [ ] Links de evidência abrem o IPFS
- [ ] Hashes de transação (registro, validação, mint) exibidos quando disponíveis
- [ ] Fallback para Etherscan quando hashes não são encontrados
- [ ] Nenhum dado sensível na URL ou na página
