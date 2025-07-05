import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { urlRpcPolygonAmoy,localhostNode } from '../constants';

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(localhostNode)
}); 