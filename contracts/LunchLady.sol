// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/utils/EnumerableSet.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './LunchToken.sol';


interface IMigratorLady {
  // Perform LP token migration from legacy UniswapV2 to LunchSwap.
  // Take the current LP token address and return the new LP token address.
  // Migrator should have full access to the caller's LP token.
  // Return the new LP token address.
  //
  // XXX Migrator must have allowance access to UniswapV2 LP tokens.
  // LunchSwap must mint EXACTLY the same amount of LunchSwap LP tokens or
  // else something bad will happen. Traditional UniswapV2 does not
  // do that so be careful!
  function migrate(IERC20 token) external returns (IERC20);
}

// LunchLady is the meistress of Lunch. She can make Lunch and he is a fair gal.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once LUNCH is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it's bug-free. God bless.


contract LunchLady is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  // Info of each user.
  struct UserInfo {
    uint256 amount; // How many LP tokens the user has provided.
    uint256 rewardDebt; // Reward debt. See explanation below.
    //
    // We do some fancy math here. Basically, any point in time, the amount of LUNCHs
    // entitled to a user but is pending to be distributed is:
    //
    //   pending reward = (user.amount * pool.accLunchPerShare) - user.rewardDebt
    //
    // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
    //   1. The pool's `accLunchPerShare` (and `lastRewardBlock`) gets updated.
    //   2. User receives the pending reward sent to his/her address.
    //   3. User's `amount` gets updated.
    //   4. User's `rewardDebt` gets updated.
  }

  // Info of each pool.
  struct PoolInfo {
    IERC20 lpToken; // Address of LP token contract.
    uint256 allocPoint; // How many allocation points assigned to this pool. LUNCHs to distribute per block.
    uint256 lastRewardBlock; // Last block number that LUNCHs distribution occurs.
    uint256 accLunchPerShare; // Accumulated LUNCHs per share, times 1e12. See below.
  }

  // The LUNCH TOKEN!
  LunchToken public lunch;
  // Dev address.
  address public devaddr;
  // Block number when bonus LUNCH period ends.
  uint256 public bonusEndBlock;
  // LUNCH tokens created per block.
  uint256 public lunchPerBlock;
  // Bonus muliplier for early lunch makers.
  uint256 public constant BONUS_MULTIPLIER = 10;
  // The migrator contract. It has a lot of power. Can only be set through governance (owner).
  IMigratorLady public migrator;

  // Info of each pool.
  PoolInfo[] public poolInfo;
  // Info of each user that stakes LP tokens.
  mapping(uint256 => mapping(address => UserInfo)) public userInfo;
  // Total allocation poitns. Must be the sum of all allocation points in all pools.
  uint256 public totalAllocPoint = 0;
  // The block number when LUNCH mining starts.
  uint256 public startBlock;

  event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
  event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
  event EmergencyWithdraw(  address indexed user, uint256 indexed pid, uint256 amount);

  constructor(
    LunchToken _lunch,
    address _devaddr,
    uint256 _lunchPerBlock,
    uint256 _startBlock,
    uint256 _bonusEndBlock
  ) public {
    lunch = _lunch;
    devaddr = _devaddr;
    lunchPerBlock = _lunchPerBlock;
    bonusEndBlock = _bonusEndBlock;
    startBlock = _startBlock;
  }

  function poolLength() external view returns (uint256) {
    return poolInfo.length;
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
    uint256 lastRewardBlock = block.number > startBlock
      ? block.number
      : startBlock;
    totalAllocPoint = totalAllocPoint.add(_allocPoint);
    poolInfo.push(
      PoolInfo({
        lpToken: _lpToken,
        allocPoint: _allocPoint,
        lastRewardBlock: lastRewardBlock,
        accLunchPerShare: 0
      })
    );
  }

  // added and edited from Statera
  function cut(uint256 value) public view returns (uint256) {
    uint256 burnRate = 187;
    uint256 diff = (block.number).sub(startBlock);
    if (diff < 36000) {
      burnRate = 748;
    } else if (diff < 72000) {
      burnRate = 374;
    }
    uint256 cutValue = value.mul(burnRate).div(10000);

    return cutValue;
  }

  // Update the given pool's LUNCH allocation point. Can only be called by the owner.
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

  // Set the migrator contract. Can only be called by the owner.
  function setMigrator(IMigratorLady _migrator) public onlyOwner {
    migrator = _migrator;
  }

  // Migrate lp token to another lp contract. Can be called by anyone. We trust that migrator contract is good.
  function migrate(uint256 _pid) public {
    require(address(migrator) != address(0), 'migrate: no migrator');
    PoolInfo storage pool = poolInfo[_pid];
    IERC20 lpToken = pool.lpToken;
    uint256 bal = lpToken.balanceOf(address(this));
    lpToken.safeApprove(address(migrator), bal);
    IERC20 newLpToken = migrator.migrate(lpToken);
    require(bal == newLpToken.balanceOf(address(this)), 'migrate: bad');
    pool.lpToken = newLpToken;
  }

  // Return reward multiplier over the given _from to _to block.
  function getMultiplier(uint256 _from, uint256 _to)
    public
    view
    returns (uint256)
  {
    uint256 lunchReward = 0;

    if (_to <= bonusEndBlock) {
      lunchReward = _to.sub(_from).mul(BONUS_MULTIPLIER);
    } else if (_from >= bonusEndBlock) {
      lunchReward = _to.sub(_from);
    } else {
      lunchReward =
        bonusEndBlock.sub(_from).mul(BONUS_MULTIPLIER).add(
          _to.sub(bonusEndBlock)
        );
    }        
    // halves every ~5 days
    // 12 blocks per second, 86400 seconds per day
    // 86400/12 = 7200 blocks per day
    // 7200 * 5 = 36000 blocks per 5 days ('week')
    uint256 halvingRate = 16;
    uint256 diff = (block.number).sub(startBlock);
    if (diff < 36000) {
      halvingRate = 1;
    } else if (diff < 72000) {
      halvingRate = 2;
    } else if (diff < 144000) {
      halvingRate = 4;
    } else if (diff < 288000) {
      halvingRate = 8;
    }
    uint256 lunchRewardHalved = lunchReward.div(halvingRate);
    return lunchRewardHalved;
  }

  // View function to see pending LUNCHs on frontend.
  function pendingLunch(uint256 _pid, address _user)
    external
    view
    returns (uint256)
  {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][_user];
    uint256 accLunchPerShare = pool.accLunchPerShare;
    uint256 lpSupply = pool.lpToken.balanceOf(address(this));
    if (block.number > pool.lastRewardBlock && lpSupply != 0) {
      uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
      uint256 lunchReward = multiplier
        .mul(lunchPerBlock)
        .mul(pool.allocPoint)
        .div(totalAllocPoint);
      accLunchPerShare = accLunchPerShare.add(
        lunchReward.mul(1e12).div(lpSupply)
      );
    }
    return user.amount.mul(accLunchPerShare).div(1e12).sub(user.rewardDebt);
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
    if (block.number <= pool.lastRewardBlock) {
      return;
    }
    uint256 lpSupply = pool.lpToken.balanceOf(address(this));
    if (lpSupply == 0) {
      pool.lastRewardBlock = block.number;
      return;
    }
    uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
    uint256 lunchReward = multiplier
      .mul(lunchPerBlock)
      .mul(pool.allocPoint)
      .div(totalAllocPoint);
    lunch.mint(devaddr, lunchReward.div(10));
    // main minting
    lunch.mint(address(this), lunchReward);
    pool.accLunchPerShare = pool.accLunchPerShare.add(
      lunchReward.mul(1e12).div(lpSupply)
    );
    pool.lastRewardBlock = block.number;
  }

  // Deposit LP tokens to LunchLady for LUNCH allocation.
  function deposit(uint256 _pid, uint256 _amount) public {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][msg.sender];
    updatePool(_pid);
    if (user.amount > 0) {
      uint256 pending = user.amount.mul(pool.accLunchPerShare).div(1e12).sub(
        user.rewardDebt
      );
      if (pending > 0) {
        safeLunchTransfer(msg.sender, pending);
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
    user.rewardDebt = user.amount.mul(pool.accLunchPerShare).div(1e12);
    emit Deposit(msg.sender, _pid, _amount);
  }

  // Withdraw LP tokens from LunchLady.
  function withdraw(uint256 _pid, uint256 _amount) public {
    PoolInfo storage pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][msg.sender];
    require(user.amount >= _amount, 'withdraw: not good');
    updatePool(_pid);
    uint256 pending = user.amount.mul(pool.accLunchPerShare).div(1e12).sub(
      user.rewardDebt
    );
    if (pending > 0) {
      safeLunchTransfer(msg.sender, pending);
    }
    if (_amount > 0) {
      // repurposed from statera
      uint256 burnfeeAmount = cut(_amount);
      uint256 whaleBurn = 0;
      if (user.amount >= pool.lpToken.totalSupply().mul(300).div(10000)) {
        whaleBurn = _amount.mul(748).div(10000);
      }
      uint256 tokensToTransfer = _amount
        .sub(burnfeeAmount)
        .sub(burnfeeAmount)
        .sub(whaleBurn)
        .sub(whaleBurn);

      user.amount = user.amount.sub(_amount);
      // sends LUNCH from liquidity pool back to user
      // for testing only, use original amount
      tokensToTransfer = _amount;
      pool.lpToken.safeTransfer(address(msg.sender), tokensToTransfer);
      // burn tokens
      // lunch.burn(burnfeeAmount);
      // lunch.burn(whaleBurn);
      // TODO sends LUNCH to bonus pool
      // lunch.transfer(address(devaddr), burnfeeAmount);
      // lunch.transfer(address(devaddr), whaleBurn);
    }
    user.rewardDebt = user.amount.mul(pool.accLunchPerShare).div(1e12);
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

  // Safe lunch transfer function, just in case if rounding error causes pool to not have enough LUNCHs.
  function safeLunchTransfer(address _to, uint256 _amount) internal {
    uint256 lunchBal = lunch.balanceOf(address(this));
    if (_amount > lunchBal) {
      lunch.transfer(_to, lunchBal);
    } else {
      lunch.transfer(_to, _amount);
    }
  }

  // Update dev address by the previous dev.
  function dev(address _devaddr) public {
    require(msg.sender == devaddr, 'dev: wut?');
    devaddr = _devaddr;
  }
}
