// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

// ─── Interface para o GreenSeal ───────────────────────────────────────────────
interface IGreenSeal {
    function emitirSelo(string calldata empresaId, uint256 totalKg) external;
    function totalSelosPorEmpresa(string calldata empresaId) external view returns (uint256);
}

/**
 * @title RecyclingLedger
 * @notice Registro e validação de pesagens de materiais recicláveis com emissão automática de Selos Verdes
 */
contract RecyclingLedger is AccessControl {
    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant COOPERATIVA_ROLE = keccak256("COOPERATIVA_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // ─── Enums e Structs ──────────────────────────────────────────────────────
    enum Status { PENDENTE, VALIDADO, REJEITADO }

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
    }

    // ─── Estado ───────────────────────────────────────────────────────────────
    uint256 public totalPesagens;
    uint256 public totalKgValidadoGlobal;
    mapping(uint256 => Pesagem) public pesagens;
    mapping(string => uint256[]) public pesagensPorEmpresa;
    mapping(string => uint256) public kgPorEmpresa;
    string[] private empresas;
    mapping(string => bool) private empresaRegistrada;
    IGreenSeal public greenSeal;
    uint256 public constant KG_PARA_SELO = 1000;

    // ─── Eventos ──────────────────────────────────────────────────────────────
    event PesagemRegistrada(
        uint256 indexed id,
        address indexed cooperativa,
        string material,
        uint256 pesoKg,
        string ipfsHash,
        string empresaId
    );
    event PesagemValidada(uint256 indexed id, address indexed auditor);
    event PesagemRejeitada(uint256 indexed id, address indexed auditor, string motivo);

    /**
     * @notice Inicializa o contrato com o endereço do GreenSeal e concede DEFAULT_ADMIN_ROLE ao deployer
     * @param _greenSeal Endereço do contrato GreenSeal
     */
    constructor(address _greenSeal) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        greenSeal = IGreenSeal(_greenSeal);
    }

    // ─── Funções de escrita ───────────────────────────────────────────────────

    /**
     * @notice Registra uma nova pesagem de material reciclável
     * @param material Tipo de material (ex: PET, Alumínio)
     * @param pesoKg Peso em quilogramas (deve ser > 0)
     * @param ipfsHash Hash IPFS dos arquivos de evidência
     * @param empresaId Identificador da empresa geradora
     */
    function registrarPesagem(
        string calldata material,
        uint256 pesoKg,
        string calldata ipfsHash,
        string calldata empresaId
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
            empresaId: empresaId
        });

        emit PesagemRegistrada(id, msg.sender, material, pesoKg, ipfsHash, empresaId);
    }

    /**
     * @notice Valida uma pesagem pendente e acumula os kg da empresa
     * @param id ID da pesagem a ser validada
     */
    function validarPesagem(uint256 id) external onlyRole(AUDITOR_ROLE) {
        require(id > 0 && id <= totalPesagens, "Pesagem inexistente");
        Pesagem storage p = pesagens[id];
        require(p.status == Status.PENDENTE, "Status invalido");

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

    /**
     * @notice Rejeita uma pesagem pendente com um motivo
     * @param id ID da pesagem a ser rejeitada
     * @param motivo Justificativa da rejeição
     */
    function rejeitarPesagem(uint256 id, string calldata motivo) external onlyRole(AUDITOR_ROLE) {
        require(id > 0 && id <= totalPesagens, "Pesagem inexistente");
        Pesagem storage p = pesagens[id];
        require(p.status == Status.PENDENTE, "Status invalido");

        p.status = Status.REJEITADO;
        p.auditor = msg.sender;

        emit PesagemRejeitada(id, msg.sender, motivo);
    }

    // ─── Funções de leitura ───────────────────────────────────────────────────

    /**
     * @notice Retorna os IDs de pesagens validadas de uma empresa
     * @param empresaId Identificador da empresa
     * @return Array de IDs de pesagens validadas
     */
    function getPesagensPorEmpresa(string calldata empresaId) external view returns (uint256[] memory) {
        return pesagensPorEmpresa[empresaId];
    }

    /**
     * @notice Retorna a lista de IDs de empresas que tiveram pesagens validadas
     * @return Array de empresaId registradas
     */
    function getEmpresas() external view returns (string[] memory) {
        return empresas;
    }

    // ─── Função interna ───────────────────────────────────────────────────────

    /// @dev Verifica se novos selos devem ser emitidos com base nos kg acumulados
    function _verificarEmissaoSelo(string memory empresaId) internal {
        uint256 selosDevidos = kgPorEmpresa[empresaId] / KG_PARA_SELO;
        uint256 selosEmitidos = greenSeal.totalSelosPorEmpresa(empresaId);

        if (selosDevidos > selosEmitidos) {
            greenSeal.emitirSelo(empresaId, kgPorEmpresa[empresaId]);
        }
    }
}
