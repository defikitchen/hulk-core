// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';

contract LunchBar is ERC20('LunchBar', 'xLUNCH') {
  using SafeMath for uint256;
  IERC20 public lunch;

  constructor(IERC20 _lunch) public {
    lunch = _lunch;
  }

  // Enter the bar. Pay some LUNCHs. Earn some shares.
  function enter(uint256 _amount) public {
    uint256 totalLunch = lunch.balanceOf(address(this));
    uint256 totalShares = totalSupply();
    if (totalShares == 0 || totalLunch == 0) {
      _mint(msg.sender, _amount);
    } else {
      uint256 what = _amount.mul(totalShares).div(totalLunch);
      _mint(msg.sender, what);
    }
    lunch.transferFrom(msg.sender, address(this), _amount);
  }

  // Leave the bar. Claim back your LUNCHs.
  function leave(uint256 _share) public {
    uint256 totalShares = totalSupply();
    uint256 what = _share.mul(lunch.balanceOf(address(this))).div(totalShares);
    _burn(msg.sender, _share);
    lunch.transfer(msg.sender, what);
  }
}
