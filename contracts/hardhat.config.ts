import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import './cofhe-lite';
import dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.25',
    settings: {
      evmVersion: 'cancun',
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
  defaultNetwork: 'hardhat',
  cofhe: {
    logMocks: false,
    gasWarning: true,
  },
  networks: {
    hardhat: {
      chainId: 420105,
    },
    'arbitrum-sepolia': {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://arbitrum-sepolia.infura.io/v3/d8bc683c0b7841b18d5976c3dedf25c6',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614,
      gasMultiplier: 1.2,
      timeout: 60000,
    },
  },
  etherscan: {
    // Migration to V2: use a single API key and the centralized V2 endpoint
    apiKey: process.env.ARBISCAN_API_KEY || '',
    customChains: [
      {
        network: 'arbitrum-sepolia',
        chainId: 421614,
        urls: {
          apiURL: 'https://api.etherscan.io/v2/api',
          browserURL: 'https://sepolia.arbiscan.io',
        },
      },
    ],
  },
};

export default config;
