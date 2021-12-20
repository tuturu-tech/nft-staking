//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "hardhat/console.sol";

contract NFTStake is ERC721Holder, ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public rewardsToken;
    IERC721 public stakingToken;

    uint256 public rewardRate = 100;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 public _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private tokenOwner;

    struct Staker {
        uint256[] tokensStaked;
        mapping(uint256 => uint256) tokenIdToIndex;
    }

    mapping(address => Staker) stakers;

    constructor(address _stakingToken, address _rewardsToken) Ownable() {
        stakingToken = IERC721(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    modifier onlyHuman() {
        require(tx.origin == msg.sender, "NOT HUMAN");
        _;
    }

    function stake(uint256 _tokenId)
        external
        whenNotPaused
        nonReentrant
        onlyHuman
        updateReward(msg.sender)
    {
        _stake(_tokenId);
    }

    function stakeBatch(uint256[] calldata _tokenIds)
        external
        whenNotPaused
        nonReentrant
        onlyHuman
        updateReward(msg.sender)
    {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            _stake(_tokenIds[i]);
        }
    }

    function withdraw(uint256 _tokenId)
        external
        nonReentrant
        onlyHuman
        updateReward(msg.sender)
    {
        require(tokenOwner[_tokenId] == msg.sender, "NOT TOKEN OWNER");
        _withdraw(_tokenId);
    }

    function withdrawBatch(uint256[] calldata _tokenIds)
        external
        nonReentrant
        onlyHuman
        updateReward(msg.sender)
    {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            require(tokenOwner[_tokenIds[i]] == msg.sender, "NOT TOKEN OWNER");
            _withdraw(_tokenIds[i]);
        }
    }

    function withdrawAll()
        external
        nonReentrant
        onlyHuman
        updateReward(msg.sender)
    {
        Staker storage staker = stakers[msg.sender];
        uint256[] memory _tokensStaked = staker.tokensStaked;
        for (uint256 i = 0; i < _tokensStaked.length; i++) {
            _withdraw(staker.tokensStaked[0]);
        }
    }

    function _stake(uint256 _tokenId) internal {
        Staker storage staker = stakers[msg.sender];

        _totalSupply += 1;
        _balances[msg.sender] += 1;

        tokenOwner[_tokenId] = msg.sender;
        staker.tokensStaked.push(_tokenId);
        uint256 index = (staker.tokensStaked.length - 1);
        staker.tokenIdToIndex[_tokenId] = index;

        stakingToken.safeTransferFrom(msg.sender, address(this), _tokenId); //Maybe require the return
        emit Staked(msg.sender, _tokenId);
    }

    function _withdraw(uint256 _tokenId) internal {
        Staker storage staker = stakers[msg.sender];

        _totalSupply -= 1;
        _balances[msg.sender] -= 1;

        uint256 lastIndex = (staker.tokensStaked.length - 1);
        uint256 lastIndexKey = staker.tokensStaked[lastIndex];
        uint256 tokenIdIndex = staker.tokenIdToIndex[_tokenId];

        staker.tokensStaked[tokenIdIndex] = lastIndexKey;
        staker.tokenIdToIndex[lastIndexKey] = tokenIdIndex;

        if (staker.tokensStaked.length > 0) {
            staker.tokensStaked.pop();
            delete staker.tokenIdToIndex[_tokenId];
        }

        delete tokenOwner[_tokenId];

        stakingToken.safeTransferFrom(address(this), msg.sender, _tokenId);

        emit Withdrawn(msg.sender, _tokenId);
    }

    function getReward()
        external
        nonReentrant
        onlyHuman
        updateReward(msg.sender)
    {
        uint256 reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        require(rewardsToken.transfer(msg.sender, reward));

        emit RewardPaid(msg.sender, reward);
    }

    /* ========== VIEW ========== */

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) /
                _totalSupply);
    }

    function earned(address account) public view returns (uint256) {
        return
            ((_balances[account] *
                (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18) +
            rewards[account];
    }

    function checkRewardTokenBalance() public view returns (uint256) {
        return rewardsToken.balanceOf(address(this));
    }

    function getStakerTokens(address _staker)
        public
        view
        returns (uint256[] memory)
    {
        return stakers[_staker].tokensStaked;
    }

    /* ========== RESTRICTED ========== */

    function recoverERC20(address tokenAddress, uint256 tokenAmount)
        external
        onlyOwner
    {
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function updateRewardRate(uint256 _rewardRate) external onlyOwner {
        rewardRate = _rewardRate;
    }

    function withdrawRewardsToken(uint256 tokenAmount) external onlyOwner {
        rewardsToken.safeTransfer(owner(), tokenAmount);
    }

    function setRewardToken(address _rewardsToken) external onlyOwner {
        rewardsToken = IERC20(_rewardsToken);
    }

    function setStakingToken(address _stakingToken) external onlyOwner {
        stakingToken = IERC721(_stakingToken);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /* ========== EVENTS ========== */

    event Staked(address indexed user, uint256 _tokenId);
    event Withdrawn(address indexed user, uint256 _tokenId);
    event RewardPaid(address indexed user, uint256 reward);
    event Recovered(address token, uint256 amount);
}
