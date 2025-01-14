import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { UnlockChunkType } from '@shared/api/governance';
import { getSecondsDuratonToBlock } from '@shared/lib/utils';
import { Button, Duration, FootnoteText, Icon, Shimmering } from '@shared/ui';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price';
import { permissionUtils, walletModel } from '@entities/wallet';
import { locksModel } from '@features/governance/model/locks';
import { votingAssetModel } from '@features/governance/model/votingAsset';
import { unlockAggregate } from '../aggregates/unlock';

export const UnlockInfo = () => {
  const { t } = useI18n();

  const totalLock = useUnit(locksModel.$totalLock);
  const asset = useUnit(votingAssetModel.$votingAsset);
  const pendingSchedule = useUnit(unlockAggregate.$pendingSchedule);
  const isLoading = useUnit(unlockAggregate.$isLoading);
  const totalUnlock = useUnit(unlockAggregate.$totalUnlock);

  if (!asset) {
    return null;
  }

  return (
    <div className="pb-4 px-5 flex flex-col gap-y-1 items-center">
      <Icon name="opengovVotingLock" size={60} />
      <AssetBalance className="text-large-title mt-2" value={totalLock.toString()} asset={asset} />
      <AssetFiatBalance className="mb-5" amount={totalLock.toString()} asset={asset} />
      {isLoading && <Shimmering width={250} height={20} />}
      <>
        {!totalUnlock.isZero() && (
          <div className="flex justify-between items-center self-stretch mb-3">
            <AssetBalance value={totalUnlock.toString()} asset={asset} />
            <FootnoteText className="text-text-positive">{t('governance.locks.unlockable')}</FootnoteText>
          </div>
        )}
        {pendingSchedule.map((lock) => (
          <div
            key={`${lock.amount.toString()}-${lock.type}-${lock.address}`}
            className="flex justify-between items-center self-stretch mb-3"
          >
            <AssetBalance value={lock.amount.toString()} asset={asset} />
            {lock.type === UnlockChunkType.PENDING_DELIGATION && (
              <FootnoteText className="text-text-tertiary">{t('governance.locks.yourDelegation')}</FootnoteText>
            )}
            {lock.type === UnlockChunkType.PENDING_LOCK && (
              <Duration
                as={FootnoteText}
                className="text-text-tertiary"
                seconds={getSecondsDuratonToBlock(lock.timeToBlock!)}
              />
            )}
          </div>
        ))}
      </>
      <ActionsSection />
    </div>
  );
};

const ActionsSection = () => {
  const { t } = useI18n();

  const isUnlockable = useUnit(unlockAggregate.$isUnlockable);
  const activeWallet = useUnit(walletModel.$activeWallet);

  if (!activeWallet || !permissionUtils.canUnlock(activeWallet)) return null;

  return (
    <div className="flex self-end items-center mt-3">
      <Button type="submit" disabled={!isUnlockable} onClick={() => unlockAggregate.events.unlockFormStarted()}>
        {t('governance.locks.unlock')}
      </Button>
    </div>
  );
};
