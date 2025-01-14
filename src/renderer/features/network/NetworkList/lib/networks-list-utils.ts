import { type Chain, type ChainId, type Connection, type ConnectionStatus } from '@shared/core';
import { type ExtendedChain, networkUtils } from '@entities/network';

export const networksListUtils = {
  getExtendedChain,
  getStatusMetrics,
};

function getExtendedChain(
  chains: Chain[],
  connections: Record<ChainId, Connection>,
  connectionStatuses: Record<ChainId, ConnectionStatus>,
): ExtendedChain[] {
  return chains.map((chain) => {
    return {
      ...chain,
      connection: connections[chain.chainId],
      connectionStatus: connectionStatuses[chain.chainId],
    };
  }, []);
}

type Metrics = Record<'success' | 'connecting' | 'error', number>;
function getStatusMetrics(networkList: ExtendedChain[]): Metrics {
  return networkList.reduce(
    (acc, network) => {
      if (networkUtils.isDisabledConnection(network.connection)) return acc;

      if (networkUtils.isConnectedStatus(network.connectionStatus)) acc.success += 1;
      if (networkUtils.isConnectingStatus(network.connectionStatus)) acc.connecting += 1;
      if (networkUtils.isErrorStatus(network.connectionStatus)) acc.error += 1;

      return acc;
    },
    { success: 0, connecting: 0, error: 0 },
  );
}
