// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/math/Math.sol';

// HulkToken with Governance.
contract HulkToken is ERC20Burnable, Ownable {
	uint256 public startBlock;
	uint256 public bonusPool = 0 ether;
	uint256 public bigBonusPool = 0 ether;
	uint256 public burnPool = 0 ether;
	uint256 public minSupply = 0 ether;
	// maximum supply to be minted by farming contract
	uint256 public constant maxSupply = 100 ether;
	uint256 public burnRate = 0;
	uint256 public bonusRate = 0;
	uint256 public bigBurnRate = 0;
	uint256 public bigBonusRate = 0;
	uint256 public bigBurnStartBlock = 0;
	uint256 public bigBurnBlocks = 0;

	mapping(address => uint256) public burnSenderWhitelist;
	mapping(address => uint256) public burnReceiverWhitelist;

	bool public burnOn = false;
	bool public bonusOn = false;
	bool public bigBurnOn = false;
	bool public bigBonusOn = false;

	/// @notice Creates `_amount` token to `_to`. Must only be called by the owner (Hulkfarmer).
	function mint(address _to, uint256 _amount) public onlyOwner {
		require(this.totalSupply().add(_amount) <= maxSupply);
		_mint(_to, _amount);
		_moveDelegates(address(0), _delegates[_to], _amount);
	}

	// Copied and modified from YAM code:
	// https://github.com/yam-finance/yam-protocol/blob/master/contracts/token/YAMGovernanceStorage.sol
	// https://github.com/yam-finance/yam-protocol/blob/master/contracts/token/YAMGovernance.sol
	// Which is copied and modified from COMPOUND:
	// https://github.com/compound-finance/compound-protocol/blob/master/contracts/Governance/Comp.sol

	/// @dev A record of each accounts delegate
	mapping(address => address) internal _delegates;

	/// @notice A checkpoint for marking number of votes from a given block
	struct Checkpoint {
		uint32 fromBlock;
		uint256 votes;
	}

	/// @notice A record of votes checkpoints for each account, by index
	mapping(address => mapping(uint32 => Checkpoint)) public checkpoints;

	/// @notice The number of checkpoints for each account
	mapping(address => uint32) public numCheckpoints;

	/// @notice The EIP-712 typehash for the contract's domain
	bytes32 public constant DOMAIN_TYPEHASH = keccak256(
		'EIP712Domain(string name,uint256 chainId,address verifyingContract)'
	);

	/// @notice The EIP-712 typehash for the delegation struct used by the contract
	bytes32 public constant DELEGATION_TYPEHASH = keccak256(
		'Delegation(address delegatee,uint256 nonce,uint256 expiry)'
	);

	/// @notice A record of states for signing / validating signatures
	mapping(address => uint256) public nonces;

	/// @notice An event thats emitted when an account changes its delegate
	event DelegateChanged(
		address indexed delegator,
		address indexed fromDelegate,
		address indexed toDelegate
	);

	/// @notice An event thats emitted when a delegate account's vote balance changes
	event DelegateVotesChanged(
		address indexed delegate,
		uint256 previousBalance,
		uint256 newBalance
	);

	constructor() public ERC20('HULK.finance', 'HULK') {}

	/**
	 * @notice Delegate votes from `msg.sender` to `delegatee`
	 * @param delegator The address to get delegatee for
	 */
	function delegates(address delegator) external view returns (address) {
		return _delegates[delegator];
	}

	/**
	 * @notice Delegate votes from `msg.sender` to `delegatee`
	 * @param delegatee The address to delegate votes to
	 */
	function delegate(address delegatee) external {
		return _delegate(msg.sender, delegatee);
	}

	/**
	 * @notice Delegates votes from signatory to `delegatee`
	 * @param delegatee The address to delegate votes to
	 * @param nonce The contract state required to match the signature
	 * @param expiry The time at which to expire the signature
	 * @param v The recovery byte of the signature
	 * @param r Half of the ECDSA signature pair
	 * @param s Half of the ECDSA signature pair
	 */
	function delegateBySig(
		address delegatee,
		uint256 nonce,
		uint256 expiry,
		uint8 v,
		bytes32 r,
		bytes32 s
	) external {
		bytes32 domainSeparator = keccak256(
			abi.encode(
				DOMAIN_TYPEHASH,
				keccak256(bytes(name())),
				getChainId(),
				address(this)
			)
		);

		bytes32 structHash = keccak256(
			abi.encode(DELEGATION_TYPEHASH, delegatee, nonce, expiry)
		);

		bytes32 digest = keccak256(
			abi.encodePacked('\x19\x01', domainSeparator, structHash)
		);

		address signatory = ecrecover(digest, v, r, s);
		require(signatory != address(0), 'HULK::delegateBySig: invalid signature');
		require(nonce == nonces[signatory]++, 'HULK::delegateBySig: invalid nonce');
		require(now <= expiry, 'HULK::delegateBySig: signature expired');
		return _delegate(signatory, delegatee);
	}

	/**
	 * @notice Gets the current votes balance for `account`
	 * @param account The address to get votes balance
	 * @return The number of current votes for `account`
	 */
	function getCurrentVotes(address account) external view returns (uint256) {
		uint32 nCheckpoints = numCheckpoints[account];
		return nCheckpoints > 0 ? checkpoints[account][nCheckpoints - 1].votes : 0;
	}

	/**
	 * @notice Determine the prior number of votes for an account as of a block number
	 * @dev Block number must be a finalized block or else this function will revert to prevent misinformation.
	 * @param account The address of the account to check
	 * @param blockNumber The block number to get the vote balance at
	 * @return The number of votes the account had as of the given block
	 */
	function getPriorVotes(address account, uint256 blockNumber)
		external
		view
		returns (uint256)
	{
		require(
			blockNumber < block.number,
			'HULK::getPriorVotes: not yet determined'
		);

		uint32 nCheckpoints = numCheckpoints[account];
		if (nCheckpoints == 0) {
			return 0;
		}

		// First check most recent balance
		if (checkpoints[account][nCheckpoints - 1].fromBlock <= blockNumber) {
			return checkpoints[account][nCheckpoints - 1].votes;
		}

		// Next check implicit zero balance
		if (checkpoints[account][0].fromBlock > blockNumber) {
			return 0;
		}

		uint32 lower = 0;
		uint32 upper = nCheckpoints - 1;
		while (upper > lower) {
			uint32 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
			Checkpoint memory cp = checkpoints[account][center];
			if (cp.fromBlock == blockNumber) {
				return cp.votes;
			} else if (cp.fromBlock < blockNumber) {
				lower = center;
			} else {
				upper = center - 1;
			}
		}
		return checkpoints[account][lower].votes;
	}

	function _delegate(address delegator, address delegatee) internal {
		address currentDelegate = _delegates[delegator];
		uint256 delegatorBalance = balanceOf(delegator); // balance of underlying HULKs (not scaled);
		_delegates[delegator] = delegatee;

		emit DelegateChanged(delegator, currentDelegate, delegatee);

		_moveDelegates(currentDelegate, delegatee, delegatorBalance);
	}

	function _moveDelegates(
		address srcRep,
		address dstRep,
		uint256 amount
	) internal {
		if (srcRep != dstRep && amount > 0) {
			if (srcRep != address(0)) {
				// decrease old representative
				uint32 srcRepNum = numCheckpoints[srcRep];
				uint256 srcRepOld = srcRepNum > 0
					? checkpoints[srcRep][srcRepNum - 1].votes
					: 0;
				uint256 srcRepNew = srcRepOld.sub(amount);
				_writeCheckpoint(srcRep, srcRepNum, srcRepOld, srcRepNew);
			}

			if (dstRep != address(0)) {
				// increase new representative
				uint32 dstRepNum = numCheckpoints[dstRep];
				uint256 dstRepOld = dstRepNum > 0
					? checkpoints[dstRep][dstRepNum - 1].votes
					: 0;
				uint256 dstRepNew = dstRepOld.add(amount);
				_writeCheckpoint(dstRep, dstRepNum, dstRepOld, dstRepNew);
			}
		}
	}

	function _writeCheckpoint(
		address delegatee,
		uint32 nCheckpoints,
		uint256 oldVotes,
		uint256 newVotes
	) internal {
		uint32 blockNumber = safe32(
			block.number,
			'HULK::_writeCheckpoint: block number exceeds 32 bits'
		);

		if (
			nCheckpoints > 0 &&
			checkpoints[delegatee][nCheckpoints - 1].fromBlock == blockNumber
		) {
			checkpoints[delegatee][nCheckpoints - 1].votes = newVotes;
		} else {
			checkpoints[delegatee][nCheckpoints] = Checkpoint(blockNumber, newVotes);
			numCheckpoints[delegatee] = nCheckpoints + 1;
		}

		emit DelegateVotesChanged(delegatee, oldVotes, newVotes);
	}

	function safe32(uint256 n, string memory errorMessage)
		internal
		pure
		returns (uint32)
	{
		require(n < 2**32, errorMessage);
		return uint32(n);
	}

	function getChainId() internal pure returns (uint256) {
		uint256 chainId;
		assembly {
			chainId := chainid()
		}
		return chainId;
	}

	function calcRate(
		address sender,
		address recipient,
		uint256 amount
	)
		public
		view
		returns (
			uint256,
			uint256,
			uint256
		)
	{
		if (
			burnReceiverWhitelist[recipient] == 1 ||
			burnSenderWhitelist[recipient] == 1 ||
			sender == this.owner() ||
			recipient == this.owner()
		) {
			return (0, 0, amount);
		}
		if (burnOn == false && bigBurnOn == false) {
			return (0, 0, amount);
		}
		if (this.totalSupply() <= minSupply) {
			return (0, 0, amount);
		}
		uint256 burnAmount = 0;
		uint256 bonusAmount = 0;
		if (
			bigBurnOn == true && (block.number).sub(bigBurnStartBlock) < bigBurnBlocks
		) {
			burnAmount = amount.mul(bigBurnRate).div(10000);
			bonusAmount = amount.mul(bigBonusRate).div(10000);
		} else if (burnOn == true) {
			burnAmount = amount.mul(burnRate).div(10000);
			bonusAmount = amount.mul(bonusRate).div(10000);
		}
		if (this.totalSupply().sub(burnAmount).sub(bonusAmount) < minSupply) {
			burnAmount = 0;
			bonusAmount = -(minSupply.sub(this.totalSupply()));
		}

		return (burnAmount, bonusAmount, amount.sub(burnAmount).sub(bonusAmount));
	}

	function sendBonusMany(address[] memory recs, uint256[] memory amounts)
		public
		onlyOwner
		returns (bool)
	{
		require(recs.length == amounts.length);
		uint256 totalAmount;
		for (uint256 x = 0; x < recs.length; x++) {
			require(recs[x] == address(recs[x]), 'Invalid address');
			totalAmount = totalAmount.add(amounts[x]);
		}
		require(totalAmount <= bonusPool);
		for (uint256 i = 0; i < recs.length; i++) {
			require(bonusPool >= amounts[i]);
			bonusPool = bonusPool.sub(amounts[i]);
			_transfer(address(this), recs[i], amounts[i]);
		}
	}

	function sendBonus(address recipient, uint256 amount)
		public
		onlyOwner
		returns (bool)
	{
		require(recipient == address(recipient), 'Invalid address');
		require(amount <= bonusPool);
		bonusPool = bonusPool.sub(amount);
		_transfer(address(this), recipient, amount);
	}

	function transferFrom(
		address sender,
		address recipient,
		uint256 amount
	) public override returns (bool) {
		(uint256 burnAmount, uint256 bonusAmount, uint256 amountToSend) = calcRate(
			sender,
			recipient,
			amount
		);
		burnPool = burnPool.add(burnAmount);
		_burn(sender, burnAmount);
		bonusPool = bonusPool.add(bonusAmount);
		super.transferFrom(sender, address(this), bonusAmount);
		super.transferFrom(sender, recipient, amountToSend);
		return true;
	}

	function transfer(address recipient, uint256 amount)
		public
		override
		returns (bool)
	{
		(uint256 burnAmount, uint256 bonusAmount, uint256 amountToSend) = calcRate(
			_msgSender(),
			recipient,
			amount
		);
		burnPool = burnPool.add(burnAmount);
		_burn(_msgSender(), burnAmount);
		bonusPool = bonusPool.add(bonusAmount);
		_transfer(_msgSender(), address(this), bonusAmount);
		_transfer(_msgSender(), recipient, amountToSend);
		return true;
	}

	function removeReceiverBurnWhitelist(address toRemove)
		public
		onlyOwner
		returns (bool)
	{
		burnReceiverWhitelist[toRemove] = 0;
		return true;
	}

	function removeSenderBurnWhitelist(address toRemove)
		public
		onlyOwner
		returns (bool)
	{
		burnSenderWhitelist[toRemove] = 0;
		return true;
	}

	function addReceiverBurnWhitelist(address toAdd)
		public
		onlyOwner
		returns (bool)
	{
		burnReceiverWhitelist[toAdd] = 1;
		return true;
	}

	function addSenderBurnWhitelist(address toAdd)
		public
		onlyOwner
		returns (bool)
	{
		burnSenderWhitelist[toAdd] = 1;
		return true;
	}

	function bigBurnStart(
		uint256 newBigBurnBlocks,
		uint256 newBigBurnRate,
		uint256 newBigBonusRate
	) public onlyOwner returns (bool) {
		bigBurnStartBlock = block.number;
		bigBurnBlocks = newBigBurnBlocks;
		bigBurnRate = newBigBurnRate;
		bigBonusRate = newBigBonusRate;
		return true;
	}

	function bigBurnStop() public onlyOwner returns (bool) {
		bigBurnOn = false;
		bigBurnBlocks = 0;
		return true;
	}

	function burnStart(uint256 newBurnRate, uint256 newBonusRate)
		public
		onlyOwner
		returns (bool)
	{
		burnOn = true;
		burnRate = newBurnRate;
		bonusRate = newBonusRate;
		return true;
	}

	function burnStop() public onlyOwner returns (bool) {
		burnOn = false;
		return true;
	}
}
