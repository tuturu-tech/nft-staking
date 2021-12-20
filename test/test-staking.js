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

describe.only("NFT Staking local", function () {
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

  it("Should correctly stake single NFTs", async function () {
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

  it("Should correctly stakeBatch NFTs", async function () {
    let tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    let balance = await mockNFT.balanceOf(owner.address);

    expect(balance.toNumber()).to.equal(4);

    tx = await mockNFT.setApprovalForAll(nftStake.address, true);
    const isApproved = await mockNFT.isApprovedForAll(
      owner.address,
      nftStake.address
    );
    expect(isApproved).to.equal(true);

    let tokenIds = [1, 2, 3, 4];
    tx = await nftStake.stakeBatch(tokenIds);
    tx.wait();

    balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(0);

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(4);
  });

  it("Should correctly withdrawBatch NFTs", async function () {
    let tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    let balance = await mockNFT.balanceOf(owner.address);

    expect(balance.toNumber()).to.equal(4);

    tx = await mockNFT.setApprovalForAll(nftStake.address, true);
    const isApproved = await mockNFT.isApprovedForAll(
      owner.address,
      nftStake.address
    );
    expect(isApproved).to.equal(true);

    let tokenIds = [1, 2, 3, 4];
    tx = await nftStake.stakeBatch(tokenIds);
    tx.wait();

    balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(0);

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(4);

    tx = await nftStake.withdrawBatch(tokenIds);
    tx.wait();

    balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(4);

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(0);
  });

  it("Should correctly withdrawAll NFTs", async function () {
    let tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    let balance = await mockNFT.balanceOf(owner.address);

    expect(balance.toNumber()).to.equal(4);

    tx = await mockNFT.setApprovalForAll(nftStake.address, true);
    const isApproved = await mockNFT.isApprovedForAll(
      owner.address,
      nftStake.address
    );
    expect(isApproved).to.equal(true);

    let tokenIds = [1, 2, 3, 4];
    tx = await nftStake.stakeBatch(tokenIds);
    tx.wait();

    balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(0);

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(4);

    tx = await nftStake.withdrawAll();
    await tx.wait();

    balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(4);

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(0);
  });

  it("Should revert if trying to stake NFT you don't own", async function () {
    let tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.connect(addr1).createCollectible();
    tx.wait();

    tx = await mockNFT.setApprovalForAll(nftStake.address, true);
    const isApproved = await mockNFT.isApprovedForAll(
      owner.address,
      nftStake.address
    );
    expect(isApproved).to.equal(true);

    await expect(nftStake.stake(3)).to.be.revertedWith(
      "ERC721: transfer caller is not owner nor approved"
    );

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(0);
  });

  it("Should revert if trying to withdraw NFT you don't own", async function () {
    let tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.createCollectible();
    tx.wait();

    tx = await mockNFT.connect(addr1).createCollectible();
    tx.wait();

    await mockNFT.setApprovalForAll(nftStake.address, true);
    await mockNFT.connect(addr1).setApprovalForAll(nftStake.address, true);

    tx = await nftStake.stake(1);
    tx.wait();

    tx = await nftStake.connect(addr1).stake(3);
    tx.wait();

    await expect(nftStake.withdraw(3)).to.be.revertedWith("NOT TOKEN OWNER");

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(2);
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

  it("Should not allow staking when the contract is paused", async function () {
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

    tx = await nftStake.pause();
    tx.wait();

    await expect(nftStake.stake(1)).to.be.revertedWith("Pausable: paused");

    tx = await nftStake.unpause();
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

  it("Should divide rewards correctly with multiple stakers", async function () {
    let tx = await mockERC20.transfer(
      nftStake.address,
      ethers.utils.parseEther("100")
    );
    tx.wait();

    let oldBalance = await mockERC20.balanceOf(nftStake.address);
    let oldUserBalance = await mockERC20.balanceOf(owner.address);
    let oldUserBalance2 = await mockERC20.balanceOf(addr1.address);

    tx = await mockNFT.createCollectible();
    tx.wait();
    tx = await mockNFT.createCollectible();
    tx.wait();
    tx = await mockNFT.connect(addr1).createCollectible();
    tx.wait();

    tx = await mockNFT.approve(nftStake.address, 1);
    tx.wait();

    tx = await nftStake.stake(1);
    tx.wait();

    tx = await mockNFT.connect(addr1).approve(nftStake.address, 3);
    tx.wait();

    tx = await nftStake.connect(addr1).stake(3);
    tx.wait();

    jumpToTime(time.future1d);

    tx = await nftStake.getReward();
    let receipt = await tx.wait();
    let result = receipt.events.filter((x) => {
      return x.event == "RewardPaid";
    });
    const amount = result[0].args.reward;

    tx = await nftStake.connect(addr1).getReward();
    receipt = await tx.wait();
    result = receipt.events.filter((x) => {
      return x.event == "RewardPaid";
    });
    const amount2 = result[0].args.reward;

    let supply = await nftStake.totalSupply();

    let totalAmount = amount.add(amount2);

    let expectedBalance = oldBalance.sub(totalAmount);

    balance = await mockERC20.balanceOf(nftStake.address);

    expect(balance).to.equal(expectedBalance);

    balance = await mockERC20.balanceOf(owner.address);
    expectedBalance = oldUserBalance.add(amount);

    expect(balance).to.equal(expectedBalance);

    balance = await mockERC20.balanceOf(addr1.address);
    expectedBalance = oldUserBalance2.add(amount2);

    expect(balance).to.equal(expectedBalance);

    expect(supply).to.equal(2);

    tx = await nftStake.withdraw(1);
    tx.wait();
    balance = await mockNFT.balanceOf(owner.address);

    expect(balance.toNumber()).to.equal(2);

    balance = await mockNFT.balanceOf(nftStake.address);

    expect(balance.toNumber()).to.equal(1);

    supply = await nftStake.totalSupply();

    expect(supply).to.equal(1);
  });

  it("Should allow owner to call recoverERC20 and revert on anyone else", async function () {
    let tx = await mockERC20.transfer(
      nftStake.address,
      ethers.utils.parseEther("100")
    );
    tx.wait();

    let oldBalance = await mockERC20.balanceOf(nftStake.address);

    await expect(nftStake.recoverERC20(mockERC20.address, 100));
    let newBalance = await mockERC20.balanceOf(nftStake.address);
    let expectedBalance = oldBalance.sub(100);

    expect(newBalance).to.equal(expectedBalance);

    await expect(
      nftStake.connect(addr1).recoverERC20(mockERC20.address, 100)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
