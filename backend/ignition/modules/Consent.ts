// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

// const JAN_1ST_2030 = 1893456000;
// const ONE_GWEI: bigint = parseEther("0.001");

const ConsentModule = buildModule("Consent", (m) => {
  //const unlockTime = m.getParameter("unlockTime", JAN_1ST_2030);
  //const lockedAmount = m.getParameter("lockedAmount", ONE_GWEI);

  const consent = m.contract("Consent", [], {
   // value: lockedAmount,
  });

  return { consent: consent };
});

export default ConsentModule;
