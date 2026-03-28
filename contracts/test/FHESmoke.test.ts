import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { cofhejs, Encryptable } from 'cofhejs/node';

describe('FHESmoke', () => {
  async function deployFixture(): Promise<{
    smoke: Awaited<ReturnType<typeof ethers.deployContract>>;
  }> {
    const [signer] = await ethers.getSigners();
    await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(signer));

    const smoke = await ethers.deployContract('FHESmoke');
    await smoke.waitForDeployment();

    return { smoke };
  }

  it('stores an encrypted uint128 input', async () => {
    const { smoke } = await deployFixture();
    const [encryptedValue] = await hre.cofhe.expectResultSuccess(
      cofhejs.encrypt([Encryptable.uint128(5n)]),
    );

    await smoke.store(encryptedValue);

    const ciphertextHandle = BigInt(await smoke.storedValue());
    await hre.cofhe.mocks.expectPlaintext(ciphertextHandle, 5n);
  });

  it('adds an encrypted uint128 addend to the stored value', async () => {
    const { smoke } = await deployFixture();
    const [initialValue] = await hre.cofhe.expectResultSuccess(
      cofhejs.encrypt([Encryptable.uint128(5n)]),
    );
    const [addend] = await hre.cofhe.expectResultSuccess(
      cofhejs.encrypt([Encryptable.uint128(3n)]),
    );

    await smoke.store(initialValue);
    await smoke.addToStored(addend);

    const ciphertextHandle = BigInt(await smoke.storedValue());
    await hre.cofhe.mocks.expectPlaintext(ciphertextHandle, 8n);
  });

  it('initializes the stored ciphertext to zero', async () => {
    const { smoke } = await deployFixture();
    const ciphertextHandle = BigInt(await smoke.storedValue());

    await hre.cofhe.mocks.expectPlaintext(ciphertextHandle, 0n);
    expect(ciphertextHandle).to.not.equal(0n);
  });
});
