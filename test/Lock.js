const {
  expectRevert,
  time
} = require('@openzeppelin/test-helpers');
const Hulkfarmer = artifacts.require('Hulkfarmer');
const HulkToken = artifacts.require('HulkToken');
const HulkLock = artifacts.require('HulkLock');

// contract('HulkLock', ([alice, bob, carol]) => {
//   beforeEach(async () => {
//     this.hulk = await HulkToken.new({
//       from: alice
//     });
//     this.master = await Hulkfarmer.new(this.hulk.address, bob, '1000', '0', {
//       from: alice
//     });
//     this.hulkLock = await HulkLock.new(this.hulk.address, this.master.address, {
//       from: alice
//     });
//   });

//   it('should deposit HulkLock Token success', async () => {
//     const totalSupply = await this.hulkLock.totalSupply();
//     assert.equal(totalSupply.valueOf(), '1');
//     await this.hulk.transferOwnership(this.master.address, {
//       from: alice
//     });
//     await this.master.add('100', this.hulkLock.address, false);
//     await time.advanceBlockTo('8');
//     await this.hulkLock.deposit('0', {
//       from: alice
//     });
//     await time.advanceBlockTo('10');
//     assert.equal((await this.master.pendingHulk(0, this.hulkLock.address)).valueOf(), '1000');
//     await this.hulkLock.withdrawFromHulkfarmer('0', {
//       from: alice
//     });
//     assert.equal(await this.hulk.balanceOf(this.hulkLock.address).valueOf(), '2000');

//     await this.hulkLock.setwithdrawContractAddr(carol);
//     assert.equal(await this.hulkLock.withDrawAddr().valueOf(), carol);

//     await this.hulkLock.withdrawToContract(50);
//     assert.equal(await this.hulk.balanceOf(this.hulkLock.address).valueOf(), '1950');
//     assert.equal(await this.hulk.balanceOf(carol).valueOf(), '50');
//   });
// })