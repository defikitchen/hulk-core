// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import './uniswapv2/interfaces/IUniswapV2ERC20.sol';
import './uniswapv2/interfaces/IUniswapV2Pair.sol';
import './uniswapv2/interfaces/IUniswapV2Factory.sol';

contract LunchMaker {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  IUniswapV2Factory public factory;
  address public bar;
  address public lunch;
  address public weth;

  constructor(
    IUniswapV2Factory _factory,
    address _bar,
    address _lunch,
    address _weth
  ) public {
    factory = _factory;
    lunch = _lunch;
    bar = _bar;
    weth = _weth;
  }

  function convert(address token0, address token1) public {
    // At least we try to make front-running harder to do.
    require(msg.sender == tx.origin, 'do not convert from contract');
    IUniswapV2Pair pair = IUniswapV2Pair(factory.getPair(token0, token1));
    pair.transfer(address(pair), pair.balanceOf(address(this)));
    pair.burn(address(this));
    uint256 wethAmount = _toWETH(token0) + _toWETH(token1);
    _toLUNCH(wethAmount);
  }

  function _toWETH(address token) internal returns (uint256) {
    if (token == lunch) {
      uint256 amount = IERC20(token).balanceOf(address(this));
      _safeTransfer(token, bar, amount);
      return 0;
    }
    if (token == weth) {
      uint256 amount = IERC20(token).balanceOf(address(this));
      _safeTransfer(token, factory.getPair(weth, lunch), amount);
      return amount;
    }
    IUniswapV2Pair pair = IUniswapV2Pair(factory.getPair(token, weth));
    if (address(pair) == address(0)) {
      return 0;
    }
    (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
    address token0 = pair.token0();
    (uint256 reserveIn, uint256 reserveOut) = token0 == token
      ? (reserve0, reserve1)
      : (reserve1, reserve0);
    uint256 amountIn = IERC20(token).balanceOf(address(this));
    uint256 amountInWithFee = amountIn.mul(997);
    uint256 numerator = amountInWithFee.mul(reserveOut);
    uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
    uint256 amountOut = numerator / denominator;
    (uint256 amount0Out, uint256 amount1Out) = token0 == token
      ? (uint256(0), amountOut)
      : (amountOut, uint256(0));
    _safeTransfer(token, address(pair), amountIn);
    pair.swap(
      amount0Out,
      amount1Out,
      factory.getPair(weth, lunch),
      new bytes(0)
    );
    return amountOut;
  }

  function _toLUNCH(uint256 amountIn) internal {
    IUniswapV2Pair pair = IUniswapV2Pair(factory.getPair(weth, lunch));
    (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
    address token0 = pair.token0();
    (uint256 reserveIn, uint256 reserveOut) = token0 == weth
      ? (reserve0, reserve1)
      : (reserve1, reserve0);
    uint256 amountInWithFee = amountIn.mul(997);
    uint256 numerator = amountInWithFee.mul(reserveOut);
    uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
    uint256 amountOut = numerator / denominator;
    (uint256 amount0Out, uint256 amount1Out) = token0 == weth
      ? (uint256(0), amountOut)
      : (amountOut, uint256(0));
    pair.swap(amount0Out, amount1Out, bar, new bytes(0));
  }

  function _safeTransfer(
    address token,
    address to,
    uint256 amount
  ) internal {
    IERC20(token).safeTransfer(to, amount);
  }
}
