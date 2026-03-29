// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

/// @title MockUSDC
/// @notice Test-only ERC20 token with 6 decimals to emulate USDC-style collateral.
contract MockUSDC is ERC20 {
  constructor() ERC20('Mock USD Coin', 'USDC') {
    _mint(msg.sender, 1_000_000_000 * 10 ** 6);
  }

  /// @notice Returns the mocked USDC decimals.
  /// @return The number of decimals.
  function decimals() public pure override returns (uint8) {
    return 6;
  }

  /// @notice Mints tokens for test setup and local development.
  /// @param to The recipient.
  /// @param amount The amount to mint.
  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}
