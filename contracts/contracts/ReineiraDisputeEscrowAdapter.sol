// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165.sol';

interface IReineiraEscrow {
  function exists(uint256 escrowId) external view returns (bool);
  function getConditionResolver(uint256 escrowId) external view returns (address);
  function getResolverData(uint256 escrowId) external view returns (bytes memory);
  function redeem(uint256 escrowId) external;
}

interface IPredictionMarketForReineira {
  struct MarketView {
    uint256 marketId;
    address creator;
    address collateralToken;
    address proposedBy;
    address disputeOpenedBy;
    uint64 createdAt;
    uint64 expiryTime;
    uint64 resolutionWindowEndsAt;
    uint64 escalationDeadline;
    uint128 minimumTrade;
    uint128 seedLiquidity;
    uint128 totalCollateralCollected;
    uint128 disputeStakeTotal;
    uint128 remainingWinningShares;
    uint128 resolutionQuorumStake;
    uint128 committeeRewardPool;
    uint128 totalOracleVoteWeight;
    uint128 accruedProtocolFees;
    uint128 accruedLpFees;
    uint128 protocolDisputeFees;
    uint16 tradeFeeBps;
    uint16 protocolFeeShareBps;
    uint8 outcomeCount;
    uint8 proposedOutcome;
    uint8 disputeCounterOutcome;
    uint8 leadingOutcome;
    uint8 finalOutcome;
    uint8 marketType;
    uint8 state;
    bool lpClaimed;
    bool protocolFeesClaimed;
    bool disputeRefundsEnabled;
    bool disputeOpened;
    bool committeeResolved;
    string title;
    string description;
    string category;
    string oracleSource;
    string[] outcomes;
  }

  function getMarket(uint256 marketId) external view returns (MarketView memory);

  // Note: PredictionMarket contract has the same function signature
  function openDisputeFromAdapter(
    uint256 marketId,
    address disputer,
    uint8 counterOutcomeIndex,
    uint128 stakeAmount
  ) external;

  function settleExternalDispute(uint256 marketId, uint128 amount) external;
}

interface IConditionResolver {
  function isConditionMet(uint256 escrowId) external view returns (bool);
  function onConditionSet(uint256 escrowId, bytes calldata data) external;
}

/// @title ReineiraDisputeEscrowAdapter
/// @notice Keeps dispute-bond custody in Reineira while PredictionMarket remains the canonical
/// market-state and resolution engine.
contract ReineiraDisputeEscrowAdapter is Ownable, ERC165, IConditionResolver {
  using SafeERC20 for IERC20;

  uint8 private constant MARKET_STATE_FINALIZED = 4;

  struct DisputeEscrow {
    bool registered;
    bool settled;
    uint256 marketId;
    address disputer;
    address token;
    uint128 stakeAmount;
    uint8 counterOutcome;
  }

  event EscrowRegistered(
    uint256 indexed marketId,
    uint256 indexed escrowId,
    address indexed disputer,
    uint8 counterOutcome,
    uint256 stakeAmount
  );
  event EscrowSettled(
    uint256 indexed marketId,
    uint256 indexed escrowId,
    address indexed disputer,
    uint256 amount,
    bool refunded
  );

  IReineiraEscrow public immutable reineiraEscrow;
  IPredictionMarketForReineira public immutable predictionMarket;

  mapping(uint256 => DisputeEscrow) public disputeEscrows;
  mapping(uint256 => uint256) public marketEscrowId;

  constructor(address predictionMarket_, address reineiraEscrow_) Ownable(msg.sender) {
    require(predictionMarket_ != address(0), 'Bad market');
    require(reineiraEscrow_ != address(0), 'Bad escrow');

    predictionMarket = IPredictionMarketForReineira(predictionMarket_);
    reineiraEscrow = IReineiraEscrow(reineiraEscrow_);
  }

  function supportsInterface(bytes4 interfaceId) public view override(ERC165) returns (bool) {
    return interfaceId == type(IConditionResolver).interfaceId || super.supportsInterface(interfaceId);
  }

  function encodeResolverData(
    uint256 marketId,
    address disputer,
    uint8 counterOutcome,
    uint128 stakeAmount,
    address token
  ) external pure returns (bytes memory) {
    return abi.encode(marketId, disputer, counterOutcome, stakeAmount, token);
  }

  function onConditionSet(uint256 escrowId, bytes calldata data) external override {
    require(msg.sender == address(reineiraEscrow), 'Only escrow');
    require(disputeEscrows[escrowId].registered == false, 'Registered');

    (
      uint256 marketId,
      address disputer,
      uint8 counterOutcome,
      uint128 stakeAmount,
      address token
    ) = abi.decode(data, (uint256, address, uint8, uint128, address));

    require(disputer != address(0), 'Bad disputer');
    require(token != address(0), 'Bad token');
    require(stakeAmount > 0, 'Bad stake');
    require(marketEscrowId[marketId] == 0, 'Market escrow');

    IPredictionMarketForReineira.MarketView memory market = predictionMarket.getMarket(marketId);
    require(market.collateralToken == token, 'Bad collateral');

    predictionMarket.openDisputeFromAdapter(marketId, disputer, counterOutcome, stakeAmount);

    disputeEscrows[escrowId] = DisputeEscrow({
      registered: true,
      settled: false,
      marketId: marketId,
      disputer: disputer,
      token: token,
      stakeAmount: stakeAmount,
      counterOutcome: counterOutcome
    });
    marketEscrowId[marketId] = escrowId;

    emit EscrowRegistered(marketId, escrowId, disputer, counterOutcome, stakeAmount);
  }

  function isConditionMet(uint256 escrowId) external view override returns (bool) {
    DisputeEscrow memory escrow = disputeEscrows[escrowId];
    if (!escrow.registered || escrow.settled) {
      return false;
    }

    IPredictionMarketForReineira.MarketView memory market = predictionMarket.getMarket(escrow.marketId);
    return market.state == MARKET_STATE_FINALIZED;
  }

  function settleEscrow(uint256 escrowId) external {
    DisputeEscrow storage escrow = disputeEscrows[escrowId];
    require(escrow.registered, 'No dispute');
    require(!escrow.settled, 'Settled');

    IPredictionMarketForReineira.MarketView memory market = predictionMarket.getMarket(escrow.marketId);
    require(market.state == MARKET_STATE_FINALIZED, 'Not final');

    IERC20 token = IERC20(escrow.token);
    uint256 balanceBefore = token.balanceOf(address(this));
    reineiraEscrow.redeem(escrowId);
    uint256 redeemedAmount = token.balanceOf(address(this)) - balanceBefore;
    require(redeemedAmount == escrow.stakeAmount, 'Bad amount');

    escrow.settled = true;
    marketEscrowId[escrow.marketId] = 0;

    if (market.disputeRefundsEnabled) {
      token.safeTransfer(escrow.disputer, redeemedAmount);
      predictionMarket.settleExternalDispute(escrow.marketId, 0);
      emit EscrowSettled(escrow.marketId, escrowId, escrow.disputer, redeemedAmount, true);
      return;
    }

    token.safeTransfer(address(predictionMarket), redeemedAmount);
    predictionMarket.settleExternalDispute(escrow.marketId, uint128(redeemedAmount));
    emit EscrowSettled(escrow.marketId, escrowId, escrow.disputer, redeemedAmount, false);
  }
}
