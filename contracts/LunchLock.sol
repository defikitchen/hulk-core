// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./LunchToken.sol";
import "./LunchLady.sol";

contract LunchLock is ERC20("LunchLockToken", "LunchLock"), Ownable {
    using SafeMath for uint256;
    using Address for address;

    LunchToken public lunch;
    LunchLady public lunchLady;
    address public withDrawAddr;

    constructor(LunchToken _lunch, LunchLady _lunchLady) public {
        require(address(_lunch) != address(0) && address(_lunchLady) != address(0), "invalid address");
        lunch = _lunch;
        lunchLady = _lunchLady;
        _mint(address(this), 1);
    }

    function deposit(uint256 _pid) public onlyOwner {
        _approve(address(this), address(lunchLady), 1);
        lunchLady.deposit(_pid, 1);
    }

    function withdrawFromLunchLady(uint256 _pid) public {
        lunchLady.deposit(_pid, 0);
    }

    function withdrawToContract(uint256 _amount) public onlyOwner {
        require(withDrawAddr != address(0), "invalid address");
        uint256 totalAmount = lunch.balanceOf(address(this));
        require(_amount > 0 && _amount <= totalAmount, "invalid amount");
        lunch.transfer(withDrawAddr, _amount);
    }

    function setwithdrawContractAddr(address _withDrawaddr) public onlyOwner {
        withDrawAddr = _withDrawaddr;
    }
}