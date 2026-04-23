import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'cofhe-hardhat-plugin';
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
    'sepolia': {
      url: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gasMultiplier: 1.2,
      timeout: 60000,
      httpHeaders: {},
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
