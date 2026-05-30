// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import '@openzeppelin/contracts/access/Ownable.sol';

/// @title OracleRegistry
/// @notice Manages oracle staking, proposal locks, and authorization for the singleton market.
contract OracleRegistry is Ownable {
  struct OracleProfile {
    uint256 stakedAmount;
    bool active;
  }

  event PredictionMarketSet(address indexed predictionMarket);
  event OracleRegistered(address indexed oracle, uint256 stakeAmount);
  event OracleStakeIncreased(address indexed oracle, uint256 addedStake, uint256 totalStake);
  event OracleDeregistered(address indexed oracle, uint256 refundedStake);
  event OracleSlashed(address indexed oracle, address indexed recipient, uint256 amount);
  event OracleLockUpdated(address indexed oracle, uint256 activeLocks);

  uint256 public immutable minimumStake;
  address public predictionMarket;

  mapping(address => OracleProfile) private oracleProfiles;
  mapping(address => uint256) private oracleProposalLocks;

  constructor(uint256 minimumStake_) Ownable(msg.sender) {
    require(minimumStake_ > 0, 'Minimum stake is required');
    minimumStake = minimumStake_;
  }

  modifier onlyPredictionMarketOrOwner() {
    require(
      msg.sender == predictionMarket || msg.sender == owner(),
      'Caller is not authorized to slash'
    );
    _;
  }

  modifier onlyPredictionMarket() {
    require(msg.sender == predictionMarket, 'Caller is not prediction market');
    _;
  }

  function setPredictionMarket(address predictionMarket_) external onlyOwner {
    require(predictionMarket_ != address(0), 'Prediction market is required');
    require(predictionMarket == address(0), 'Prediction market already set');
    predictionMarket = predictionMarket_;

    emit PredictionMarketSet(predictionMarket_);
  }

  function register() external payable {
    OracleProfile storage profile = oracleProfiles[msg.sender];

    require(!profile.active, 'Oracle is already active');
    require(profile.stakedAmount + msg.value >= minimumStake, 'Stake below minimum');

    profile.stakedAmount += msg.value;
    profile.active = true;

    emit OracleRegistered(msg.sender, profile.stakedAmount);
  }

  function increaseStake() external payable {
    OracleProfile storage profile = oracleProfiles[msg.sender];

    require(profile.active, 'Oracle is not active');
    require(msg.value > 0, 'Stake increase is required');

    profile.stakedAmount += msg.value;

    emit OracleStakeIncreased(msg.sender, msg.value, profile.stakedAmount);
  }

  function deregister() external {
    OracleProfile storage profile = oracleProfiles[msg.sender];

    require(profile.active, 'Oracle is not active');
    require(oracleProposalLocks[msg.sender] == 0, 'Oracle has active proposal lock');

    uint256 refundAmount = profile.stakedAmount;
    profile.stakedAmount = 0;
    profile.active = false;

    (bool sent, ) = payable(msg.sender).call{ value: refundAmount }('');
    require(sent, 'Refund transfer failed');

    emit OracleDeregistered(msg.sender, refundAmount);
  }

  function lockOracle(address oracle) external onlyPredictionMarket {
    require(oracleProfiles[oracle].active, 'Oracle is not active');
    oracleProposalLocks[oracle] += 1;
    emit OracleLockUpdated(oracle, oracleProposalLocks[oracle]);
  }

  function unlockOracle(address oracle) external onlyPredictionMarket {
    if (oracleProposalLocks[oracle] == 0) {
      return;
    }

    oracleProposalLocks[oracle] -= 1;
    emit OracleLockUpdated(oracle, oracleProposalLocks[oracle]);
  }

  function slash(
    address oracle,
    uint256 amount,
    address recipient
  ) external onlyPredictionMarketOrOwner returns (uint256 actualSlash) {
    OracleProfile storage profile = oracleProfiles[oracle];

    require(recipient != address(0), 'Recipient is required');

    if (amount == 0 || profile.stakedAmount == 0) {
      return 0;
    }

    actualSlash = amount > profile.stakedAmount ? profile.stakedAmount : amount;
    profile.stakedAmount -= actualSlash;

    if (profile.stakedAmount < minimumStake) {
      profile.active = false;
    }

    (bool sent, ) = payable(recipient).call{ value: actualSlash }('');
    require(sent, 'Slash transfer failed');

    emit OracleSlashed(oracle, recipient, actualSlash);
  }

  function isOracle(address oracle) external view returns (bool) {
    OracleProfile memory profile = oracleProfiles[oracle];
    return profile.active && profile.stakedAmount >= minimumStake;
  }

  function getOracle(address oracle) external view returns (OracleProfile memory) {
    return oracleProfiles[oracle];
  }

  function getOracleStake(address oracle) external view returns (uint256) {
    return oracleProfiles[oracle].stakedAmount;
  }

  function getOracleProposalLocks(address oracle) external view returns (uint256) {
    return oracleProposalLocks[oracle];
  }
}
