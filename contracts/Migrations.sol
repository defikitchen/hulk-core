// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;
contract Migrations {
  address public owner;
  uint256 public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  constructor() public {
    owner = msg.sender;
  }

  function setCompleted(uint256 completed) public restricted {
    last_completed_migration = completed;
  }
}
