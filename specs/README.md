# SPECs — GreenTrack

Documentação de especificação de cada funcionalidade principal da plataforma.

---

## Índice

| SPEC | Funcionalidade | Rota | Ator | Status |
|---|---|---|---|---|
| [SPEC-001](SPEC-001-WALLET-CONNECTION.md) | Conexão de Carteira e Detecção de Role | `/login` | Público | ✅ Implementado |
| [SPEC-002](SPEC-002-COOPERATIVE-REGISTRATION.md) | Cadastro de Cooperativa | `/cadastro/cooperativa` | Público | ✅ Implementado |
| [SPEC-003](SPEC-003-AUDITOR-REQUEST.md) | Solicitação de Cadastro como Auditor | `/cadastro/auditor` | Público | ✅ Implementado |
| [SPEC-004](SPEC-004-AUDITOR-APPROVAL.md) | Aprovação / Rejeição / Bloqueio de Auditores | `/admin` | ADM | ✅ Implementado |
| [SPEC-005](SPEC-005-WEIGHING-REGISTRATION.md) | Registro de Pesagem de Material Reciclável | `/cooperativa/pesagem` | Cooperativa | ✅ Implementado |
| [SPEC-006](SPEC-006-WEIGHING-VALIDATION.md) | Validação de Pesagem pelo Auditor | `/auditor` | Auditor | ✅ Implementado |
| [SPEC-007](SPEC-007-WEIGHING-REJECTION.md) | Rejeição de Pesagem pelo Auditor | `/auditor` | Auditor | ✅ Implementado |
| [SPEC-008](SPEC-008-GREEN-SEAL-EMISSION.md) | Emissão Automática do Selo Verde (NFT) | Interno | Sistema | ✅ Implementado |
| [SPEC-009](SPEC-009-ADMIN-GOVERNANCE.md) | Painel Administrativo de Governança | `/admin` | ADM | ✅ Implementado |
| [SPEC-010](SPEC-010-PUBLIC-DASHBOARD.md) | Dashboard Público de Métricas | `/` | Público | ✅ Implementado |
| [SPEC-011](SPEC-011-COMPANY-CERTIFICATE.md) | Página Pública de Certificado de Impacto | `/empresa/[id]` | Público | ✅ Implementado |
| [SPEC-012](SPEC-012-COOPERATIVE-PANEL.md) | Painel da Cooperativa | `/cooperativa` | Cooperativa | ✅ Implementado |

---

## Estrutura de cada SPEC

Cada documento segue o template:

```
- Visão Geral
- Atores
- Pré-condições
- Fluxo Principal
- Fluxos Alternativos
- Regras de Negócio (referências ao BUSINESS_RULES.md)
- Contratos Envolvidos
- UI / Tela
- Validações
- Casos de Erro
- Critérios de Aceite
```

---

## Documentos relacionados

| Documento | Descrição |
|---|---|
| [README.md](../README.md) | Visão geral do projeto e instruções de execução |
| [FUNCTIONALITIES.md](../FUNCTIONALITIES.md) | Mapeamento completo de todas as funcionalidades |
| [BUSINESS_RULES.md](../BUSINESS_RULES.md) | Regras de negócio centralizadas (fonte da verdade) |
