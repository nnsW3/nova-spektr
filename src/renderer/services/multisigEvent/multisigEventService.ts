import { useLiveQuery } from 'dexie-react-hooks';

import storage, { MultisigEventDS } from '@renderer/services/storage';
import { IMultisigEventService } from './common/types';
import { AccountId, CallHash, ChainId } from '@renderer/domain/shared-kernel';
import { MultisigEvent, MultisigTransactionKey } from '@renderer/domain/transaction';

export const useMultisigEvent = (): IMultisigEventService => {
  const multisigEventStorage = storage.connectTo('multisigEvents');

  if (!multisigEventStorage) {
    throw new Error('=== 🔴 Multisig event storage in not defined 🔴 ===');
  }
  const { getEvent, getEvents, addEvent, updateEvent, deleteEvent, getEventsByKeys } = multisigEventStorage;

  const getLiveEvents = <T extends MultisigEvent>(where?: Partial<T>): MultisigEventDS[] => {
    const query = () => {
      try {
        return getEvents(where);
      } catch (error) {
        console.warn('Error trying to get multisig events');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [], []);
  };

  const getLiveTxEvents = <T extends MultisigEvent>(
    txAccountId: AccountId,
    txChainId: ChainId,
    txCallHash: CallHash,
    txBlock: number,
    txIndex: number,
    where?: Partial<T>,
  ): MultisigEventDS[] => {
    const query = () => {
      try {
        return getEvents({
          ...where,
          txAccountId,
          txChainId,
          txCallHash,
          txBlock,
          txIndex,
        });
      } catch (error) {
        console.warn('Error trying to get multisig events');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(query, [txAccountId, txChainId, txCallHash, txBlock, txIndex], []);
  };

  const getLiveEventsByKeys = (keys: MultisigTransactionKey[]): MultisigEventDS[] => {
    const query = () => {
      try {
        return getEventsByKeys(keys);
      } catch (error) {
        console.warn('Error trying to get multisig events');

        return Promise.resolve([]);
      }
    };

    return useLiveQuery(
      query,
      [
        keys.length,
        keys.length && keys[0].accountId,
        keys.length && keys[0].chainId,
        keys.length && keys[0].callHash,
        keys.length && keys[0].blockCreated,
        keys.length && keys[0].indexCreated,
      ],
      [],
    );
  };

  return {
    getEvent,
    getEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    getLiveEvents,
    getLiveTxEvents,
    getEventsByKeys,
    getLiveEventsByKeys,
  };
};