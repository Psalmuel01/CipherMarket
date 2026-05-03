import { TASK_NODE, TASK_TEST } from 'hardhat/builtin-tasks/task-names';
import { extendConfig, task, types } from 'hardhat/config';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import { deployMocks, type DeployMocksArgs } from 'cofhe-hardhat-plugin/dist/src/deploy-mocks';

declare module 'hardhat/types/config' {
  interface HardhatUserConfig {
    cofhe?: {
      logMocks?: boolean;
      gasWarning?: boolean;
    };
  }

  interface HardhatConfig {
    cofhe: {
      logMocks: boolean;
      gasWarning: boolean;
    };
  }
}

const TASK_COFHE_MOCKS_DEPLOY = 'cofhe:mocks:deploy';

extendConfig((config, userConfig) => {
  config.cofhe = {
    logMocks: userConfig.cofhe?.logMocks ?? true,
    gasWarning: userConfig.cofhe?.gasWarning ?? true,
  };
});

task(TASK_COFHE_MOCKS_DEPLOY, 'Deploy CoFHE mock contracts on Hardhat')
  .addOptionalParam('deployTestBed', 'Whether to deploy the FHE test bed', true, types.boolean)
  .addOptionalParam('silent', 'Whether to suppress mock deployment logs', false, types.boolean)
  .setAction(async ({ deployTestBed, silent }: DeployMocksArgs, hre: HardhatRuntimeEnvironment) => {
    await deployMocks(hre, {
      deployTestBed: deployTestBed ?? true,
      gasWarning: hre.config.cofhe.gasWarning ?? true,
      silent: silent ?? false,
    });
  });

task(TASK_TEST, 'Deploy CoFHE mock contracts before running tests').setAction(
  async (_, hre: HardhatRuntimeEnvironment, runSuper) => {
    await deployMocks(hre, {
      deployTestBed: true,
      gasWarning: hre.config.cofhe.gasWarning ?? true,
    });

    return runSuper();
  },
);

task(TASK_NODE, 'Deploy CoFHE mock contracts before starting the local node').setAction(
  async (_, hre: HardhatRuntimeEnvironment, runSuper) => {
    await deployMocks(hre, {
      deployTestBed: true,
      gasWarning: hre.config.cofhe.gasWarning ?? true,
    });

    return runSuper();
  },
);
