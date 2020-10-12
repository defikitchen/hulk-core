// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './HulkToken.sol';
import './Hulkfarmer.sol';

contract HulkLock is ERC20('HulkLockToken', 'HulkLock'), Ownable {
	using SafeMath for uint256;
	using Address for address;

	HulkToken public hulk;
	Hulkfarmer public hulkfarmer;
	address public withDrawAddr;

	constructor(HulkToken _hulk, Hulkfarmer _Hulkfarmer) public {
		require(
			address(_hulk) != address(0) && address(_Hulkfarmer) != address(0),
			'invalid address'
		);
		hulk = _hulk;
		hulkfarmer = _Hulkfarmer;
		_mint(address(this), 1);
	}

	function deposit(uint256 _pid) public onlyOwner {
		_approve(address(this), address(hulkfarmer), 1);
		hulkfarmer.deposit(_pid, 1);
	}

	function withdrawFromHulkfarmer(uint256 _pid) public {
		hulkfarmer.deposit(_pid, 0);
	}

	function withdrawToContract(uint256 _amount) public onlyOwner {
		require(withDrawAddr != address(0), 'invalid address');
		uint256 totalAmount = hulk.balanceOf(address(this));
		require(_amount > 0 && _amount <= totalAmount, 'invalid amount');
		hulk.transfer(withDrawAddr, _amount);
	}

	function setwithdrawContractAddr(address _withDrawaddr) public onlyOwner {
		withDrawAddr = _withDrawaddr;
	}
}
