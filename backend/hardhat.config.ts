import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

/*const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");
const WALLET_TEST_PK = vars.get("WALLET_TEST_PK");
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY")*/

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
   /*polygon: {
      url: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,  
      accounts : [`0x${WALLET_TEST_PK}`],
      chainId : 80002 
    },*/
    localhost: {
      url: `http://127.0.0.1:8545/`,
      chainId: 31337
    }
  },
  sourcify: {
    enabled: true
  }, /*
   etherscan: {
    apiKey: { 
      polygonAmoy : ETHERSCAN_API_KEY,
    }
  },*/
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
   },
  };

export default config;
