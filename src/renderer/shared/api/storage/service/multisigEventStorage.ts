import { type MultisigEvent, type MultisigTransactionKey } from '@shared/core';
import { type ID, type IMultisigEventStorage, type MultisigEventDS, type TMultisigEvent } from '../lib/types';

export const useMultisigEventStorage = (db: TMultisigEvent): IMultisigEventStorage => ({
  getEvent: (id: ID): Promise<MultisigEventDS | undefined> => {
    return db.get(id);
  },

  getEvents: <T extends MultisigEvent>(where?: Partial<T>): Promise<MultisigEventDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  getEventsByKeys: (keys: MultisigTransactionKey[]): Promise<MultisigEventDS[]> => {
    return db
      .where(['txAccountId', 'txChainId', 'txCallHash', 'txBlock', 'txIndex'])
      .anyOf(keys.map((k) => [k.accountId, k.chainId, k.callHash, k.blockCreated, k.indexCreated]))
      .toArray();
  },

  addEvent: async (event: MultisigEvent): Promise<ID> => {
    return db.add(event);
  },

  updateEvent: (event: MultisigEventDS): Promise<ID> => {
    // @ts-expect-error TODO fix
    return db.update(event.id, event);
  },

  deleteEvent: (id: ID): Promise<void> => {
    // @ts-expect-error TODO fix
    return db.delete([id]);
  },
});
