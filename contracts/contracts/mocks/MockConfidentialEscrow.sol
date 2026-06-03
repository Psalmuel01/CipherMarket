// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

interface IMockConditionResolver {
  function isConditionMet(uint256 escrowId) external view returns (bool);
  function onConditionSet(uint256 escrowId, bytes calldata data) external;
}

contract MockConfidentialEscrow {
  using SafeERC20 for IERC20;

  struct Escrow {
    bool exists;
    bool funded;
    bool redeemed;
    address token;
    address recipient;
    address resolver;
    uint256 amount;
    uint256 paidAmount;
    bytes resolverData;
  }

  mapping(uint256 => Escrow) private escrows;

  function createEscrow(
    uint256 escrowId,
    address token,
    uint256 amount,
    address recipient,
    address resolver,
    bytes calldata resolverData
  ) external {
    require(!escrows[escrowId].exists, 'Escrow exists');
    require(token != address(0), 'Token required');
    require(amount > 0, 'Amount required');
    require(recipient != address(0), 'Recipient required');
    require(resolver != address(0), 'Resolver required');

    IMockConditionResolver(resolver).onConditionSet(escrowId, resolverData);

    escrows[escrowId] = Escrow({
      exists: true,
      funded: false,
      redeemed: false,
      token: token,
      recipient: recipient,
      resolver: resolver,
      amount: amount,
      paidAmount: 0,
      resolverData: resolverData
    });
  }

  function fundEscrow(uint256 escrowId, uint256 amount) external {
    Escrow storage escrow = escrows[escrowId];
    require(escrow.exists, 'Escrow missing');
    require(!escrow.redeemed, 'Escrow redeemed');
    require(amount > 0, 'Amount required');

    IERC20(escrow.token).safeTransferFrom(msg.sender, address(this), amount);
    escrow.paidAmount += amount;
    escrow.funded = escrow.paidAmount >= escrow.amount;
  }

  function exists(uint256 escrowId) external view returns (bool) {
    return escrows[escrowId].exists;
  }

  function getConditionResolver(uint256 escrowId) external view returns (address) {
    return escrows[escrowId].resolver;
  }

  function getResolverData(uint256 escrowId) external view returns (bytes memory) {
    return escrows[escrowId].resolverData;
  }

  function getPaidAmount(uint256 escrowId) external view returns (uint256) {
    return escrows[escrowId].paidAmount;
  }

  function redeem(uint256 escrowId) external {
    Escrow storage escrow = escrows[escrowId];
    require(escrow.exists, 'Escrow missing');
    require(!escrow.redeemed, 'Escrow redeemed');
    require(IMockConditionResolver(escrow.resolver).isConditionMet(escrowId), 'Condition unmet');

    escrow.redeemed = true;
    IERC20(escrow.token).safeTransfer(escrow.recipient, escrow.paidAmount);
  }

  function redeemAndUnwrap(uint256 escrowId, address recipient) external {
    Escrow storage escrow = escrows[escrowId];
    require(escrow.exists, 'Escrow missing');
    require(!escrow.redeemed, 'Escrow redeemed');
    require(recipient != address(0), 'Recipient required');
    require(IMockConditionResolver(escrow.resolver).isConditionMet(escrowId), 'Condition unmet');

    escrow.redeemed = true;
    IERC20(escrow.token).safeTransfer(recipient, escrow.paidAmount);
  }
}
