# Wave 3C Validation Checklist

This validation checklist supports the integration plan in [docs/wave-3c-spec.md](/Users/sam/Desktop/Fhenix/CipherMarket/docs/wave-3c-spec.md) and the sequence in [docs/roadmap.md](/Users/sam/Desktop/Fhenix/CipherMarket/docs/roadmap.md).

## Purpose

Validate that CipherMarket can move dispute bond custody out of `PredictionMarket` and into Privara-backed escrow on Arbitrum Sepolia without weakening the current dispute flow.

Wave 3C is validation-first. Full contract integration should only begin after the escrow assumptions are proven.

## Inputs Required

- Arbitrum Sepolia RPC access
- deployed `PredictionMarket` address
- deployed `OracleRegistry` address
- Arbitrum Sepolia USDC address
- Privara / Reineira SDK installation
- any Privara credentials or project configuration required by the SDK

## Bootstrap Command

From the repo root:

```bash
pnpm validate:privara
```

This bootstrap script:

- checks the expected Arbitrum Sepolia env values
- confirms whether `@reineira-os/sdk` is installed
- prints the remaining manual validation questions

## Validation Questions

The validation is successful only if we can answer all of these with confidence:

1. Can Privara escrow be created and funded on Arbitrum Sepolia for the dispute collateral?
2. Can Privara conditions depend on finalized CipherMarket state?
3. Can the condition distinguish dispute success, dispute failure, and not-yet-finalized markets?
4. Can the normal release path complete without manual operator action?
5. Can CipherMarket keep a safe native fallback path if Privara is unavailable?

## Expected Output

At the end of the validation spike, write a short result note with one of these statuses:

- `PASS`: Wave 3C can proceed into contract integration.
- `PARTIAL`: Some escrow mechanics work, but release conditions or operational reliability are not ready.
- `FAIL`: Wave 3C should not begin full implementation.

## Recommended Notes To Capture

- how escrow is created
- what identifiers Privara returns
- whether Arbitrum Sepolia USDC works cleanly
- what condition expression is needed for refund vs forfeiture
- whether the release target should be direct disputer refund, a protocol-owned settlement receiver, or another distribution address
- what operational failure modes remain

## Decision Rule

If refund vs forfeiture cannot be expressed reliably against finalized CipherMarket state, Wave 3C should not proceed beyond validation.
