// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract GreenSeal is ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 public nextTokenId;
    mapping(string => uint256) public totalSelosPorEmpresa;
    mapping(string => uint256[]) private _selosPorEmpresa;
    mapping(uint256 => string) public seloEmpresa;
    mapping(uint256 => uint256) public seloKg;
    address public ledger;

    event SeloEmitido(uint256 indexed tokenId, string empresaId, uint256 totalKg, string tokenURI);

    modifier onlyLedger() {
        require(msg.sender == ledger, "Apenas o Ledger pode emitir");
        _;
    }

    constructor() ERC721("GreenSeal Impact NFT", "GSEAL") Ownable(msg.sender) {}

    function setLedger(address _ledger) external onlyOwner {
        ledger = _ledger;
    }

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
        _selosPorEmpresa[empresaId].push(tokenId);
        seloEmpresa[tokenId] = empresaId;
        seloKg[tokenId] = totalKg;

        emit SeloEmitido(tokenId, empresaId, totalKg, uri);
    }

    function getSelosPorEmpresa(string calldata empresaId) external view returns (uint256[] memory) {
        return _selosPorEmpresa[empresaId];
    }
}
