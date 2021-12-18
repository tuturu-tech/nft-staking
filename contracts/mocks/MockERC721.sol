//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MockERC721 is ERC721Enumerable {
    constructor() ERC721("MockNFT", "MOCKNFT") {}

    function mint() public {
        _mint(msg.sender, totalSupply());
    }

    function mintBatch(uint256 amount) public {
        for (uint256 i; i < amount; i++) _mint(msg.sender, totalSupply());
    }
}
