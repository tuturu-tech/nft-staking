// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
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
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
