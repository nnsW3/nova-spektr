import { type ApiPromise } from '@polkadot/api';
import { type FrameSupportPreimagesBounded, type PalletReferendaCurve } from '@polkadot/types/lookup';
import { type BN, BN_ZERO } from '@polkadot/util';

import {
  type AccountVote,
  type Address,
  type LinearDecreasingCurve,
  type ReciprocalCurve,
  type Referendum,
  type ReferendumId,
  ReferendumType,
  type SteppedDecreasingCurve,
  type TrackId,
  type TrackInfo,
  type Voting,
  type VotingCurve,
} from '@/shared/core';

export const governanceService = {
  getReferendums,
  getVotingFor,
  getTrackLocks,
  getTracks,
};

function getProposalHex(proposal: FrameSupportPreimagesBounded) {
  if (proposal.isInline) {
    return proposal.asInline.toHex();
  }
  if (proposal.isLookup) {
    return proposal.asLookup.toHex();
  }
  if (proposal.isLegacy) {
    return proposal.asLegacy.toHex();
  }

  return '';
}

async function getReferendums(api: ApiPromise): Promise<Referendum[]> {
  const referendums = await api.query.referenda.referendumInfoFor.entries();

  const result: Referendum[] = [];

  for (const [refIndex, option] of referendums) {
    if (option.isNone) continue;

    const referendum = option.unwrap();
    const referendumId = refIndex.args[0].toString();

    if (referendum.isOngoing) {
      const ongoing = referendum.asOngoing;
      const deciding = ongoing.deciding.unwrapOr(null);
      const decisionDeposit = ongoing.decisionDeposit.unwrapOr(null);
      const proposal = getProposalHex(ongoing.proposal);

      result.push({
        referendumId,
        type: ReferendumType.Ongoing,
        track: ongoing.track.toString(),
        proposal,
        submitted: ongoing.submitted.toNumber(),
        enactment: {
          value: ongoing.enactment.isAfter ? ongoing.enactment.asAfter.toBn() : ongoing.enactment.asAt.toBn(),
          type: ongoing.enactment.type,
        },
        inQueue: ongoing.inQueue.toPrimitive(),
        deciding: deciding
          ? {
              since: deciding.since.toNumber(),
              confirming: deciding.confirming.unwrapOr(BN_ZERO).toNumber(),
            }
          : null,
        tally: {
          ayes: ongoing.tally.ayes.toBn(),
          nays: ongoing.tally.nays.toBn(),
          support: ongoing.tally.support.toBn(),
        },
        decisionDeposit: decisionDeposit
          ? {
              who: decisionDeposit.who.toString(),
              amount: decisionDeposit.amount.toBn(),
            }
          : null,
        submissionDeposit: {
          who: ongoing.submissionDeposit.who.toString(),
          amount: ongoing.submissionDeposit.amount.toBn(),
        },
      });
    }

    if (referendum.isRejected) {
      const rejected = referendum.asRejected;

      result.push({
        referendumId,
        type: ReferendumType.Rejected,
        since: rejected[0].toNumber(),
      });
    }

    if (referendum.isApproved) {
      const approved = referendum.asApproved;

      result.push({
        referendumId,
        type: ReferendumType.Approved,
        since: approved[0].toNumber(),
      });
    }

    if (referendum.isCancelled) {
      const cancelled = referendum.asCancelled;

      result.push({
        referendumId,
        type: ReferendumType.Cancelled,
        since: cancelled[0].toNumber(),
      });
    }

    if (referendum.isTimedOut) {
      const timedOut = referendum.asTimedOut;

      result.push({
        referendumId,
        type: ReferendumType.TimedOut,
        since: timedOut[0].toNumber(),
      });
    }

    if (referendum.isKilled) {
      result.push({
        referendumId,
        type: ReferendumType.Killed,
        since: referendum.asKilled.toNumber(),
      });
    }
  }

  return result;
}

