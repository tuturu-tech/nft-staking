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

    uint256 public totalSupply;
    mapping(address => uint256) public balances;
    mapping(uint256 => address) private _tokenIdToStaker;
    mapping(uint256 => uint256) private _tokenIdToIndex;
    mapping(address => uint256[]) private _stakedTokens;

    constructor(address _stakingToken, address _rewardsToken) {
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

    function stake(uint256 _tokenId)
        external
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        uint256[] storage senderTokenIds = _stakedTokens[msg.sender];

        _tokenIdToIndex[_tokenId] = senderTokenIds.length;
        _tokenIdToStaker[_tokenId] = msg.sender;

        senderTokenIds.push(_tokenId);

        balances[msg.sender]++;
        totalSupply++;

        stakingToken.transferFrom(msg.sender, address(this), _tokenId);

        emit Staked(msg.sender, _tokenId);
    }

    function withdraw(uint256 _tokenId)
        external
        nonReentrant
        updateReward(msg.sender)
    {
        require(_tokenIdToStaker[_tokenId] == msg.sender, "NOT_CALLERS_TOKEN");

        uint256[] storage senderTokenIds = _stakedTokens[msg.sender];

        // get index of token id to be removed
        uint256 removeTokenIndex = _tokenIdToIndex[_tokenId];
        // get id of last token in senderTokenIds array that will replace removed token
        uint256 lastTokenId = senderTokenIds[senderTokenIds.length - 1];

        // replace token to be removed with last token
        senderTokenIds[removeTokenIndex] = lastTokenId;
        // update pointer in _tokenIdToIndex to index of token to be removed
        _tokenIdToIndex[lastTokenId] = removeTokenIndex;

        // remove (now duplicate) last token id
        senderTokenIds.pop();
        delete _tokenIdToIndex[_tokenId];
        delete _tokenIdToStaker[_tokenId];

        totalSupply--;
        balances[msg.sender]--;

        stakingToken.transferFrom(address(this), msg.sender, _tokenId);

        emit Withdrawn(msg.sender, _tokenId);
    }

    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        rewards[msg.sender] = 0;

        require(rewardsToken.transfer(msg.sender, reward));

        emit RewardPaid(msg.sender, reward);
    }

    /* ========== VIEW ========== */

    function getStakedTokens(address user)
        external
        view
        returns (uint256[] memory)
    {
        return _stakedTokens[user];
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored;
        return
            rewardPerTokenStored +
            ((block.timestamp - lastUpdateTime) * rewardRate * 1e18) /
            totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return
            rewards[account] +
            (balances[account] *
                (rewardPerToken() - userRewardPerTokenPaid[account])) /
            1e18;
    }

    function checkRewardTokenBalance() public view returns (uint256) {
        return rewardsToken.balanceOf(address(this));
    }

    /* ========== RESTRICTED ========== */

    function recoverERC20(IERC20 token) external onlyOwner {
        token.safeTransfer(owner(), token.balanceOf(address(this)));
    }

    function updateRewardRate(uint256 _rewardRate) external onlyOwner {
        rewardRate = _rewardRate;
    }

    function withdrawRewardsToken(uint256 tokenAmount) external onlyOwner {
        rewardsToken.safeTransfer(owner(), tokenAmount);
    }

    function setRewardToken(IERC20 _rewardsToken) external onlyOwner {
        rewardsToken = _rewardsToken;
    }

    function setPaused(bool _paused) external onlyOwner {
        if (_paused) _pause();
        else _unpause();
    }

    /* ========== EVENTS ========== */

    event Staked(address indexed user, uint256 _tokenId);
    event Withdrawn(address indexed user, uint256 _tokenId);
    event RewardPaid(address indexed user, uint256 reward);
}
