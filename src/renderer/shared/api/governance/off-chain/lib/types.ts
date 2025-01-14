import { type BN } from '@polkadot/util';

import { type Address, type Chain, type ReferendumId } from '@shared/core';

export type ReferendumVote = {
  decision: 'aye' | 'nay' | 'abstain';
  voter: Address;
  balance: BN;
  conviction: number;
};

export type ReferendumTimelineRecordStatus =
  | 'All'
  | 'Confirmed'
  | 'Created'
  | 'ConfirmStarted'
  | 'Cancelled'
  | 'Deciding'
  | 'DecisionDepositPlaced'
  | 'Killed'
  | 'Executed'
  | 'Submitted'
  | 'Rejected'
  | 'Awarded'
  | 'TimedOut';

export type ReferendumTimelineRecord = {
  date: Date;
  status: ReferendumTimelineRecordStatus;
};

export interface GovernanceApi {
  getReferendumList: (chain: Chain, callback: (data: Record<string, string>, done: boolean) => void) => void;
  getReferendumDetails: (chain: Chain, referendumId: ReferendumId) => Promise<string | undefined>;
  getReferendumVotes: (
    chain: Chain,
    referendumId: ReferendumId,
    callback: (data: ReferendumVote[], done: boolean) => void,
  ) => Promise<ReferendumVote[]>;
  getReferendumTimeline: (chain: Chain, referendumId: ReferendumId) => Promise<ReferendumTimelineRecord[]>;
}

export type DelegateDetails = {
  address: Address;
  name: string;
  image: string;
  shortDescription: string;
  longDescription: string;
  isOrganization: boolean;
};

export type DelegateStat = {
  accountId: Address;
  delegators: any[];
  delegatorVotes: any[];
  delegateVotes: number;
};

export type DelegateAccount = DelegateStat & Partial<DelegateDetails>;

export interface DelegationApi {
  getDelegatesFromRegistry: (chain: Chain) => Promise<DelegateDetails[]>;
  getDelegatesFromExternalSource: (chain: Chain, blockNumber: number) => Promise<DelegateStat[]>;
  aggregateDelegateAccounts: (accounts: DelegateDetails[], stats: DelegateStat[]) => DelegateAccount[];
}
