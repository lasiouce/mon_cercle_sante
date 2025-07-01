// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CercleToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Cercle Token", "CERC") {
        _mint(msg.sender,initialSupply);
    }
    
}