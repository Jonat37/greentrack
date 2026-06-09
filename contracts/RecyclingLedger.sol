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

    enum Status { PENDENTE, VALIDADO, REJEITADO }
    enum StatusAuditor { PENDENTE, APROVADO, REJEITADO, BLOQUEADO }
    enum StatusCooperativa { ATIVA, BLOQUEADA }

    struct Pesagem {
        uint256 id;
        address cooperativa;
        string material;
        uint256 pesoKg;
        string ipfsHash;
        uint256 timestamp;
        Status status;
        address auditor;
        string empresaId;
        string localColeta;
        string dataColeta;
        string observacao;
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

    uint256 public totalPesagens;
    uint256 public totalKgValidadoGlobal;
    uint256 public kgParaSelo = 1000;

    mapping(uint256 => Pesagem) public pesagens;
    mapping(string => uint256[]) public pesagensPorEmpresa;
    mapping(string => uint256) public kgPorEmpresa;
    mapping(address => uint256[]) public pesagensPorCooperativa;

    string[] private empresas;
    mapping(string => bool) private empresaRegistrada;

    mapping(address => Cooperativa) public cooperativas;
    address[] public listaCooperativas;

    mapping(address => SolicitacaoAuditor) public auditores;
    address[] public listaAuditores;

    mapping(string => EmpresaApoiadora) public empresasApoiadoras;
    string[] public listaEmpresasApoiadoras;

    IGreenSeal public greenSeal;

    event PesagemRegistrada(uint256 indexed id, address indexed cooperativa, string material, uint256 pesoKg, string ipfsHash, string empresaId);
    event PesagemValidada(uint256 indexed id, address indexed auditor);
    event PesagemRejeitada(uint256 indexed id, address indexed auditor, string motivo);
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

    // ── Pesagens ────────────────────────────────────────────────────────────

    function registrarPesagem(
        string calldata material,
        uint256 pesoKg,
        string calldata ipfsHash,
        string calldata empresaId,
        string calldata localColeta,
        string calldata dataColeta,
        string calldata observacao
    ) external onlyRole(COOPERATIVA_ROLE) {
        require(pesoKg > 0, "Peso invalido");
        require(bytes(ipfsHash).length > 0, "IPFS hash obrigatorio");

        uint256 id = ++totalPesagens;

        pesagens[id] = Pesagem({
            id: id,
            cooperativa: msg.sender,
            material: material,
            pesoKg: pesoKg,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            status: Status.PENDENTE,
            auditor: address(0),
            empresaId: empresaId,
            localColeta: localColeta,
            dataColeta: dataColeta,
            observacao: observacao
        });

        pesagensPorCooperativa[msg.sender].push(id);

        emit PesagemRegistrada(id, msg.sender, material, pesoKg, ipfsHash, empresaId);
    }

    function validarPesagem(uint256 id) external onlyRole(AUDITOR_ROLE) {
        require(id > 0 && id <= totalPesagens, "Pesagem inexistente");
        Pesagem storage p = pesagens[id];
        require(p.status == Status.PENDENTE, "Status invalido");
        require(p.cooperativa != msg.sender, "Auditor nao pode validar propria pesagem");

        p.status = Status.VALIDADO;
        p.auditor = msg.sender;

        pesagensPorEmpresa[p.empresaId].push(id);
        kgPorEmpresa[p.empresaId] += p.pesoKg;

        if (!empresaRegistrada[p.empresaId]) {
            empresaRegistrada[p.empresaId] = true;
            empresas.push(p.empresaId);
        }
        totalKgValidadoGlobal += p.pesoKg;

        emit PesagemValidada(id, msg.sender);
        _verificarEmissaoSelo(p.empresaId);
    }

    function rejeitarPesagem(uint256 id, string calldata motivo) external onlyRole(AUDITOR_ROLE) {
        require(id > 0 && id <= totalPesagens, "Pesagem inexistente");
        Pesagem storage p = pesagens[id];
        require(p.status == Status.PENDENTE, "Status invalido");

        p.status = Status.REJEITADO;
        p.auditor = msg.sender;

        emit PesagemRejeitada(id, msg.sender, motivo);
    }

    // ── Leitura ─────────────────────────────────────────────────────────────

    function getPesagensPorEmpresa(string calldata empresaId) external view returns (uint256[] memory) {
        return pesagensPorEmpresa[empresaId];
    }

    function getPesagensPorCooperativa(address carteira) external view returns (uint256[] memory) {
        return pesagensPorCooperativa[carteira];
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
        uint256 selosDevidos = kgPorEmpresa[empresaId] / kgParaSelo;
        uint256 selosEmitidos = greenSeal.totalSelosPorEmpresa(empresaId);

        if (selosDevidos > selosEmitidos) {
            greenSeal.emitirSelo(empresaId, kgPorEmpresa[empresaId]);
        }
    }
}
