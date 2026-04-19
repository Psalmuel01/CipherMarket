import { createCofheConfig } from '@cofhe/react';
import {
  sepolia as cofheSepolia,
} from '@cofhe/sdk/chains';

export const cofheConfig = createCofheConfig({
  supportedChains: [cofheSepolia],
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
