// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

contract HulkBoat is ERC20('HulkBoat', 'HulkYield') {
	using SafeMath for uint256;
	IERC20 public hulk;

	constructor(IERC20 _hulk) public {
		hulk = _hulk;
	}

	// Enter the bar. Pay some HULKs. Earn some shares.
	function enter(uint256 _amount) public {
		uint256 totalHulk = hulk.balanceOf(address(this));
		uint256 totalShares = totalSupply();
		if (totalShares == 0 || totalHulk == 0) {
			_mint(msg.sender, _amount);
		} else {
			uint256 what = _amount.mul(totalShares).div(totalHulk);
			_mint(msg.sender, what);
		}
		hulk.transferFrom(msg.sender, address(this), _amount);
	}

	// Leave the bar. Claim back your HULKs.
	function leave(uint256 _share) public {
		uint256 totalShares = totalSupply();
		uint256 what = _share.mul(hulk.balanceOf(address(this))).div(totalShares);
		_burn(msg.sender, _share);
		hulk.transfer(msg.sender, what);
	}
}