async function getVotingFor(
  api: ApiPromise,
  tracksIds: TrackId[],
  addresses: Address[],
): Promise<Record<Address, Record<TrackId, Voting>>> {
  const tuples = addresses.flatMap((address) => tracksIds.map((trackId) => [address, trackId]));

  const votings = await api.query.convictionVoting.votingFor.multi(tuples);
  const result = addresses.reduce<Record<Address, Record<TrackId, Voting>>>((acc, address) => {
    acc[address] = {};

    return acc;
  }, {});

  for (const [index, convictionVoting] of votings.entries()) {
    if (convictionVoting.isStorageFallback) continue;

    const address = tuples[index]?.[0];
    const trackId = tuples[index]?.[1];
    if (!address || !trackId) {
      continue;
    }

    if (convictionVoting.isDelegating) {
      const delegation = convictionVoting.asDelegating;

      result[address][trackId] = {
        type: 'delegating',
        delegating: {
          balance: delegation.balance.toBn(),
          conviction: delegation.conviction.type,
          target: delegation.target.toString(),
          prior: {
            unlockAt: delegation.prior[0].toNumber(),
            amount: delegation.prior[1].toBn(),
          },
        },
      };
    }

    if (convictionVoting.isCasting) {
      const votes: Record<ReferendumId, AccountVote> = {};
      for (const [referendumIndex, vote] of convictionVoting.asCasting.votes) {
        const referendumId = referendumIndex.toString();

        if (vote.isStandard) {
          const standardVote = vote.asStandard;
          votes[referendumId] = {
            type: 'standard',
            address,
            track: trackId,
            referendumId,
            vote: {
              type: standardVote.vote.isAye ? 'aye' : 'nay',
              conviction: standardVote.vote.conviction.type,
            },
            balance: standardVote.balance.toBn(),
          };
        }

        if (vote.isSplit) {
          const splitVote = vote.asSplit;
          votes[referendumId] = {
            type: 'split',
            address,
            referendumId,
            track: trackId,
            aye: splitVote.aye.toBn(),
            nay: splitVote.nay.toBn(),
          };
        }

        if (vote.isSplitAbstain) {
          const splitAbstainVote = vote.asSplitAbstain;
          votes[referendumId] = {
            type: 'splitAbstain',
            address,
            referendumId,
            track: trackId,
            aye: splitAbstainVote.aye.toBn(),
            nay: splitAbstainVote.nay.toBn(),
            abstain: splitAbstainVote.abstain.toBn(),
          };
        }
      }

      result[address][trackId] = {
        type: 'casting',
        casting: {
          votes,
          prior: {
            unlockAt: convictionVoting.asCasting.prior[0].toNumber(),
            amount: convictionVoting.asCasting.prior[1].toBn(),
          },
        },
      };
    }
  }

  return result;
}

async function getTrackLocks(api: ApiPromise, addresses: Address[]): Promise<Record<Address, Record<TrackId, BN>>> {
  const tuples = await api.query.convictionVoting.classLocksFor.multi(addresses);
  const result: Record<Address, Record<TrackId, BN>> = {};

  for (const [index, locks] of tuples.entries()) {
    const lockData = locks.reduce<Record<TrackId, BN>>((acc, lock) => {
      acc[lock[0].toString()] = lock[1].toBn();

      return acc;
    }, {});

    result[addresses[index]] = lockData;
  }

  return result;
}

function getTracks(api: ApiPromise): Record<TrackId, TrackInfo> {
  const tracks = api.consts.referenda.tracks;

  const result: Record<TrackId, TrackInfo> = {};

  for (const [index, track] of tracks) {
    let minApproval: VotingCurve | undefined;
    let minSupport: VotingCurve | undefined;

    if (track.minApproval.isLinearDecreasing) minApproval = getLinearDecreasing(track.minApproval);
    if (track.minSupport.isLinearDecreasing) minSupport = getLinearDecreasing(track.minSupport);

    if (track.minApproval.isSteppedDecreasing) minApproval = getSteppedDecreasing(track.minApproval);
    if (track.minSupport.isSteppedDecreasing) minSupport = getSteppedDecreasing(track.minSupport);

    if (track.minApproval.isReciprocal) minApproval = getReciprocal(track.minApproval);
    if (track.minSupport.isReciprocal) minSupport = getReciprocal(track.minSupport);

    if (!minApproval || !minSupport) {
      throw new Error('Approval curve not found');
    }

    result[index.toString()] = {
      name: track.name.toString(),
      maxDeciding: track.maxDeciding.toBn(),
      decisionDeposit: track.decisionDeposit.toBn(),
      preparePeriod: track.preparePeriod.toNumber(),
      decisionPeriod: track.decisionPeriod.toNumber(),
      minApproval,
      minSupport,
    };
  }

  return result;
}

function getLinearDecreasing(approval: PalletReferendaCurve): LinearDecreasingCurve {
  const linearDecreasing = approval.asLinearDecreasing;

  return {
    type: 'LinearDecreasing',
    length: linearDecreasing.length,
    floor: linearDecreasing.floor,
    ceil: linearDecreasing.ceil,
  };
}

function getSteppedDecreasing(approval: PalletReferendaCurve): SteppedDecreasingCurve {
  const steppedDecreasing = approval.asSteppedDecreasing;

  return {
    type: 'SteppedDecreasing',
    begin: steppedDecreasing.begin,
    end: steppedDecreasing.end,
    period: steppedDecreasing.period,
    step: steppedDecreasing.step,
  };
}

function getReciprocal(approval: PalletReferendaCurve): ReciprocalCurve {
  const reciprocal = approval.asReciprocal;

  return {
    type: 'Reciprocal',
    factor: reciprocal.factor,
    xOffset: reciprocal.xOffset,
    yOffset: reciprocal.yOffset,
  };
}
