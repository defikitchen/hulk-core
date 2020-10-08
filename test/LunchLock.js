const {
  expectRevert,
  time
} = require('@openzeppelin/test-helpers');
const LunchLady = artifacts.require('LunchLady');
const LunchToken = artifacts.require('LunchToken');
const LunchLock = artifacts.require('LunchLock');

// contract('LunchLock', ([alice, bob, carol]) => {
//   beforeEach(async () => {
//     this.lunch = await LunchToken.new({
//       from: alice
//     });
//     this.master = await LunchLady.new(this.lunch.address, bob, '1000', '0', {
//       from: alice
//     });
//     this.lunchLock = await LunchLock.new(this.lunch.address, this.master.address, {
//       from: alice
//     });
//   });

//   it('should deposit LunchLock Token success', async () => {
//     const totalSupply = await this.lunchLock.totalSupply();
//     assert.equal(totalSupply.valueOf(), '1');
//     await this.lunch.transferOwnership(this.master.address, {
//       from: alice
//     });
//     await this.master.add('100', this.lunchLock.address, false);
//     await time.advanceBlockTo('8');
//     await this.lunchLock.deposit('0', {
//       from: alice
//     });
//     await time.advanceBlockTo('10');
//     assert.equal((await this.master.pendingLunch(0, this.lunchLock.address)).valueOf(), '1000');
//     await this.lunchLock.withdrawFromLunchLady('0', {
//       from: alice
//     });
//     assert.equal(await this.lunch.balanceOf(this.lunchLock.address).valueOf(), '2000');

//     await this.lunchLock.setwithdrawContractAddr(carol);
//     assert.equal(await this.lunchLock.withDrawAddr().valueOf(), carol);

//     await this.lunchLock.withdrawToContract(50);
//     assert.equal(await this.lunch.balanceOf(this.lunchLock.address).valueOf(), '1950');
//     assert.equal(await this.lunch.balanceOf(carol).valueOf(), '50');
//   });
// })