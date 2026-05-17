import { createCofheConfig } from '@cofhe/react';
import {
  arbSepolia as cofheArbitrumSepolia,
} from '@cofhe/sdk/chains';

export const cofheConfig = createCofheConfig({
  supportedChains: [cofheArbitrumSepolia],
  useWorkers: true,
  mocks: {
    decryptDelay: 0,
    encryptDelay: [80, 80, 120, 240, 240],
  },
  react: {
    autogeneratePermits: false,
    enableShieldUnshield: false,
    initialTheme: 'dark',
    position: 'bottom-right',
    shareablePermits: false,
  },
});
