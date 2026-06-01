// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Mock do GreenSeal para uso nos testes do RecyclingLedger
contract MockGreenSeal {
    mapping(string => uint256) public totalSelosPorEmpresa;

    event SeloEmitidoMock(string empresaId, uint256 totalKg);

    function emitirSelo(string calldata empresaId, uint256 totalKg) external {
        totalSelosPorEmpresa[empresaId]++;
        emit SeloEmitidoMock(empresaId, totalKg);
    }
}
