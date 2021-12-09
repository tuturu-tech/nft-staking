//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MockERC721 is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    string _baseTokenURI;

    constructor(string memory baseURI) ERC721("Mock NFT", "mNFT") {
        setBaseURI(baseURI);
        _tokenIds.increment(); //token ids start from 1
    }

    function createCollectible() public returns (uint256) {
        uint256 newItemId = _tokenIds.current();
        _safeMint(msg.sender, newItemId);
        setTokenURI(newItemId);
        _tokenIds.increment();
        return newItemId;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }

    function getTokenCount() public view returns (uint256) {
        return _tokenIds.current();
    }

    function setTokenURI(uint256 _tokenId) internal {
        string memory newURI = string(
            abi.encodePacked(_baseTokenURI, _tokenId)
        );
        _setTokenURI(_tokenId, newURI);
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
