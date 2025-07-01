import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");
// const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");
// const SEPOLIA_PK = vars.get("SEPOLIA_PK");
const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
   /**  sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}}`,
      accounts: [`0x${SEPOLIA_PK}`],
      chainId: 11155111,
    }, */
    localhost: {
      url: `http://127.0.0.1:8545/`,
      chainId: 31337
    }
  },/**,
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    },*/
  };

export default config;
