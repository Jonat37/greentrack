# SPEC-011 — Company Public Certificate

| Campo | Valor |
|---|---|
| ID | SPEC-011 |
| Funcionalidade | Página Pública de Certificado de Impacto da Empresa |
| Rota | `/empresa/[id]` |
| Ator principal | Público (sem login) |
| Status | Implementado |

---

## Visão Geral

Página pública e verificável de uma empresa apoiadora, acessível por QR Code ou link direto. Exibe o histórico de pesagens validadas, a quantidade de kg reciclados, os Selos Verdes emitidos e um QR Code para compartilhamento. Funciona como o certificado de impacto ambiental da empresa.

---

## Atores

| Ator | Descrição |
|---|---|
| Público | Qualquer pessoa com o link ou QR Code |
| Cooperativa | Pode compartilhar o link com a empresa |
| Empresa apoiadora | Recebe e usa o certificado publicamente |

---

## Pré-condições

- Empresa com pelo menos uma pesagem validada on-chain
- `empresaId` válido e existente no contrato

---

## Fluxo Principal

```
1. Usuário acessa /empresa/[empresaId] (via link ou QR Code)
2. Sistema extrai empresaId da URL
3. Sistema carrega dados da blockchain:
   a. ledger.getPesagensPorEmpresa(empresaId) → IDs de pesagens validadas
   b. ledger.kgPorEmpresa(empresaId) → total de kg validados
   c. seal.totalSelosPorEmpresa(empresaId) → quantidade de selos emitidos
4. Para cada ID de pesagem validada: carrega detalhes
5. Sistema renderiza:
   a. SealCard com métricas e barra de progresso
   b. QRDisplay com QR Code do certificado
   c. Histórico de pesagens validadas
```

---

## Fluxo Alternativo — Empresa sem dados

```
3. ledger.getPesagensPorEmpresa(empresaId) retorna array vazio
4. kgPorEmpresa = 0, selosEmitidos = 0
5. Sistema exibe: "Empresa não encontrada ou sem dados registrados."
```

---

## Componente SealCard

Exibe o resumo de impacto da empresa:

```
┌─────────────────────────────────────────────┐
│  [ID da empresa]                            │
│                                             │
│  2.500 kg        5 pesagens    2 selos      │
│  validados       validadas     emitidos     │
│                                             │
│  ████████████████████░░░░░░░░  50%          │
│  Faltam 500 kg para o próximo Selo Verde    │
└─────────────────────────────────────────────┘
```

**Barra de progresso:**
- `kgNoProximo = totalKg % kgParaSelo`
- `progresso = (kgNoProximo / kgParaSelo) * 100`
- Se `kgNoProximo == 0` e `totalKg > 0`: "Novo selo disponível!"

---

## Componente QRDisplay

```
┌───────────────────────────────────┐
│  [QR Code 180x180]               │
│                                   │
│  Escaneie para verificar o impacto│
│                                   │
│  [Copiar link]  [Baixar QR]       │
└───────────────────────────────────┘
```

**URL do QR Code:** `{NEXT_PUBLIC_APP_URL}/empresa/{empresaId}`

**Botão "Copiar link":**
- Copia URL para clipboard
- Feedback: muda texto para "Copiado!" por 2 segundos
- Fallback: `document.execCommand('copy')` para navegadores sem Clipboard API

**Botão "Baixar QR":**
- Converte SVG → Canvas → PNG
- Filename: `greentrack-qr-{empresaId}.png`
- Tamanho: 180×180 px

---

## Histórico de Pesagens Validadas

Tabela com pesagens da empresa (apenas status VALIDADO):

| Coluna | Dado |
|---|---|
| ID | `#[pesagem.id]` |
| Material | `pesagem.material` |
| Data | `pesagem.timestamp` convertido para pt-BR |
| Peso | `pesagem.pesoKg` kg |

---

## Regras de Negócio Aplicadas

| Código | Regra |
|---|---|
| BR-AC04 | Página pública sem autenticação |
| BR-E08 | Qualquer empresaId com pesagens validadas tem página |
| BR-I01 | Dados públicos e verificáveis on-chain |
| BR-P28 | Histórico completo e imutável |

---

## Contratos Envolvidos (somente leitura)

| Contrato | Função | Dado |
|---|---|---|
| RecyclingLedger | `getPesagensPorEmpresa(id)` | IDs de pesagens validadas |
| RecyclingLedger | `kgPorEmpresa(id)` | Total de kg validados |
| RecyclingLedger | `pesagens(id)` | Detalhes de cada pesagem |
| GreenSeal | `totalSelosPorEmpresa(id)` | Quantidade de selos |

---

## Casos de Erro

| Erro | Causa | Comportamento |
|---|---|---|
| Empresa não encontrada | ID inválido ou sem pesagens | Card amarelo com mensagem |
| Erro de RPC | Infura indisponível | Banner vermelho com mensagem |
| ID com caracteres especiais | URL encoding | `decodeURIComponent` aplicado |

---

## Critérios de Aceite

- [ ] Página acessível sem MetaMask e sem login
- [ ] URL `/empresa/[id]` resolve corretamente
- [ ] SealCard exibe kg totais, pesagens e selos corretamente
- [ ] Barra de progresso reflete o progresso para o próximo selo
- [ ] QR Code é gerado com a URL correta da empresa
- [ ] Botão "Copiar link" funciona e exibe feedback "Copiado!"
- [ ] Botão "Baixar QR" gera arquivo PNG
- [ ] Histórico lista apenas pesagens VALIDADAS
- [ ] Empresa sem dados exibe mensagem apropriada
- [ ] Página é responsiva (mobile-friendly para uso com QR Code)
