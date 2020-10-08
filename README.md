## Introduction ##

Hunk.Finance is a community-governed Decentralized Autonomous Organization with four stages plan that will be implemented within 30 days from project launch. We want to make DAO that will benefit from combination of Decentralized Finance (DeFi) and High Frequency Trading (HFT).

Hunk.Finance project is planned to becreated on ERC20 network — the leading Blockchain platform. At this stage Hunk.Finance is an experimental beta phase and HunkFinance is based on ERC20 token HUNK.

## Install Creationix-NVM. GOOGLE IT AND DO IT!

## Install Global Dependencies
`pip3 install slither-analyzer`
`npm install -g ethlint`

## Install Dependencies
`nvm use`
`yarn`

## Testing
`slither .`
`truffle test`

## Deployed Contracts / Hash

- HulkToken - https://etherscan.io/token/0xdeadbeef
- MrsHulk - https://etherscan.io/address/0xdeadbeef
- (Uni|Hulk)swapV2Factory - https://etherscan.io/address/0xdeadbeef
- (Uni|Hulk)swapV2Router02 - https://etherscan.io/address/0xdeadbeef
- (Uni|Hulk)swapV2Pair init code hash - `deadbeef`
- HulkBeef - https://etherscan.io/address/0xdeadbeef
- BeefKitchen - https://etherscan.io/address/0xdeadbeef

## License

WTFPL

# Fluidity Truffle Box

A truffle box providing us with a more comprehensive setup for our truffle repositories.
Included:
- Circle CI set up
- Migration Utils
- [Solidity Coverage](http://github.com/leapdao/solidity-coverage#master)
- [Eth-gas-reporter](https://github.com/cgewecke/eth-gas-reporter)
- Solhint
- Standard ganache
- Ganache 'unlimited' (unlimited gas and contract size)
- Slither
- Mythril


## To unbox:
- Run `truffle unbox airswap/fluidity-truffle-box`

## Circle CI:
A circle CI configuration file is provided already in the repository. This file is set up to perform:
- `yarn install`
- test migrations
- run all tests and calculate their coverage
- linting (this does not fix linting issues but reports them)
- eth-gas-reporter report on gas usage on contract deploys and tests
- clean up old branches in github

## Migration Utils:
This tool integrates with truffle migrations to enable a more comprehensive tracking of deployed contracts
and their addresses. Utilising `migration_utils.js` enables multiple deployed instances of the same contract
to be tracked easily, which truffle alone does not allow.

## Solidity Coverage
We use a [branch of solidity-coverage written by leapdao](http://github.com/leapdao/solidity-coverage#master),
which enables us to use the newer versions of solidity (0.5.0+).

We have found that solidity-coverage does not work with some versions of node. Our team use node v8.14.0 and
v8.16.0 at this current moment in time.

To run coverage locally, you must run the local coverage network using `yarn ganache-coverage`. In a new
terminal tab then run `yarn coverage` which will run all truffle tests and calculate coverage. To use
truffle with this local blockchain, use `yarn truffle-coverage ___` filling in the command you want to use.

## Solhint
Solhint is a solidity linter. `.solhint.json` contains our standard linting setup, which can be edited/updated.
`.solhintignore` marks any files that the linter should ignore e.g. any files that you havent written yourself.
`yarn lint` will execute solhint on all `.sol` files within the contracts folder.

## Standard Ganache
Ganache can be run on your terminal using the command `yarn ganache`. Using truffle with this can then occur
using `yarn truffle ___` where you merely fill in the commands you would like to use.

## Ganache 'Unlimited'
We have set up what we call 'ganache unlimited' which allows unlimited block size and unlimited contract size
on ganache. To start this version of ganace run `yarn ganache-unlimited` and interact with it using
`yarn truffle-unlimited ___`

## Slither

Prerequisites: for the following instructions to work, you must have:
- python3

From within the root of the directory, run the following commands:

```bash
~ pip3 install virtualenv                   // to install virtualenv
~ virtualenv venv-slither                   // to setup a virtual environment in folder ./venv-slither
~ source venv-slither/bin/activate          // to activate your virtual environment
~ pip3 install -r slither-requirements.txt  // to install the necessary requirements for slither
```

Your local virtual environment is now setup ready to run slither. To run slither on the contracts, how run
the following:
```bash
slither .
```

## Medium Page

For extensive documentation, please visit: https://medium.com/@hulkfinance

### Discord Channel

Join the conversation: discord.gg/qyfg6za
