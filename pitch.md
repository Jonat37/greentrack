# GreenTrack — Pitch

> Rastreabilidade de reciclagem na blockchain: cada quilo triado vira um registro
> imutável e auditável que sustenta um **Selo Verde** (NFT) de impacto ambiental.

**Rede:** Ethereum Sepolia (testnet · chainId `11155111`)
**Contratos:**
- RecyclingLedger — `0xd9496CEBb2C579185A15c8d6d98D5Da9dfD7BE90`
- GreenSeal (ERC-721) — `0x373b2FAF5733B6e5A50f5BF09663Cf33DE73191F`

---

## O problema

Empresas precisam comprovar metas de **logística reversa** e **ESG**, mas hoje compram
créditos de reciclagem baseados em **notas fiscais frias** e **relatórios em PDF** — fáceis
de duplicar, inflar e fraudar. Não há um elo verificável entre o material que foi
efetivamente reciclado por uma cooperativa de catadores e o certificado que a empresa
exibe ao mercado.

As cooperativas, por outro lado, fazem o trabalho real de triagem mas não têm uma forma
simples e confiável de **provar** seu impacto para quem paga por ele.

---

## A solução em uma frase

O GreenTrack transforma cada pesagem de material reciclável em um **registro imutável
on-chain**, validado por um auditor independente, com **evidências fotográficas ancoradas
no IPFS** — e emite **automaticamente** um NFT "Selo Verde" para a empresa apoiadora a
cada meta de quilos atingida. Qualquer pessoa audita o selo escaneando um QR Code.

---

## Respostas às questões do desafio

### Uso de blockchain

Toda a cadeia de confiança vive na blockchain Ethereum Sepolia. A blockchain é usada como
um **livro-razão de massa reciclada**: imutável, público e verificável por qualquer pessoa,
sem depender da palavra de nenhuma das partes. Não há banco de dados central que possa ser
editado depois — o histórico de pesagens, validações e selos é permanente.

### Registro de ações de impacto

Cada "ação de impacto" é uma **pesagem** de material reciclável registrada pela cooperativa.
Ela nasce com status `PENDENTE` e só passa a contar quando um auditor a valida (`VALIDADO`).
A soma dos quilos validados por empresa é o impacto rastreado on-chain.

### Uso de smart contracts

Dois contratos compõem o sistema:

- **RecyclingLedger** — registra e valida pesagens, gerencia papéis (cooperativa, auditor,
  admin) via OpenZeppelin `AccessControl`, acumula os quilos por empresa e dispara a emissão
  do selo.
- **GreenSeal** — contrato NFT ERC-721 que emite o Selo Verde. Só aceita ordens de emissão
  vindas do RecyclingLedger autorizado (`onlyLedger`).

### Histórico auditável

Nada pode ser apagado ou alterado retroativamente. Cada pesagem guarda material, peso,
cooperativa, auditor, status, CID das evidências e empresa. Cada ação relevante emite um
**evento on-chain** (`PesagemRegistrada`, `PesagemValidada`, `SeloEmitido`, etc.), e tudo é
inspecionável no **Sepolia Etherscan** de forma independente da nossa aplicação.

### Emissão automática de certificados / NFTs

O Selo Verde é emitido **automaticamente** dentro da mesma transação de validação: quando
os quilos acumulados de uma empresa cruzam a meta (padrão **1.000 kg**, configurável pelo
admin), o RecyclingLedger chama `GreenSeal.emitirSelo()`. Não há emissão manual — o
certificado é uma consequência matemática do impacto comprovado.

### Clareza da solução

O fluxo é direto e mapeado em telas dedicadas:

```
Cooperativa registra pesagem  →  Auditor valida  →  Selo Verde emitido automaticamente
        (com fotos no IPFS)        (on-chain)            (NFT ERC-721)
                                                              ↓
                                          QR Code → página pública de verificação
```

### Valor social, ambiental e comunitário

- **Social:** dá às cooperativas de catadores uma prova verificável e valorizada do seu
  trabalho, fortalecendo sua posição na cadeia de logística reversa.
- **Ambiental:** cria um lastro real e auditável para créditos de reciclagem, combatendo a
  fraude que esvazia o mercado de ESG.
- **Comunitário:** o ecoponto local ou fiscal parceiro entra como auditor, distribuindo a
  confiança entre atores da própria comunidade.

### Aplicação prática real

Empresas com metas de logística reversa (Política Nacional de Resíduos Sólidos, compromissos
ESG) podem comprovar reciclagem com lastro físico + on-chain, em vez de PDFs. Cooperativas
ganham um canal de monetização e reputação. O Selo Verde NFT pode ser exibido publicamente
como prova de impacto.

### Quais dados são registrados

On-chain, em cada pesagem:

| Dado | Descrição |
|---|---|
| Material | PET, Alumínio, Papelão, Vidro, Eletrônicos, etc. |
| Peso (kg) | Quantidade triada |
| Empresa apoiadora | Quem recebe o crédito de impacto |
| Cooperativa | Endereço que registrou |
| Auditor | Endereço que validou |
| Status | PENDENTE / VALIDADO / REJEITADO |
| Timestamp | Momento do registro (definido pelo bloco) |
| CID IPFS | Hash das evidências |
| Local e data da coleta | Contexto da triagem |

