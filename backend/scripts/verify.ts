import { run } from "hardhat";

export const verify = async(contractAddress: string, args?: any[]): Promise<void> => {
    console.log('verifying contract...');
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args || []  
        })
    }
    catch(e: any) {
        if(e.message.toLowerCase().includes('already verified')) {
            console.log('Already verified...');
        }
        else {
            console.error(e);
        }
    }
}