import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('OracleRegistry', () => {
  async function deployFixture() {
    const [owner, oracle, recipient, stranger] = await ethers.getSigners();
    const registry = await ethers.deployContract('OracleRegistry', [ethers.parseEther('1')]);
    await registry.waitForDeployment();

    return { owner, oracle, recipient, registry, stranger };
  }

  it('registers, increases stake, and deregisters an oracle', async () => {
    const { oracle, registry } = await deployFixture();

    await registry.connect(oracle).register({ value: ethers.parseEther('1') });
    await registry.connect(oracle).increaseStake({ value: ethers.parseEther('0.5') });

    const profile = await registry.getOracle(oracle.address);
    expect(profile.active).to.equal(true);
    expect(profile.stakedAmount).to.equal(ethers.parseEther('1.5'));

    await expect(() => registry.connect(oracle).deregister()).to.changeEtherBalance(
      oracle,
      ethers.parseEther('1.5'),
    );

    const updated = await registry.getOracle(oracle.address);
    expect(updated.active).to.equal(false);
    expect(updated.stakedAmount).to.equal(0n);
  });

  it('allows the owner to slash an oracle stake', async () => {
    const { oracle, recipient, registry } = await deployFixture();

    await registry.connect(oracle).register({ value: ethers.parseEther('2') });

    await expect(() =>
      registry.slash(oracle.address, ethers.parseEther('0.75'), recipient.address),
    ).to.changeEtherBalances(
      [registry, recipient],
      [-ethers.parseEther('0.75'), ethers.parseEther('0.75')],
    );

    const profile = await registry.getOracle(oracle.address);
    expect(profile.stakedAmount).to.equal(ethers.parseEther('1.25'));
    expect(profile.active).to.equal(true);
  });

  it('prevents unauthorized slash calls', async () => {
    const { oracle, recipient, registry, stranger } = await deployFixture();

    await registry.connect(oracle).register({ value: ethers.parseEther('1') });

    await expect(
      registry.connect(stranger).slash(oracle.address, ethers.parseEther('0.1'), recipient.address),
    ).to.be.revertedWith('Caller is not authorized to slash');
  });
});