E no selo: token ID, empresa, total de kg certificados e o tokenURI.

### Quais evidências são vinculadas às ações

Duas fotos obrigatórias por pesagem — o **tíquete da balança** e os **fardos do material** —
são enviadas ao **IPFS** (via Pinata). O contrato grava apenas o **hash (CID)** dessas
evidências. Como o IPFS é endereçado por conteúdo, qualquer alteração na foto mudaria o hash
e quebraria a correspondência com o registro on-chain — tornando a fraude detectável.

### Como a informação pode ser consultada ou verificada

Três caminhos, todos **sem necessidade de login**:

1. **Dashboard público** (`/dashboard`) — métricas globais, ranking de empresas por kg
   certificado e os últimos Selos Verdes.
2. **Página de verificação** (`/verify/{chainId}/{contractAddress}/{tokenId}`) — aberta ao
   escanear o **QR Code** do selo. Mostra empresa, kg, cooperativas, auditores, todas as
   pesagens que compõem o selo, CIDs IPFS e hashes das transações.
3. **Sepolia Etherscan** — auditoria independente direta no contrato, sem passar pela nossa
   aplicação.

> O QR Code carrega **a URL pública de verificação**, não um hash solto nem um arquivo —
> levando a banca direto à auditoria completa.

### Quem participa do fluxo

| Papel | Responsabilidade |
|---|---|
| **Cooperativa** (Signer A) | Cadastra-se e registra pesagens com evidências |
| **Auditor / Ecoponto / Fiscal** (Signer B) | Valida ou rejeita pesagens; não pode validar a própria |
| **Administrador** | Aprova auditores, gerencia papéis, define a meta de kg, cadastra empresas |
| **Empresa apoiadora** | Recebe o Selo Verde NFT e exibe o impacto |
| **Público / Banca** | Audita tudo on-chain, sem login |

A separação de papéis garante que quem registra não é quem valida — o conflito de interesse
é bloqueado pelo próprio contrato.

### Qual métrica de impacto está sendo acompanhada

A métrica central é **quilos de material reciclável validados** — por empresa, por
cooperativa e globalmente (`totalKgValidadoGlobal`). Dela derivam: número de pesagens
validadas, Selos Verdes emitidos, empresas certificadas e o ranking por kg. A meta de
**1.000 kg por selo** converte massa reciclada em reconhecimento.

### Como a solução aumenta transparência e confiança

- **Imutabilidade:** registros não podem ser editados ou apagados.
- **Separação de papéis:** quem pesa ≠ quem valida ≠ quem governa.
- **Evidência ancorada:** fotos no IPFS com hash on-chain — adulteração é detectável.
- **Verificação aberta:** qualquer um audita pelo QR Code ou pelo Etherscan, sem login.
- **Sem intermediário de confiança:** a regra (1.000 kg → 1 selo) é executada pelo contrato,
  não por uma planilha ou por uma pessoa.

---

## Diferencial para o pitch (demo)

A empresa exibe o **QR Code do seu Selo de Impacto**. Ao escanear, abre-se a página de
verificação que lista, **diretamente da testnet**, todas as pesagens reais que compõem
aquele selo — com peso, material, cooperativa, auditor, fotos no IPFS e os hashes das
transações de registro e de validação. Da prova de marketing ao lastro on-chain em um toque.

---

## Status do projeto

- Contratos implantados e funcionais na Ethereum Sepolia
- **Balanço de massa por lote reconciliado on-chain** (entrada → reciclado + rejeito + perda):
  o contrato recusa um processamento cujo balanço não fecha (`reciclado + rejeito ≤ entrada`),
  e a métrica de impacto/selo é o material **efetivamente reciclado**, não o recebido
- Fluxo de lote em duas fases (entrada e processamento) com separação de papéis: quem
  registra ≠ quem valida
- Frontend completo: landing, dashboard público (com taxa de reciclagem), verificação por
  QR Code com a trilha completa do lote, painéis de recicladora/auditor/admin, cadastro e
  certificado de empresa
- Evidências em IPFS via Pinata (fotos de balança, saída e rejeito), com upload protegido
  por rota de servidor
- Documentação completa: `README.md`, `FUNCTIONALITIES.md`, `BUSINESS_RULES.md`,
  `CONTRACT_OVERVIEW.md`, `CONTRACT_FUNCTIONS.md`, `CONTRACT_SECURITY.md`, `DEPLOYMENTS.md`
  e 13 SPECs em `specs/`

> Observação técnica: o conceito original previa a rede Polygon Amoy; a implementação atual
> roda na **Ethereum Sepolia**. A arquitetura é agnóstica de rede EVM e pode ser reimplantada
> em Polygon ou em uma L2 para reduzir custo de gas em produção.

---

*GreenTrack · Certificação ambiental verificável na blockchain*
