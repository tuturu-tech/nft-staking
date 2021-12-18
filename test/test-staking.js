const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { BigNumber, utils } = require('ethers');

const { centerTime } = require('../scripts/time.js');

const BN = BigNumber.from;

var time = centerTime();

const jumpToTime = async (t) => {
  await network.provider.send('evm_mine', [t.toNumber()]);
  time = centerTime(t);
};

const getLatestBlockTimestamp = async () => {
  let blocknum = await network.provider.request({ method: 'eth_blockNumber' });
  let block = await network.provider.request({
    method: 'eth_getBlockByNumber',
    params: [blocknum, true],
  });
  return BN(block.timestamp).toString();
};

describe.only('NFT Staking local', function () {
  let mockNFT, mockERC20, nftStake, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const MockNFT = await hre.ethers.getContractFactory('MockERC721');
    mockNFT = await MockNFT.deploy();

    await mockNFT.deployed();

    const MockERC20 = await hre.ethers.getContractFactory('MockERC20');
    mockERC20 = await MockERC20.deploy();

    await mockERC20.deployed();

    const NFTStake = await hre.ethers.getContractFactory('NFTStake');
    nftStake = await NFTStake.deploy(mockNFT.address, mockERC20.address);

    await nftStake.deployed();

    await mockNFT.setApprovalForAll(nftStake.address, true);
    await mockNFT.connect(addr1).setApprovalForAll(nftStake.address, true);
    await mockNFT.connect(addr2).setApprovalForAll(nftStake.address, true);
  });

  it('Should correctly initialize NFT Staking contract', async function () {
    const rewardsToken = await nftStake.rewardsToken();
    const stakingToken = await nftStake.stakingToken();

    expect(rewardsToken).to.equal(mockERC20.address);
    expect(stakingToken).to.equal(mockNFT.address);

    const contractOwner = await nftStake.owner();
    expect(contractOwner).to.equal(owner.address);
    expect(contractOwner).to.not.equal(addr1.address);
  });

  it('Should not allow withdrawing non-owner nfts', async function () {
    await mockNFT.mint();
    await nftStake.stake(0);

    await expect(nftStake.connect(addr1).withdraw(0)).to.be.revertedWith('NOT_CALLERS_TOKEN');
  });

  it('Should not allow withdrawing token twice', async function () {
    await mockNFT.mintBatch(5);
    await mockNFT.connect(addr1).mintBatch(3);

    await nftStake.stake(0);
    await nftStake.stake(1);
    await nftStake.stake(2);

    await nftStake.connect(addr1).stake(5);
    await nftStake.connect(addr1).stake(6);

    // console.log(await nftStake.getStakedTokens(owner.address));
    // console.log(await nftStake.getStakedTokens(addr1.address));

    await nftStake.withdraw(0);
    await nftStake.connect(addr1).withdraw(6);

    // console.log(await nftStake.getStakedTokens(owner.address));
    // console.log(await nftStake.getStakedTokens(addr1.address));

    await expect(nftStake.connect(addr1).withdraw(6)).to.be.revertedWith('NOT_CALLERS_TOKEN');
  });

  it('Should correctly stake NFTs', async function () {
    await mockNFT.mint();
    await mockNFT.mint();

    await nftStake.stake(1);

    balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(1);

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(1);
  });

  it('Should correctly calculate rewards and allow withdrawal with a single user', async function () {
    await mockERC20.transfer(nftStake.address, ethers.utils.parseEther('100'));

    let oldBalance = await mockERC20.balanceOf(nftStake.address);
    let oldUserBalance = await mockERC20.balanceOf(owner.address);

    await mockNFT.mint();
    await mockNFT.mint();

    await nftStake.stake(1);
    let timestamp = await getLatestBlockTimestamp();

    await jumpToTime(time.future1d);
    let newTimestamp = await getLatestBlockTimestamp();
    await nftStake.claimRewards();

    const amount = BigNumber.from((newTimestamp - timestamp) * 100 + 100);

    let expectedBalance = oldBalance.sub(amount);

    balance = await mockERC20.balanceOf(nftStake.address);

    expect(balance).to.equal(expectedBalance);

    balance = await mockERC20.balanceOf(owner.address);

    expectedBalance = oldUserBalance.add(amount);

    expect(balance).to.equal(expectedBalance);

    let supply = await nftStake.totalSupply();
    expect(supply).to.equal(1);

    await nftStake.withdraw(1);

    balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(2);

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(0);

    supply = await nftStake.totalSupply();
    expect(supply).to.equal(0);
  });

  it('Should not allow staking when the contract is paused', async function () {
    await mockERC20.transfer(nftStake.address, ethers.utils.parseEther('100'));

    let oldBalance = await mockERC20.balanceOf(nftStake.address);
    let oldUserBalance = await mockERC20.balanceOf(owner.address);

    await mockNFT.mint();
    await mockNFT.mint();

    await nftStake.setPaused(true);

    await expect(nftStake.stake(1)).to.be.revertedWith('Pausable: paused');

    await nftStake.setPaused(false);

    await nftStake.stake(1);
    let timestamp = await getLatestBlockTimestamp();

    await jumpToTime(time.future1d);
    let newTimestamp = await getLatestBlockTimestamp();
    await nftStake.claimRewards();

    const amount = BigNumber.from((newTimestamp - timestamp) * 100 + 100);

    let expectedBalance = oldBalance.sub(amount);

    balance = await mockERC20.balanceOf(nftStake.address);

    expect(balance).to.equal(expectedBalance);

    balance = await mockERC20.balanceOf(owner.address);

    expectedBalance = oldUserBalance.add(amount);

    expect(balance).to.equal(expectedBalance);

    let supply = await nftStake.totalSupply();
    expect(supply).to.equal(1);

    await nftStake.withdraw(1);

    balance = await mockNFT.balanceOf(owner.address);
    expect(balance.toNumber()).to.equal(2);

    balance = await mockNFT.balanceOf(nftStake.address);
    expect(balance.toNumber()).to.equal(0);

    supply = await nftStake.totalSupply();
    expect(supply).to.equal(0);
  });

  it('Should divide rewards correctly with multiple stakers', async function () {
    await mockERC20.transfer(nftStake.address, ethers.utils.parseEther('100'));

    let oldBalance = await mockERC20.balanceOf(nftStake.address);
    let oldUserBalance = await mockERC20.balanceOf(owner.address);
    let oldUserBalance2 = await mockERC20.balanceOf(addr1.address);

    await mockNFT.mint();
    await mockNFT.mint();
    await mockNFT.connect(addr1).mint();

    await nftStake.stake(1);

    await nftStake.connect(addr1).stake(2);

    await jumpToTime(time.future1d);

    tx = await nftStake.claimRewards();
    let receipt = await tx.wait();
    let result = receipt.events.filter((x) => {
      return x.event == 'RewardPaid';
    });
    const amount = result[0].args.reward;

    tx = await nftStake.connect(addr1).claimRewards();
    receipt = await tx.wait();
    result = receipt.events.filter((x) => {
      return x.event == 'RewardPaid';
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

    await nftStake.withdraw(1);
    balance = await mockNFT.balanceOf(owner.address);

    expect(balance.toNumber()).to.equal(2);

    balance = await mockNFT.balanceOf(nftStake.address);

    expect(balance.toNumber()).to.equal(1);

    supply = await nftStake.totalSupply();

    expect(supply).to.equal(1);
  });

  it('Should allow owner to call recoverERC20 and revert on anyone else', async function () {
    let ownerBalance = await mockERC20.balanceOf(owner.address);

    await mockERC20.transfer(nftStake.address, ethers.utils.parseEther('100'));
    await nftStake.recoverERC20(mockERC20.address);

    expect(await mockERC20.balanceOf(nftStake.address)).to.equal(0);
    expect(await mockERC20.balanceOf(owner.address)).to.equal(ownerBalance);

    await expect(nftStake.connect(addr1).recoverERC20(mockERC20.address)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );
  });
});
