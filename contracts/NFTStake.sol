//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./Pausable.sol";

contract NFTStake is ERC721Holder, Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public rewardsToken;
    IERC721 public stakingToken;

    uint256 public rewardRate = 100;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private tokenStaker;

    // Might be cheaper to keep in a struct?
    struct Staker {
        uint256[] tokensStaked;
        mapping(uint256 => uint256) tokenIdToIndex;
    }

    mapping(address => Staker) stakers;

    // Is this more expensive than the struct?
    mapping(address => uint256[]) private addressToTokensStaked;
    mapping(address => mapping(uint256 => uint256)) private addressToTokenIndex;

    constructor(address _stakingToken, address _rewardsToken) Ownable() {
        stakingToken = IERC721(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
        _;
    }

    function stake(uint256 _tokenId)
        external
        updateReward(msg.sender)
        notPaused
    {
        _totalSupply += 1;
        _balances[msg.sender] += 1;

        tokenStaker[_tokenId] = msg.sender;
        addressToTokensStaked[msg.sender].push(_tokenId);
        uint256 index = (addressToTokensStaked[msg.sender].length - 1);
        addressToTokenIndex[msg.sender][_tokenId] = index;

        stakingToken.safeTransferFrom(msg.sender, address(this), _tokenId);
        emit Staked(msg.sender, _tokenId);
    }

    function stake2(uint256 _tokenId)
        external
        updateReward(msg.sender)
        notPaused
    {
        Staker storage staker = stakers[msg.sender];

        _totalSupply += 1;
        _balances[msg.sender] += 1;

        tokenStaker[_tokenId] = msg.sender;
        staker.tokensStaked.push(_tokenId);
        uint256 index = (staker.tokensStaked.length - 1);
        staker.tokenIdToIndex[_tokenId] = index;

        stakingToken.safeTransferFrom(msg.sender, address(this), _tokenId);
        emit Staked(msg.sender, _tokenId);
    }

    /*
    function stakeBatch(uint256[] memory _tokenIds)
        external
        updateReward(msg.sender)
        notPaused
    {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            uint256 _tokenId = _tokenIds[i];
            _totalSupply += 1;
            _balances[msg.sender] += 1;
            stakingToken.safeTransferFrom(msg.sender, address(this), _tokenId);
            tokenStaker[_tokenId] = msg.sender;
            addressToTokensStaked[msg.sender].push(_tokenId);
            uint256 index = (addressToTokensStaked[msg.sender].length - 1);
            addressToTokenIndex[msg.sender][_tokenId] = index;
        }
    }
*/
    function withdraw(uint256 _tokenId) external updateReward(msg.sender) {
        require(
            tokenStaker[_tokenId] == msg.sender,
            "Someone else has staked this token "
        );
        _totalSupply -= 1;
        _balances[msg.sender] -= 1;

        uint256 lastIndex = (addressToTokensStaked[msg.sender].length - 1);
        uint256 lastIndexKey = addressToTokensStaked[msg.sender][lastIndex];
        uint256 tokenIdIndex = addressToTokenIndex[msg.sender][_tokenId];

        addressToTokensStaked[msg.sender][tokenIdIndex] = lastIndexKey;
        addressToTokenIndex[msg.sender][lastIndexKey] = tokenIdIndex;

        if (addressToTokensStaked[msg.sender].length > 0) {
            addressToTokensStaked[msg.sender].pop();
            delete addressToTokenIndex[msg.sender][_tokenId];
        }

        delete tokenStaker[_tokenId];

        stakingToken.safeTransferFrom(address(this), msg.sender, _tokenId);

        emit Withdrawn(msg.sender, _tokenId);
    }

    function withdraw2(uint256 _tokenId) external updateReward(msg.sender) {
        require(
            tokenStaker[_tokenId] == msg.sender,
            "Someone else has staked this token "
        );
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

        delete tokenStaker[_tokenId];

        stakingToken.safeTransferFrom(address(this), msg.sender, _tokenId);

        emit Withdrawn(msg.sender, _tokenId);
    }

    /*
    function withdrawBatch(uint256[] memory _tokenIds)
        external
        updateReward(msg.sender)
    {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            require(
                tokenStaker[_tokenIds[i]] == msg.sender,
                "Someone else has staked this token"
            );
            uint256 _tokenId = _tokenIds[i];
            _totalSupply -= 1;
            _balances[msg.sender] -= 1;
            stakingToken.safeTransferFrom(address(this), msg.sender, _tokenId);
        }
    }
*/
    function getReward() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        rewardsToken.transfer(msg.sender, reward);

        emit RewardPaid(msg.sender, reward);
    }

    /* ========== VIEW ========== */

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return 0;
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

    /* ========== RESTRICTED ========== */

    function recoverERC20(address tokenAddress, uint256 tokenAmount)
        external
        onlyOwner
    {
        require(
            tokenAddress != address(stakingToken),
            "Cannot withdraw the staking token"
        );
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /* ========== EVENTS ========== */

    event Staked(address indexed user, uint256 _tokenId);
    event Withdrawn(address indexed user, uint256 _tokenId);
    event RewardPaid(address indexed user, uint256 reward);
    event Recovered(address token, uint256 amount);
}
