// COPIED FROM https://github.com/compound-finance/compound-protocol/blob/master/contracts/Governance/GovernorAlpha.sol
// Copyright 2020 Compound Labs, Inc.
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Ctrl+f for XXX to see all the modifications.
// uint96s are changed to uint256s for simplicity and safety.
// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import './LunchToken.sol';

contract GovernorAlpha {
  /// @notice The name of this contract
  // XXX: string public constant name = "Compound Governor Alpha";
  string public constant name = 'Lunch Governor Alpha';

  /// @notice The number of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed
  // XXX: function quorumVotes() public pure returns (uint) { return 400000e18; } // 400,000 = 4% of Comp
  function quorumVotes() public view returns (uint256) {
    return lunch.totalSupply() / 25;
  } // 4% of Supply

  /// @notice The number of votes required in order for a voter to become a proposer
  // function proposalThreshold() public pure returns (uint) { return 100000e18; } // 100,000 = 1% of Comp
  function proposalThreshold() public view returns (uint256) {
    return lunch.totalSupply() / 100;
  } // 1% of Supply

  /// @notice The maximum number of actions that can be included in a proposal
  function proposalMaxOperations() public pure returns (uint256) {
    return 10;
  } // 10 actions

  /// @notice The delay before voting on a proposal may take place, once proposed
  function votingDelay() public pure returns (uint256) {
    return 1;
  } // 1 block

  /// @notice The duration of voting on a proposal, in blocks
  function votingPeriod() public pure returns (uint256) {
    return 17280;
  } // ~3 days in blocks (assuming 15s blocks)

  /// @notice The address of the Compound Protocol Timelock
  TimelockInterface public timelock;

  /// @notice The address of the Compound governance token
  // XXX: CompInterface public comp;
  LunchToken public lunch;

  /// @notice The address of the Governor Guardian
  address public guardian;

  /// @notice The total number of proposals
  uint256 public proposalCount;

  struct Proposal {
    uint256 id;
    address proposer;
    uint256 eta;
    address[] targets;
    uint256[] values;
    string[] signatures;
    bytes[] calldatas;
    uint256 startBlock;
    uint256 endBlock;
    uint256 forVotes;
    uint256 againstVotes;
    bool canceled;
    bool executed;
    mapping(address => Receipt) receipts;
  }

  /// @notice Ballot receipt record for a voter
  struct Receipt {
    bool hasVoted;
    bool support;
    uint256 votes;
  }

  /// @notice Possible states that a proposal may be in
  enum ProposalState {
    Pending,
    Active,
    Canceled,
    Defeated,
    Succeeded,
    Queued,
    Expired,
    Executed
  }

  /// @notice The official record of all proposals ever proposed
  mapping(uint256 => Proposal) public proposals;

  /// @notice The latest proposal for each proposer
  mapping(address => uint256) public latestProposalIds;

  /// @notice The EIP-712 typehash for the contract's domain
  bytes32 public constant DOMAIN_TYPEHASH = keccak256(
    'EIP712Domain(string name,uint256 chainId,address verifyingContract)'
  );

  /// @notice The EIP-712 typehash for the ballot struct used by the contract
  bytes32 public constant BALLOT_TYPEHASH = keccak256(
    'Ballot(uint256 proposalId,bool support)'
  );

  /// @notice An event emitted when a new proposal is created
  event ProposalCreated(
    uint256 id,
    address proposer,
    address[] targets,
    uint256[] values,
    string[] signatures,
    bytes[] calldatas,
    uint256 startBlock,
    uint256 endBlock,
    string description
  );

  /// @notice An event emitted when a vote has been cast on a proposal
  event VoteCast(
    address voter,
    uint256 proposalId,
    bool support,
    uint256 votes
  );

  /// @notice An event emitted when a proposal has been canceled
  event ProposalCanceled(uint256 id);

  /// @notice An event emitted when a proposal has been queued in the Timelock
  event ProposalQueued(uint256 id, uint256 eta);

  /// @notice An event emitted when a proposal has been executed in the Timelock
  event ProposalExecuted(uint256 id);

  constructor(
    address timelock_,
    address lunch_,
    address guardian_
  ) public {
    timelock = TimelockInterface(timelock_);
    lunch = LunchToken(lunch_);
    guardian = guardian_;
  }

  function propose(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    string memory description
  ) public returns (uint256) {
    require(
      lunch.getPriorVotes(msg.sender, sub256(block.number, 1)) >
        proposalThreshold(),
      'GovernorAlpha::propose: proposer votes below proposal threshold'
    );
    require(
      targets.length == values.length &&
        targets.length == signatures.length &&
        targets.length == calldatas.length,
      'GovernorAlpha::propose: proposal function information parity mismatch'
    );
    require(
      targets.length != 0,
      'GovernorAlpha::propose: must provide actions'
    );
    require(
      targets.length <= proposalMaxOperations(),
      'GovernorAlpha::propose: too many actions'
    );

    uint256 latestProposalId = latestProposalIds[msg.sender];
    if (latestProposalId != 0) {
      ProposalState proposersLatestProposalState = state(latestProposalId);
      require(
        proposersLatestProposalState != ProposalState.Active,
        'GovernorAlpha::propose: one live proposal per proposer, found an already active proposal'
      );
      require(
        proposersLatestProposalState != ProposalState.Pending,
        'GovernorAlpha::propose: one live proposal per proposer, found an already pending proposal'
      );
    }

    uint256 startBlock = add256(block.number, votingDelay());
    uint256 endBlock = add256(startBlock, votingPeriod());

    proposalCount++;
    Proposal memory newProposal = Proposal({
      id: proposalCount,
      proposer: msg.sender,
      eta: 0,
      targets: targets,
      values: values,
      signatures: signatures,
      calldatas: calldatas,
      startBlock: startBlock,
      endBlock: endBlock,
      forVotes: 0,
      againstVotes: 0,
      canceled: false,
      executed: false
    });

    proposals[newProposal.id] = newProposal;
    latestProposalIds[newProposal.proposer] = newProposal.id;

    emit ProposalCreated(
      newProposal.id,
      msg.sender,
      targets,
      values,
      signatures,
      calldatas,
      startBlock,
      endBlock,
      description
    );
    return newProposal.id;
  }

  function queue(uint256 proposalId) public {
    require(
      state(proposalId) == ProposalState.Succeeded,
      'GovernorAlpha::queue: proposal can only be queued if it is succeeded'
    );
    Proposal storage proposal = proposals[proposalId];
    uint256 eta = add256(block.timestamp, timelock.delay());
    for (uint256 i = 0; i < proposal.targets.length; i++) {
      _queueOrRevert(
        proposal.targets[i],
        proposal.values[i],
        proposal.signatures[i],
        proposal.calldatas[i],
        eta
      );
    }
    proposal.eta = eta;
    emit ProposalQueued(proposalId, eta);
  }

  function _queueOrRevert(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 eta
  ) internal {
    require(
      !timelock.queuedTransactions(
        keccak256(abi.encode(target, value, signature, data, eta))
      ),
      'GovernorAlpha::_queueOrRevert: proposal action already queued at eta'
    );
    timelock.queueTransaction(target, value, signature, data, eta);
  }

  function execute(uint256 proposalId) public payable {
    require(
      state(proposalId) == ProposalState.Queued,
      'GovernorAlpha::execute: proposal can only be executed if it is queued'
    );
    Proposal storage proposal = proposals[proposalId];
    proposal.executed = true;
    for (uint256 i = 0; i < proposal.targets.length; i++) {
      timelock.executeTransaction.value(proposal.values[i])(
      // timelock.executeTransaction{value: ...}( // ?????
        proposal.targets[i],
        proposal.values[i],
        proposal.signatures[i],
        proposal.calldatas[i],
        proposal.eta
      );
    }
    emit ProposalExecuted(proposalId);
  }

  function cancel(uint256 proposalId) public {
    ProposalState state = state(proposalId);
    require(
      state != ProposalState.Executed,
      'GovernorAlpha::cancel: cannot cancel executed proposal'
    );

    Proposal storage proposal = proposals[proposalId];
    require(
      msg.sender == guardian ||
        lunch.getPriorVotes(proposal.proposer, sub256(block.number, 1)) <
        proposalThreshold(),
      'GovernorAlpha::cancel: proposer above threshold'
    );

    proposal.canceled = true;
    for (uint256 i = 0; i < proposal.targets.length; i++) {
      timelock.cancelTransaction(
        proposal.targets[i],
        proposal.values[i],
        proposal.signatures[i],
        proposal.calldatas[i],
        proposal.eta
      );
    }

    emit ProposalCanceled(proposalId);
  }

  function getActions(uint256 proposalId)
    public
    view
    returns (
      address[] memory targets,
      uint256[] memory values,
      string[] memory signatures,
      bytes[] memory calldatas
    )
  {
    Proposal storage p = proposals[proposalId];
    return (p.targets, p.values, p.signatures, p.calldatas);
  }

  function getReceipt(uint256 proposalId, address voter)
    public
    view
    returns (Receipt memory)
  {
    return proposals[proposalId].receipts[voter];
  }

  function state(uint256 proposalId) public view returns (ProposalState) {
    require(
      proposalCount >= proposalId && proposalId > 0,
      'GovernorAlpha::state: invalid proposal id'
    );
    Proposal storage proposal = proposals[proposalId];
    if (proposal.canceled) {
      return ProposalState.Canceled;
    } else if (block.number <= proposal.startBlock) {
      return ProposalState.Pending;
    } else if (block.number <= proposal.endBlock) {
      return ProposalState.Active;
    } else if (
      proposal.forVotes <= proposal.againstVotes ||
      proposal.forVotes < quorumVotes()
    ) {
      return ProposalState.Defeated;
    } else if (proposal.eta == 0) {
      return ProposalState.Succeeded;
    } else if (proposal.executed) {
      return ProposalState.Executed;
    } else if (
      block.timestamp >= add256(proposal.eta, timelock.GRACE_PERIOD())
    ) {
      return ProposalState.Expired;
    } else {
      return ProposalState.Queued;
    }
  }

  function castVote(uint256 proposalId, bool support) public {
    return _castVote(msg.sender, proposalId, support);
  }

  function castVoteBySig(
    uint256 proposalId,
    bool support,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public {
    bytes32 domainSeparator = keccak256(
      abi.encode(
        DOMAIN_TYPEHASH,
        keccak256(bytes(name)),
        getChainId(),
        address(this)
      )
    );
    bytes32 structHash = keccak256(
      abi.encode(BALLOT_TYPEHASH, proposalId, support)
    );
    bytes32 digest = keccak256(
      abi.encodePacked('\x19\x01', domainSeparator, structHash)
    );
    address signatory = ecrecover(digest, v, r, s);
    require(
      signatory != address(0),
      'GovernorAlpha::castVoteBySig: invalid signature'
    );
    return _castVote(signatory, proposalId, support);
  }

  function _castVote(
    address voter,
    uint256 proposalId,
    bool support
  ) internal {
    require(
      state(proposalId) == ProposalState.Active,
      'GovernorAlpha::_castVote: voting is closed'
    );
    Proposal storage proposal = proposals[proposalId];
    Receipt storage receipt = proposal.receipts[voter];
    require(
      receipt.hasVoted == false,
      'GovernorAlpha::_castVote: voter already voted'
    );
    uint256 votes = lunch.getPriorVotes(voter, proposal.startBlock);

    if (support) {
      proposal.forVotes = add256(proposal.forVotes, votes);
    } else {
      proposal.againstVotes = add256(proposal.againstVotes, votes);
    }

    receipt.hasVoted = true;
    receipt.support = support;
    receipt.votes = votes;

    emit VoteCast(voter, proposalId, support, votes);
  }

  function __acceptAdmin() public {
    require(
      msg.sender == guardian,
      'GovernorAlpha::__acceptAdmin: sender must be gov guardian'
    );
    timelock.acceptAdmin();
  }

  function __abdicate() public {
    require(
      msg.sender == guardian,
      'GovernorAlpha::__abdicate: sender must be gov guardian'
    );
    guardian = address(0);
  }

  function __queueSetTimelockPendingAdmin(address newPendingAdmin, uint256 eta)
    public
  {
    require(
      msg.sender == guardian,
      'GovernorAlpha::__queueSetTimelockPendingAdmin: sender must be gov guardian'
    );
    timelock.queueTransaction(
      address(timelock),
      0,
      'setPendingAdmin(address)',
      abi.encode(newPendingAdmin),
      eta
    );
  }

  function __executeSetTimelockPendingAdmin(
    address newPendingAdmin,
    uint256 eta
  ) public {
    require(
      msg.sender == guardian,
      'GovernorAlpha::__executeSetTimelockPendingAdmin: sender must be gov guardian'
    );
    timelock.executeTransaction(
      address(timelock),
      0,
      'setPendingAdmin(address)',
      abi.encode(newPendingAdmin),
      eta
    );
  }

  function add256(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, 'addition overflow');
    return c;
  }

  function sub256(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a, 'subtraction underflow');
    return a - b;
  }

  function getChainId() internal pure returns (uint256) {
    uint256 chainId;
    assembly {
      chainId := chainid()
    }
    return chainId;
  }
}

interface TimelockInterface {
  function delay() external view returns (uint256);

  function GRACE_PERIOD() external view returns (uint256);

  function acceptAdmin() external;

  function queuedTransactions(bytes32 hash) external view returns (bool);

  function queueTransaction(
    address target,
    uint256 value,
    string calldata signature,
    bytes calldata data,
    uint256 eta
  ) external returns (bytes32);

  function cancelTransaction(
    address target,
    uint256 value,
    string calldata signature,
    bytes calldata data,
    uint256 eta
  ) external;

  function executeTransaction(
    address target,
    uint256 value,
    string calldata signature,
    bytes calldata data,
    uint256 eta
  ) external payable returns (bytes memory);
}
