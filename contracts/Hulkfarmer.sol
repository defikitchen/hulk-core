// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/utils/EnumerableSet.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './HulkToken.sol';

// Hulkfarmer is the meistress of Token. It can make Token.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once HULK is sufficiently
// distributed and the community can show to govern itself.
//

contract Hulkfarmer is Ownable {
	using SafeMath for uint256;
	using SafeERC20 for IERC20;

	// Info of each user.
	struct UserInfo {
		uint256 amount; // How many LP tokens the user has provided.
		uint256 rewardDebt; // Reward debt. See explanation below.
		//
		// We do some fancy math here. Basically, any point in time, the amount of HULKs
		// entitled to a user but is pending to be distributed is:
		//
		//   pending reward = (user.amount * pool.accPerShare) - user.rewardDebt
		//
		// Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
		//   1. The pool's `accPerShare` (and `lastRewardBlock`) gets updated.
		//   2. User receives the pending reward sent to his/her address.
		//   3. User's `amount` gets updated.
		//   4. User's `rewardDebt` gets updated.
	}

	// Info of each pool.
	struct PoolInfo {
		IERC20 lpToken; // Address of LP token contract.
		uint256 allocPoint; // How many allocation points assigned to this pool. HULKs to distribute per block.
		uint256 lastRewardBlock; // Last block number that HULKs distribution occurs.
		uint256 accPerShare; // Accumulated HULKs per share, times 1e12. See below.
	}

	// The HULK TOKEN!
	HulkToken public token;
	// Dev address.
	address public devaddr;
	// Block number when bonus HULK period ends.
	uint256 public bonusEndBlock;
	// HULK tokens created per block.
	uint256 public tokenPerBlock;
	// farming on/off switch
	bool public farmingOn = false;
	// halving rates array
	uint256[5] halvingRates = [1, 2, 4, 8, 16];
	// Bonus muliplier for early token makers.
	uint256 public BONUS_MULTIPLIER = 0;
	// 12 blocks per second, 86400 seconds per day
	// 86400/12 = 7200 blocks per day
	// 7200 * 5 = 36000 blocks per 5 days ('week')
	uint256 public halvingPeriod = 7200;
	// Info of each pool.
	PoolInfo[] public poolInfo;
	// Info of each user that stakes LP tokens.
	mapping(uint256 => mapping(address => UserInfo)) public userInfo;
	// Total allocation poitns. Must be the sum of all allocation points in all pools.
	uint256 public totalAllocPoint = 0;
	// The block number when HULK mining starts.
	uint256 public farmingStartBlock;
	uint256 public farmingEndBlock;

	event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
	event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
	event EmergencyWithdraw(
		address indexed user,
		uint256 indexed pid,
		uint256 amount
	);

	constructor(HulkToken _token, address _devaddr) public {
		token = _token;
		devaddr = _devaddr;
	}

	function poolLength() external view returns (uint256) {
		return poolInfo.length;
	}

	function getFarmingStartBlock() external view returns (uint256) {
		return farmingStartBlock;
	}

	function getFarmingEndBlock() external view returns (uint256) {
		return farmingEndBlock;
	}

	function getBonusEndBlock() external view returns (uint256) {
		return bonusEndBlock;
	}

	function startFarming(
		uint256 _farmingTotalBlocks,
		uint256 _farmingBonusBlocks,
		uint256 _halvingPeriod,
		uint256 _tokenPerBlock,
		uint256[5] memory _halvingRates,
		uint256 _BONUS_MULTIPLIER
	) public onlyOwner returns (bool) {
		farmingOn = true;
		farmingStartBlock = block.number;
		farmingEndBlock = block.number + _farmingTotalBlocks;
		bonusEndBlock = block.number + _farmingBonusBlocks;
		halvingPeriod = _halvingPeriod;
		tokenPerBlock = _tokenPerBlock;
		halvingRates = _halvingRates;
		BONUS_MULTIPLIER = _BONUS_MULTIPLIER;
		return true;
	}

	function stopFarming() public onlyOwner returns (bool) {
		farmingOn = false;
		farmingStartBlock = 0;
		farmingEndBlock = 0;
		bonusEndBlock = 0;
		halvingPeriod = 1;
		tokenPerBlock = 0;
		BONUS_MULTIPLIER = 0;
	}

	function removeReceiverBurnWhitelist(address toRemove)
		public
		onlyOwner
		returns (bool)
	{
		token.removeReceiverBurnWhitelist(toRemove);
		return true;
	}

	function removeSenderBurnWhitelist(address toRemove)
		public
		onlyOwner
		returns (bool)
	{
		token.removeSenderBurnWhitelist(toRemove);
		return true;
	}

	function addReceiverBurnWhitelist(address toAdd)
		public
		onlyOwner
		returns (bool)
	{
		token.addReceiverBurnWhitelist(toAdd);
		return true;
	}

	function addSenderBurnWhitelist(address toAdd)
		public
		onlyOwner
		returns (bool)
	{
		token.addSenderBurnWhitelist(toAdd);
		return true;
	}

	function bigBurnStart(
		uint256 newBigBurnBlocks,
		uint256 newBigBurnRate,
		uint256 newBigBonusRate
	) public onlyOwner returns (bool) {
		token.bigBurnStart(newBigBurnBlocks, newBigBurnRate, newBigBonusRate);
		return true;
	}

	function bigBurnStop() public onlyOwner returns (bool) {
		token.bigBurnStop();
		return true;
	}

	function burnStart(uint256 newBurnRate, uint256 newBonusRate)
		public
		onlyOwner
		returns (bool)
	{
		token.burnStart(newBurnRate, newBonusRate);
		return true;
	}

	function burnStop() public onlyOwner returns (bool) {
		token.burnStop();
		return true;
	}

	// Add a new lp to the pool. Can only be called by the owner.
	// XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
	function add(
		uint256 _allocPoint,
		IERC20 _lpToken,
		bool _withUpdate
	) public onlyOwner {
		if (_withUpdate) {
			massUpdatePools();
		}
		uint256 lastRewardBlock = block.number;
		// uint256 lastRewardBlock = block.number > farmingStartBlock
		// 	? block.number
		// 	: farmingStartBlock;
		totalAllocPoint = totalAllocPoint.add(_allocPoint);
		poolInfo.push(
			PoolInfo({
				lpToken: _lpToken,
				allocPoint: _allocPoint,
				lastRewardBlock: lastRewardBlock,
				accPerShare: 0
			})
		);
	}

	// Update the given pool's HULK allocation point. Can only be called by the owner.
	function set(
		uint256 _pid,
		uint256 _allocPoint,
		bool _withUpdate
	) public onlyOwner {
		if (_withUpdate) {
			massUpdatePools();
		}
		totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(
			_allocPoint
		);
		poolInfo[_pid].allocPoint = _allocPoint;
	}

	// Return reward multiplier over the given _from to _to block.
	function getMultiplier(uint256 _from, uint256 _to)
		public
		view
		returns (uint256)
	{
		uint256 tokenReward = 0;

		if (_to <= bonusEndBlock) {
			tokenReward = _to.sub(_from).mul(BONUS_MULTIPLIER);
		} else if (_from >= bonusEndBlock) {
			tokenReward = _to.sub(_from);
		} else {
			tokenReward = bonusEndBlock.sub(_from).mul(BONUS_MULTIPLIER).add(
				_to.sub(bonusEndBlock)
			);
		}
		if (_from < farmingStartBlock || _to > farmingEndBlock) {
			return 0;
		}
		// console.log(_from, _to, bonusEndBlock);
		require(tokenReward >= 0, 'reward < 0');
		uint256 diff = (block.number).sub(farmingStartBlock);
		uint256 thisHalvingPeriod;
		if (diff <= halvingPeriod) {
			thisHalvingPeriod = 0;
		} else if (diff <= halvingPeriod.mul(2)) {
			thisHalvingPeriod = 1;
		} else if (diff <= halvingPeriod.mul(3)) {
			thisHalvingPeriod = 2;
		} else if (diff <= halvingPeriod.mul(4)) {
			thisHalvingPeriod = 3;
		} else {
			thisHalvingPeriod = 4;
		}
		uint256 tokenRewardHalved = tokenReward.div(
			halvingRates[thisHalvingPeriod]
		);
		return tokenRewardHalved;
	}

	// View function to see pending HULKs on frontend.
	function pendingReward(uint256 _pid, address _user)
		external
		view
		returns (uint256)
	{
		PoolInfo storage pool = poolInfo[_pid];
		UserInfo storage user = userInfo[_pid][_user];
		uint256 accPerShare = pool.accPerShare;
		uint256 lpSupply = pool.lpToken.balanceOf(address(this));
		if (block.number > pool.lastRewardBlock && lpSupply != 0) {
			uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
			uint256 tokenReward = multiplier
				.mul(tokenPerBlock)
				.mul(pool.allocPoint)
				.div(totalAllocPoint);
			accPerShare = accPerShare.add(tokenReward.mul(1e12).div(lpSupply));
		}
		uint256 pendingRewardAmount = user.amount.mul(accPerShare).div(1e12).sub(
			user.rewardDebt
		);
		return pendingRewardAmount;
	}

	// Update reward variables for all pools. Be careful of gas spending!
	function massUpdatePools() public {
		uint256 length = poolInfo.length;
		for (uint256 pid = 0; pid < length; ++pid) {
			updatePool(pid);
		}
	}

	// Update reward variables of the given pool to be up-to-date.
	function updatePool(uint256 _pid) public {
		PoolInfo storage pool = poolInfo[_pid];
		if (block.number > farmingEndBlock) {
			farmingOn = false;
		}
		if (block.number <= pool.lastRewardBlock) {
			return;
		}
		uint256 lpSupply = pool.lpToken.balanceOf(address(this));
		if (lpSupply == 0) {
			pool.lastRewardBlock = block.number;
			return;
		}
		uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
		uint256 tokenReward = multiplier
			.mul(tokenPerBlock)
			.mul(pool.allocPoint)
			.div(totalAllocPoint);

		if (tokenReward + token.totalSupply() > token.maxSupply()) {
			farmingOn = false;
			// BONUS_MULTIPLIER = 0;
			// tokenPerBlock = 0;
			// pool.accPerShare = 0;
		} else if (farmingOn) {
			token.mint(devaddr, tokenReward.div(20));
			// main minting
			token.mint(address(this), tokenReward);
			pool.accPerShare = pool.accPerShare.add(
				tokenReward.mul(1e12).div(lpSupply)
			);
			pool.lastRewardBlock = block.number;
		}
	}

	function sendBonusMany(address[] memory recs, uint256[] memory amounts)
		public
		onlyOwner
		returns (bool)
	{
		token.sendBonusMany(recs, amounts);
		return true;
	}

	function sendBonus(address recipient, uint256 amount)
		public
		onlyOwner
		returns (bool)
	{
		token.sendBonus(recipient, amount);
		return true;
	}

	// Deposit LP tokens to Hulkfarmer for HULK allocation.
	function deposit(uint256 _pid, uint256 _amount) public {
		PoolInfo storage pool = poolInfo[_pid];
		UserInfo storage user = userInfo[_pid][msg.sender];
		updatePool(_pid);
		if (user.amount > 0) {
			uint256 pending = user.amount.mul(pool.accPerShare).div(1e12).sub(
				user.rewardDebt
			);
			if (pending > 0) {
				safeTokenTransfer(msg.sender, pending);
			}
		}
		if (_amount > 0) {
			pool.lpToken.safeTransferFrom(
				address(msg.sender),
				address(this),
				_amount
			);
			user.amount = user.amount.add(_amount);
		}
		user.rewardDebt = user.amount.mul(pool.accPerShare).div(1e12);
		emit Deposit(msg.sender, _pid, _amount);
	}

	// Withdraw LP tokens from Hulkfarmer.
	function withdraw(uint256 _pid, uint256 _amount) public {
		PoolInfo storage pool = poolInfo[_pid];
		UserInfo storage user = userInfo[_pid][msg.sender];
		require(user.amount >= _amount, 'withdraw: not good');
		updatePool(_pid);
		uint256 pending = user.amount.mul(pool.accPerShare).div(1e12).sub(
			user.rewardDebt
		);
		if (pending > 0) {
			safeTokenTransfer(msg.sender, pending);
		}
		if (_amount > 0) {
			user.amount = user.amount.sub(_amount);
			pool.lpToken.safeTransfer(address(msg.sender), _amount);
		}
		user.rewardDebt = user.amount.mul(pool.accPerShare).div(1e12);
		emit Withdraw(msg.sender, _pid, _amount);
	}

	// Withdraw without caring about rewards. EMERGENCY ONLY.
	function emergencyWithdraw(uint256 _pid) public {
		PoolInfo storage pool = poolInfo[_pid];
		UserInfo storage user = userInfo[_pid][msg.sender];
		pool.lpToken.safeTransfer(address(msg.sender), user.amount);
		emit EmergencyWithdraw(msg.sender, _pid, user.amount);
		user.amount = 0;
		user.rewardDebt = 0;
	}

	// Safe token transfer function, just in case if rounding error causes pool to not have enough HULKs.
	function safeTokenTransfer(address _to, uint256 _amount) internal {
		uint256 tokenBal = token.balanceOf(address(this));
		if (_amount > tokenBal) {
			token.transfer(_to, tokenBal);
		} else {
			token.transfer(_to, _amount);
		}
	}

	function giveOwnership(address newOwner) public onlyOwner {
		token.transferOwnership(newOwner);
	}

	// Update dev address by the previous dev.
	function dev(address _devaddr) public {
		require(msg.sender == devaddr, 'dev: wut?');
		devaddr = _devaddr;
	}
}
