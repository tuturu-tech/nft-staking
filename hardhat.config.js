require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {},
    /*   ethereum_mainnet_fork: {
      forking: {
        url: "https://eth-mainnet.alchemyapi.io/v2/5ZvYqQFMIo2-uoYCdm758OnOhpr4-AeY",
      },
    },
    bsc_mainnet_fork: {
      forking: {
        url: "https://bsc-dataseed.binance.org/",
      },
    },*/
    rinkeby: {
      url: process.env.PROVIDER_RINKEBY,
      accounts: [process.env.PRIVATE_KEY1, process.env.PRIVATE_KEY2],
    },
    kovan: {
      url: process.env.PROVIDER_KOVAN,
      accounts: [process.env.PRIVATE_KEY1, process.env.PRIVATE_KEY2],
    },
    bsc_testnet: {
      url: process.env.PROVIDER_BSC_TESTNET,
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [process.env.PRIVATE_KEY1, process.env.PRIVATE_KEY2],
    },
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 20000,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
    // apiKey: process.env.BSCSCAN_KEY,
    // apiKey: process.env.SNOWTRACE_KEY,
  },
  gasReporter: {
    gasPriceApi:
      "https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice",
    token: "BNB",
  },
};
