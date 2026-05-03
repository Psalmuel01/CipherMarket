// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import '@openzeppelin/contracts/utils/math/Math.sol';

library PredictionMarketMath {
  uint256 private constant PRICE_SCALE = 1e18;

  function quoteBuyFromBalances(
    uint256[] memory balances,
    uint8 outcomeIndex,
    uint256 netCollateral
  ) external pure returns (uint256 sharesOut) {
    uint256 selectedBalance = balances[outcomeIndex];
    uint256 adjustedSelected = selectedBalance;

    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      if (balanceIndex == outcomeIndex) {
        continue;
      }

      adjustedSelected = Math.mulDiv(
        adjustedSelected,
        balances[balanceIndex],
        balances[balanceIndex] + netCollateral
      );
    }

    sharesOut = selectedBalance + netCollateral - adjustedSelected;
  }

  function quoteSellGrossFromBalances(
    uint256[] memory balances,
    uint8 outcomeIndex,
    uint256 sharesIn
  ) external pure returns (uint256) {
    uint256 low = 0;
    uint256 high = balances[0];

    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      if (balanceIndex == outcomeIndex) {
        continue;
      }

      if (balances[balanceIndex] < high) {
        high = balances[balanceIndex];
      }
    }

    while (low < high) {
      uint256 mid = (low + high + 1) / 2;
      if (_sellCandidateSatisfies(balances, outcomeIndex, sharesIn, mid)) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return low;
  }

  function probabilitiesAfterBuy(
    uint256[] memory balances,
    uint8 outcomeIndex,
    uint256 netCollateral,
    uint256 sharesOut
  ) external pure returns (uint256[] memory probabilities) {
    uint256[] memory nextBalances = new uint256[](balances.length);
    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      nextBalances[balanceIndex] = balances[balanceIndex] + netCollateral;
    }
    nextBalances[outcomeIndex] -= sharesOut;

    return getProbabilities(nextBalances);
  }

  function probabilitiesAfterSell(
    uint256[] memory balances,
    uint8 outcomeIndex,
    uint256 sharesIn,
    uint256 grossCollateralOut
  ) external pure returns (uint256[] memory probabilities) {
    uint256[] memory nextBalances = new uint256[](balances.length);
    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      nextBalances[balanceIndex] = balances[balanceIndex] - grossCollateralOut;
    }
    nextBalances[outcomeIndex] += sharesIn;

    return getProbabilities(nextBalances);
  }

  function getProbabilities(
    uint256[] memory balances
  ) public pure returns (uint256[] memory probabilities) {
    probabilities = new uint256[](balances.length);
    uint256 inverseSum = 0;

    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      inverseSum += Math.mulDiv(PRICE_SCALE, PRICE_SCALE, balances[balanceIndex]);
    }

    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      uint256 inverseBalance = Math.mulDiv(PRICE_SCALE, PRICE_SCALE, balances[balanceIndex]);
      probabilities[balanceIndex] = Math.mulDiv(inverseBalance, PRICE_SCALE, inverseSum);
    }
  }

  function _sellCandidateSatisfies(
    uint256[] memory balances,
    uint8 outcomeIndex,
    uint256 sharesIn,
    uint256 collateralOutGross
  ) private pure returns (bool) {
    uint256 selectedBalance = balances[outcomeIndex] + sharesIn - collateralOutGross;
    uint256 ratioValue = selectedBalance;
    uint256 baseSelected = balances[outcomeIndex];

    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      if (balanceIndex == outcomeIndex) {
        continue;
      }

      if (balances[balanceIndex] <= collateralOutGross) {
        return false;
      }

      ratioValue = Math.mulDiv(
        ratioValue,
        balances[balanceIndex] - collateralOutGross,
        balances[balanceIndex]
      );
    }

    return ratioValue >= baseSelected;
  }
}
