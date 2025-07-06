import { createPublicClient, http } from 'viem';
import { hardhat } from 'viem/chains';
import { localhostNode } from '../constants';

export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(localhostNode)
}); 