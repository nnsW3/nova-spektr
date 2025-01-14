import { memo } from 'react';

import { useI18n } from '@app/providers';
import { type OngoingReferendum } from '@shared/core';
import { HeadlineText, Shimmering } from '@shared/ui';
import { TrackInfo, VoteChart, Voted, votingService } from '@entities/governance';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingStatusBadge } from '../VotingStatusBadge';

import { ListItem } from './ListItem';

type Props = {
  isTitlesLoading: boolean;
  referendum: AggregatedReferendum<OngoingReferendum>;
  onSelect: (value: AggregatedReferendum<OngoingReferendum>) => void;
};

export const OngoingReferendumItem = memo<Props>(({ referendum, isTitlesLoading, onSelect }) => {
  const { t } = useI18n();
  const { supportThreshold, approvalThreshold, isVoted, title } = referendum;
  const isPassing = supportThreshold ? supportThreshold.passing : false;
  const voteFractions = approvalThreshold
    ? votingService.getVoteFractions(referendum.tally, approvalThreshold.value)
    : null;

  const titleNode =
    title ||
    (isTitlesLoading ? (
      <Shimmering height={20} width={200} />
    ) : (
      t('governance.referendums.referendumTitle', { index: referendum.referendumId })
    ));

  return (
    <ListItem onClick={() => onSelect(referendum)}>
      <div className="flex items-center gap-x-2 w-full">
        <Voted active={isVoted} />
        <VotingStatusBadge passing={isPassing} referendum={referendum} />

        {/*<ReferendumTimer status="reject" time={600000} />*/}
        <TrackInfo referendumId={referendum.referendumId} trackId={referendum.track} />
      </div>
      <div className="flex items-start gap-x-6 w-full">
        <HeadlineText className="flex-1 pointer-events-auto">{titleNode}</HeadlineText>
        <div className="basis-[200px] shrink-0">
          {voteFractions ? (
            <VoteChart
              bgColor="icon-button"
              aye={voteFractions.aye}
              nay={voteFractions.nay}
              pass={voteFractions.pass}
            />
          ) : null}
        </div>
      </div>
    </ListItem>
  );
});
