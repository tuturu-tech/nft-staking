const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { BigNumber, utils } = require("ethers");

const { centerTime } = require("../scripts/time.js");

const BN = BigNumber.from;

var time = centerTime();

const jumpToTime = async (t) => {
  await network.provider.send("evm_mine", [t.toNumber()]);
  time = centerTime(t);
};

const getLatestBlockTimestamp = async () => {
  let blocknum = await network.provider.request({ method: "eth_blockNumber" });
  let block = await network.provider.request({
    method: "eth_getBlockByNumber",
    params: [blocknum, true],
  });
  return BN(block.timestamp).toString();
};

describe("NFT Staking", function () {
  let mockNFT, mockERC20, nftStake, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const MockNFT = await hre.ethers.getContractFactory("MockERC721");
    mockNFT = await MockNFT.deploy("https://test.com/");

    await mockNFT.deployed();

    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy();

    await mockERC20.deployed();

    const NFTStake = await hre.ethers.getContractFactory("NFTStake");
    nftStake = await NFTStake.deploy(mockNFT.address, mockERC20.address);

    await nftStake.deployed();
  });

  it("Should correctly initialize NFT Staking contract", async function () {
    const rewardsToken = await nftStake.rewardsToken();
    const stakingToken = await nftStake.stakingToken();

    expect(rewardsToken).to.equal(mockERC20.address);
    expect(stakingToken).to.equal(mockNFT.address);

    const contractOwner = await nftStake.owner();
    expect(contractOwner).to.equal(owner.address);
    expect(contractOwner).to.not.equal(addr1.address);
  });

  it("Should correctly create NFTs", async function () {
    let tx = await mockNFT.createCollectible();
    tx.wait();

    let balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(1);

    tx = await mockNFT.createCollectible();
    tx.wait();

    balance = await mockNFT.balanceOf(owner.address);

    expect(balance.toNumber()).to.equal(2);
  });

  it("Should correctly stake NFTs", async function () {
    let tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    let balance = await mockNFT.balanceOf(owner.address);

    expect(balance.toNumber()).to.equal(2);

    tx = await mockNFT.approve(nftStake.address, 1);
    tx.wait();

    const isApproved = await mockNFT.getApproved(1);

    expect(isApproved).to.equal(nftStake.address);

    tx = await nftStake.stake(1);
    tx.wait();

    balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(1);

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(1);
  });

  it("Should correctly fund NFT Staking contract", async function () {
    balance = await mockERC20.balanceOf(owner.address);

    expect(balance).to.equal(ethers.utils.parseEther("1000"));

    let tx = await mockERC20.transfer(
      nftStake.address,
      ethers.utils.parseEther("100")
    );
    tx.wait();

    balance = await mockERC20.balanceOf(owner.address);
    expect(balance).to.equal(ethers.utils.parseEther("900"));

    balance = await mockERC20.balanceOf(nftStake.address);
    expect(balance).to.equal(ethers.utils.parseEther("100"));
  });

  it("Should correctly calculate rewards and allow withdrawal with a single user", async function () {
    let tx = await mockERC20.transfer(
      nftStake.address,
      ethers.utils.parseEther("100")
    );
    tx.wait();

    let oldBalance = await mockERC20.balanceOf(nftStake.address);
    let oldUserBalance = await mockERC20.balanceOf(owner.address);

    tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.approve(nftStake.address, 1);
    tx.wait();

    tx = await nftStake.stake(1);
    tx.wait();
    let timestamp = await getLatestBlockTimestamp();

    jumpToTime(time.future1d);
    let newTimestamp = await getLatestBlockTimestamp();
    tx = nftStake.getReward();

    const amount = BigNumber.from((newTimestamp - timestamp) * 100 + 100);

    let expectedBalance = oldBalance.sub(amount);

    balance = await mockERC20.balanceOf(nftStake.address);

    expect(balance).to.equal(expectedBalance);

    balance = await mockERC20.balanceOf(owner.address);

    expectedBalance = oldUserBalance.add(amount);

    expect(balance).to.equal(expectedBalance);

    let supply = await nftStake.totalSupply();
    expect(supply).to.equal(1);

    tx = await nftStake.withdraw(1);
    tx.wait();

    balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(2);

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(0);

    supply = await nftStake.totalSupply();
    expect(supply).to.equal(0);
  });
});
