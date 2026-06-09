// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IGreenSeal {
    function emitirSelo(string calldata empresaId, uint256 totalKg) external;
    function totalSelosPorEmpresa(string calldata empresaId) external view returns (uint256);
}

contract RecyclingLedger is AccessControl {
    bytes32 public constant COOPERATIVA_ROLE = keccak256("COOPERATIVA_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // RECEBIDO  → entrada pesada (fase 1)
    // PROCESSADO → reciclado/rejeito informados, balanço fechado (fase 2)
    // VALIDADO  → auditor confirmou; reciclado contabilizado
    // REJEITADO → auditor recusou
    enum StatusLote { RECEBIDO, PROCESSADO, VALIDADO, REJEITADO }
    enum StatusAuditor { PENDENTE, APROVADO, REJEITADO, BLOQUEADO }
    enum StatusCooperativa { ATIVA, BLOQUEADA }

    struct Lote {
        uint256 id;
        address recicladora;     // quem opera (detém COOPERATIVA_ROLE)
        string material;
        uint256 pesoEntrada;     // kg recebido (fase 1)
        uint256 pesoReciclado;   // kg de saída reciclada (fase 2)
        uint256 pesoRejeito;     // kg de rejeito (fase 2)
        uint256 pesoPerda;       // derivado on-chain = entrada - reciclado - rejeito
        string ipfsEntrada;      // evidências da pesagem de entrada
        string ipfsProcesso;     // evidências do processamento (saída + rejeito)
        uint256 recebidoEm;
        uint256 processadoEm;
        StatusLote status;
        address auditor;
        string empresaId;
        string localColeta;
        string dataColeta;
    }

    struct Cooperativa {
        string nome;
        string cnpj;
        string cidade;
        string estado;
        string material;
        string contato;
        address carteira;
        StatusCooperativa status;
        uint256 cadastradoEm;
    }

    struct SolicitacaoAuditor {
        string nome;
        string organizacao;
        string tipoAuditor;
        string cidade;
        string estado;
        string documento;
        address carteira;
        StatusAuditor status;
        uint256 solicitadoEm;
    }

    struct EmpresaApoiadora {
        string nome;
        string cnpj;
        bool ativa;
    }

    uint256 public totalLotes;
    uint256 public totalRecicladoGlobal;   // métrica de impacto = kg reciclado
    uint256 public totalEntradaGlobal;     // kg recebido (para taxa de reciclagem)
    uint256 public kgParaSelo = 1000;      // meta em kg RECICLADOS por selo

    mapping(uint256 => Lote) public lotes;
    mapping(string => uint256[]) public lotesPorEmpresa;       // lotes VALIDADOS por empresa
    mapping(string => uint256) public recicladoPorEmpresa;
    mapping(string => uint256) public entradaPorEmpresa;
    mapping(address => uint256[]) public lotesPorCooperativa;  // todos os lotes da recicladora

    string[] private empresas;
    mapping(string => bool) private empresaRegistrada;

    mapping(address => Cooperativa) public cooperativas;
    address[] public listaCooperativas;

    mapping(address => SolicitacaoAuditor) public auditores;
    address[] public listaAuditores;

    mapping(string => EmpresaApoiadora) public empresasApoiadoras;
    string[] public listaEmpresasApoiadoras;

    IGreenSeal public greenSeal;

    event LoteRecebido(uint256 indexed id, address indexed recicladora, string material, uint256 pesoEntrada, string empresaId);
    event LoteProcessado(uint256 indexed id, uint256 pesoReciclado, uint256 pesoRejeito, uint256 pesoPerda);
    event LoteValidado(uint256 indexed id, address indexed auditor);
    event LoteRejeitado(uint256 indexed id, address indexed auditor, string motivo);
    event CooperativaCadastrada(address indexed carteira, string nome);
    event AuditorSolicitado(address indexed carteira, string nome);
    event AuditorAprovado(address indexed carteira);
    event AuditorRejeitado(address indexed carteira);
    event AuditorBloqueado(address indexed carteira);
    event AuditorDesbloqueado(address indexed carteira);
    event CooperativaBloqueada(address indexed carteira);
    event CooperativaDesbloqueada(address indexed carteira);
    event KgParaSeloAtualizado(uint256 novoValor);
    event EmpresaApoiadoraCadastrada(string empresaId, string nome);

    constructor(address _greenSeal) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        greenSeal = IGreenSeal(_greenSeal);
    }

    // ── Cadastro de Cooperativa (auto-registro) ─────────────────────────────

    function cadastrarCooperativa(
        string calldata nome,
        string calldata cnpj,
        string calldata cidade,
        string calldata estado,
        string calldata material,
        string calldata contato
    ) external {
        require(cooperativas[msg.sender].carteira == address(0), "Cooperativa ja cadastrada");

        cooperativas[msg.sender] = Cooperativa({
            nome: nome,
            cnpj: cnpj,
            cidade: cidade,
            estado: estado,
            material: material,
            contato: contato,
            carteira: msg.sender,
            status: StatusCooperativa.ATIVA,
            cadastradoEm: block.timestamp
        });

        listaCooperativas.push(msg.sender);
        _grantRole(COOPERATIVA_ROLE, msg.sender);

        emit CooperativaCadastrada(msg.sender, nome);
    }

    // ── Solicitação de Auditor ──────────────────────────────────────────────

    function solicitarAuditor(
        string calldata nome,
        string calldata organizacao,
        string calldata tipoAuditor,
        string calldata cidade,
        string calldata estado,
        string calldata documento
    ) external {
        require(auditores[msg.sender].carteira == address(0), "Auditor ja solicitado");

        auditores[msg.sender] = SolicitacaoAuditor({
            nome: nome,
            organizacao: organizacao,
            tipoAuditor: tipoAuditor,
            cidade: cidade,
            estado: estado,
            documento: documento,
            carteira: msg.sender,
            status: StatusAuditor.PENDENTE,
            solicitadoEm: block.timestamp
        });

        listaAuditores.push(msg.sender);

        emit AuditorSolicitado(msg.sender, nome);
    }

    // ── Funções ADM ─────────────────────────────────────────────────────────

    function aprovarAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(auditores[carteira].carteira != address(0), "Auditor nao encontrado");
        auditores[carteira].status = StatusAuditor.APROVADO;
        _grantRole(AUDITOR_ROLE, carteira);
        emit AuditorAprovado(carteira);
    }

    function rejeitarAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(auditores[carteira].carteira != address(0), "Auditor nao encontrado");
        auditores[carteira].status = StatusAuditor.REJEITADO;
        _revokeRole(AUDITOR_ROLE, carteira);
        emit AuditorRejeitado(carteira);
    }

    function bloquearAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(auditores[carteira].carteira != address(0), "Auditor nao encontrado");
        auditores[carteira].status = StatusAuditor.BLOQUEADO;
        _revokeRole(AUDITOR_ROLE, carteira);
        emit AuditorBloqueado(carteira);
    }

    function desbloquearAuditor(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(auditores[carteira].carteira != address(0), "Auditor nao encontrado");
        auditores[carteira].status = StatusAuditor.APROVADO;
        _grantRole(AUDITOR_ROLE, carteira);
        emit AuditorDesbloqueado(carteira);
    }

    function bloquearCooperativa(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(cooperativas[carteira].carteira != address(0), "Cooperativa nao encontrada");
        cooperativas[carteira].status = StatusCooperativa.BLOQUEADA;
        _revokeRole(COOPERATIVA_ROLE, carteira);
        emit CooperativaBloqueada(carteira);
    }

    function desbloquearCooperativa(address carteira) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(cooperativas[carteira].carteira != address(0), "Cooperativa nao encontrada");
        cooperativas[carteira].status = StatusCooperativa.ATIVA;
        _grantRole(COOPERATIVA_ROLE, carteira);
        emit CooperativaDesbloqueada(carteira);
    }

    function setKgParaSelo(uint256 kg) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(kg > 0, "Valor invalido");
        kgParaSelo = kg;
        emit KgParaSeloAtualizado(kg);
    }

    function cadastrarEmpresaApoiadora(
        string calldata empresaId,
        string calldata nome,
        string calldata cnpj
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!empresasApoiadoras[empresaId].ativa) {
            listaEmpresasApoiadoras.push(empresaId);
        }
        empresasApoiadoras[empresaId] = EmpresaApoiadora({ nome: nome, cnpj: cnpj, ativa: true });
        emit EmpresaApoiadoraCadastrada(empresaId, nome);
    }

    // ── Lotes: fase 1 (entrada) ─────────────────────────────────────────────

    function registrarEntrada(
        string calldata material,
        uint256 pesoEntrada,
        string calldata empresaId,
        string calldata ipfsEntrada,
        string calldata localColeta,
        string calldata dataColeta
    ) external onlyRole(COOPERATIVA_ROLE) {
        require(pesoEntrada > 0, "Peso entrada invalido");
        require(bytes(ipfsEntrada).length > 0, "IPFS entrada obrigatorio");

        uint256 id = ++totalLotes;

        lotes[id] = Lote({
            id: id,
            recicladora: msg.sender,
            material: material,
            pesoEntrada: pesoEntrada,
            pesoReciclado: 0,
            pesoRejeito: 0,
            pesoPerda: 0,
            ipfsEntrada: ipfsEntrada,
            ipfsProcesso: "",
            recebidoEm: block.timestamp,
            processadoEm: 0,
            status: StatusLote.RECEBIDO,
            auditor: address(0),
            empresaId: empresaId,
            localColeta: localColeta,
            dataColeta: dataColeta
        });

        lotesPorCooperativa[msg.sender].push(id);

        emit LoteRecebido(id, msg.sender, material, pesoEntrada, empresaId);
    }

    // ── Lotes: fase 2 (processamento + balanço de massa) ────────────────────

    function registrarProcessamento(
        uint256 id,
        uint256 pesoReciclado,
        uint256 pesoRejeito,
        string calldata ipfsProcesso
    ) external onlyRole(COOPERATIVA_ROLE) {
        require(id > 0 && id <= totalLotes, "Lote inexistente");
        Lote storage l = lotes[id];
        require(l.status == StatusLote.RECEBIDO, "Lote nao esta RECEBIDO");
        require(l.recicladora == msg.sender, "Apenas quem recebeu processa");
        require(bytes(ipfsProcesso).length > 0, "IPFS processo obrigatorio");
        // ── INVARIANTE DE BALANÇO DE MASSA ──
        require(pesoReciclado + pesoRejeito <= l.pesoEntrada, "Balanco nao fecha");

        l.pesoReciclado = pesoReciclado;
        l.pesoRejeito = pesoRejeito;
        l.pesoPerda = l.pesoEntrada - pesoReciclado - pesoRejeito;
        l.ipfsProcesso = ipfsProcesso;
        l.processadoEm = block.timestamp;
        l.status = StatusLote.PROCESSADO;

        emit LoteProcessado(id, pesoReciclado, pesoRejeito, l.pesoPerda);
    }

    // ── Lotes: validação / rejeição (auditor) ───────────────────────────────

    function validarLote(uint256 id) external onlyRole(AUDITOR_ROLE) {
        require(id > 0 && id <= totalLotes, "Lote inexistente");
        Lote storage l = lotes[id];
        require(l.status == StatusLote.PROCESSADO, "Lote precisa estar PROCESSADO");
        require(l.recicladora != msg.sender, "Auditor nao pode validar proprio lote");

        l.status = StatusLote.VALIDADO;
        l.auditor = msg.sender;

        lotesPorEmpresa[l.empresaId].push(id);
        recicladoPorEmpresa[l.empresaId] += l.pesoReciclado;
        entradaPorEmpresa[l.empresaId] += l.pesoEntrada;

        if (!empresaRegistrada[l.empresaId]) {
            empresaRegistrada[l.empresaId] = true;
            empresas.push(l.empresaId);
        }
        totalRecicladoGlobal += l.pesoReciclado;
        totalEntradaGlobal += l.pesoEntrada;

        emit LoteValidado(id, msg.sender);
        _verificarEmissaoSelo(l.empresaId);
    }

    function rejeitarLote(uint256 id, string calldata motivo) external onlyRole(AUDITOR_ROLE) {
        require(id > 0 && id <= totalLotes, "Lote inexistente");
        Lote storage l = lotes[id];
        require(l.status == StatusLote.RECEBIDO || l.status == StatusLote.PROCESSADO, "Status invalido");

        l.status = StatusLote.REJEITADO;
        l.auditor = msg.sender;

        emit LoteRejeitado(id, msg.sender, motivo);
    }

    // ── Leitura ─────────────────────────────────────────────────────────────

    function getLotesPorEmpresa(string calldata empresaId) external view returns (uint256[] memory) {
        return lotesPorEmpresa[empresaId];
    }

    function getLotesPorCooperativa(address carteira) external view returns (uint256[] memory) {
        return lotesPorCooperativa[carteira];
    }

    function getEmpresas() external view returns (string[] memory) {
        return empresas;
    }

    function getListaCooperativas() external view returns (address[] memory) {
        return listaCooperativas;
    }

    function getListaAuditores() external view returns (address[] memory) {
        return listaAuditores;
    }

    function getListaEmpresasApoiadoras() external view returns (string[] memory) {
        return listaEmpresasApoiadoras;
    }

    // ── Interno ─────────────────────────────────────────────────────────────

    function _verificarEmissaoSelo(string memory empresaId) internal {
        uint256 selosDevidos = recicladoPorEmpresa[empresaId] / kgParaSelo;
        uint256 selosEmitidos = greenSeal.totalSelosPorEmpresa(empresaId);

        if (selosDevidos > selosEmitidos) {
            greenSeal.emitirSelo(empresaId, recicladoPorEmpresa[empresaId]);
        }
    }
}
