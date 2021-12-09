const hre = require("hardhat");

async function main() {
  [owner, addr1, ...signers] = await ethers.getSigners();

  const MockNFT = await hre.ethers.getContractFactory("MockERC721");
  const mockNFT = await MockNFT.deploy("https://test.com/");

  await mockNFT.deployed();

  console.log("Mock NFT deployed to:", mockNFT.address);

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const mockERC20 = await MockERC20.deploy();

  await mockERC20.deployed();

  console.log("Mock ERC20 deployed to:", mockERC20.address);

  const NFTStake = await hre.ethers.getContractFactory("NFTStake");
  const nftStake = await NFTStake.deploy(mockNFT.address, mockERC20.address);

  await nftStake.deployed();

  console.log("NFT Stake deployed to:", nftStake.address);

  let tx = await mockNFT.createCollectible();
  tx.wait();
  console.log("Minted NFT for", owner.address);

  tx = await mockNFT.createCollectible();
  tx.wait();
  console.log("Minted NFT for", owner.address);

  tx = await mockNFT.connect(addr1).createCollectible();
  tx.wait();
  console.log("Minted NFT for", addr1.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
