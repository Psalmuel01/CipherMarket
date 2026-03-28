// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';

/// @title FHESmoke
/// @notice Minimal smoke-test contract for verifying CoFHE encryption, storage, and addition flows.
contract FHESmoke {
  /// @notice Emitted when a new encrypted value is stored.
  /// @param account The caller that submitted the encrypted value.
  /// @param ciphertextHandle The ciphertext handle persisted on-chain.
  event ValueStored(address indexed account, uint256 indexed ciphertextHandle);

  /// @notice Emitted when the stored encrypted value is incremented.
  /// @param account The caller that submitted the encrypted addend.
  /// @param ciphertextHandle The updated ciphertext handle persisted on-chain.
  event ValueAdded(address indexed account, uint256 indexed ciphertextHandle);

  /// @notice The latest encrypted value handle.
  euint128 public storedValue;

  constructor() {
    storedValue = FHE.asEuint128(0);
    FHE.allowThis(storedValue);
  }

  /// @notice Stores a caller-provided encrypted uint128 value.
  /// @param encValue The encrypted uint128 input.
  function store(InEuint128 calldata encValue) external {
    storedValue = FHE.asEuint128(encValue);
    FHE.allowThis(storedValue);
    FHE.allowSender(storedValue);

    emit ValueStored(msg.sender, euint128.unwrap(storedValue));
  }

  /// @notice Adds a caller-provided encrypted uint128 value to the stored ciphertext.
  /// @param encAddend The encrypted uint128 addend.
  function addToStored(InEuint128 calldata encAddend) external {
    storedValue = FHE.add(storedValue, FHE.asEuint128(encAddend));
    FHE.allowThis(storedValue);
    FHE.allowSender(storedValue);

    emit ValueAdded(msg.sender, euint128.unwrap(storedValue));
  }
}
