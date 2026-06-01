// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title GreenSeal
 * @notice NFT ERC-721 de Impacto Verde emitido automaticamente pelo RecyclingLedger
 */
contract GreenSeal is ERC721URIStorage, Ownable {
    using Strings for uint256;

    // ─── Estado ───────────────────────────────────────────────────────────────
    uint256 public nextTokenId;
    mapping(string => uint256) public totalSelosPorEmpresa;
    mapping(uint256 => string) public seloEmpresa;
    mapping(uint256 => uint256) public seloKg;
    address public ledger;

    // ─── Evento ───────────────────────────────────────────────────────────────
    event SeloEmitido(
        uint256 indexed tokenId,
        string empresaId,
        uint256 totalKg,
        string tokenURI
    );

    // ─── Modifier ─────────────────────────────────────────────────────────────
    modifier onlyLedger() {
        require(msg.sender == ledger, "Apenas o Ledger pode emitir");
        _;
    }

    constructor() ERC721("GreenSeal Impact NFT", "GSEAL") Ownable(msg.sender) {}

    // ─── Funções de administração ─────────────────────────────────────────────

    /**
     * @notice Define o endereço do RecyclingLedger autorizado a emitir selos
     * @param _ledger Endereço do contrato RecyclingLedger
     */
    function setLedger(address _ledger) external onlyOwner {
        ledger = _ledger;
    }

    // ─── Emissão de selos ─────────────────────────────────────────────────────

    /**
     * @notice Emite um novo Selo Verde para uma empresa
     * @param empresaId Identificador da empresa
     * @param totalKg Total de kg reciclados acumulados pela empresa
     */
    function emitirSelo(string calldata empresaId, uint256 totalKg) external onlyLedger {
        uint256 tokenId = ++nextTokenId;

        string memory uri = string.concat(
            "ipfs://greentrack/",
            empresaId,
            "/",
            tokenId.toString()
        );

        _mint(address(this), tokenId);
        _setTokenURI(tokenId, uri);

        totalSelosPorEmpresa[empresaId]++;
        seloEmpresa[tokenId] = empresaId;
        seloKg[tokenId] = totalKg;

        emit SeloEmitido(tokenId, empresaId, totalKg, uri);
    }
}
