import { useForm } from 'effector-forms';
import { useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@app/providers';
import { type MultisigAccount } from '@/shared/core';
import { cnTw } from '@shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@shared/ui';
import { ValueIndicator } from '@/entities/governance';
import { FeeWithLabel, MultisigDepositWithLabel } from '@/entities/transaction';
import { AddressWithExplorers, WalletIcon } from '@/entities/wallet';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { basketUtils } from '@/features/operations/OperationsConfirm';
import { unlockAggregate } from '../../aggregates/unlock';
import { unlockConfirmAggregate } from '../../aggregates/unlockConfirm';
import { locksModel } from '../../model/locks';
import { networkSelectorModel } from '../../model/networkSelector';
import { confirmModel } from '../../model/unlock/confirm-model';
import { votingAssetModel } from '../../model/votingAsset';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id = 0, onGoBack }: Props) => {
  const { t } = useI18n();

  const initiatorWallet = useStoreMap({
    store: confirmModel.$initiatorWallets,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const realAccount = useStoreMap({
    store: confirmModel.$realAccounts,
    keys: [id],
    fn: (value, [id]) => value?.[id],
  });

  const proxiedWallet = useUnit(confirmModel.$proxiedWallet);
  const chain = useUnit(networkSelectorModel.$governanceChain);
  const asset = useUnit(votingAssetModel.$votingAsset);
  const transferableAmount = useUnit(unlockConfirmAggregate.$transferableAmount);
  const totalUnlock = useUnit(unlockAggregate.$totalUnlock);
  const totalLock = useUnit(locksModel.$totalLock);

  if (!initiatorWallet || !chain || !asset) return null;

  return (
    <div className="flex flex-col items-center pt-4 gap-y-4 pb-4 px-5 w-modal">
      <div className="flex flex-col items-center gap-y-3 mb-2">
        <Icon className="text-icon-default" name="unlockMst" size={60} />

        <div className={cnTw('flex flex-col gap-y-1 items-center')}>
          <AssetBalance
            value={totalUnlock.toString()}
            asset={asset}
            className="font-manrope text-text-primary text-[32px] leading-[36px] font-bold"
          />
          <AssetFiatBalance asset={asset} amount={totalUnlock.toString()} className="text-headline" />
        </div>

        {/* <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
          {confirmForm.description}
        </FootnoteText> */}
      </div>

      <dl className="flex flex-col gap-y-4 w-full">
        {proxiedWallet && (
          <>
            <DetailRow label={t('transfer.senderProxiedWallet')} className="flex gap-x-2">
              <WalletIcon type={proxiedWallet.type} size={16} />
              <FootnoteText className="pr-2">{proxiedWallet.name}</FootnoteText>
            </DetailRow>

            <DetailRow label={t('transfer.senderProxiedAccount')}>
              <AddressWithExplorers
                type="short"
                explorers={chain.explorers}
                addressFont="text-footnote text-inherit"
                accountId={proxiedWallet.accounts[0].accountId}
                addressPrefix={chain.addressPrefix}
                wrapperClassName="text-text-secondary"
              />
            </DetailRow>

            <hr className="border-filter-border w-full pr-2" />

            <DetailRow label={t('transfer.signingWallet')} className="flex gap-x-2">
              <WalletIcon type={initiatorWallet.type} size={16} />
              <FootnoteText className="pr-2">{initiatorWallet.name}</FootnoteText>
            </DetailRow>

            <DetailRow label={t('transfer.signingAccount')}>
              <AddressWithExplorers
                type="short"
                explorers={chain.explorers}
                addressFont="text-footnote text-inherit"
                accountId={realAccount.accountId}
                addressPrefix={chain.addressPrefix}
                wrapperClassName="text-text-secondary"
              />
            </DetailRow>
          </>
        )}

        {!proxiedWallet && (
          <>
            <DetailRow label={t('operation.details.wallet')} className="flex gap-x-2">
              <WalletIcon type={initiatorWallet.type} size={16} />
              <FootnoteText className="pr-2">{initiatorWallet.name}</FootnoteText>
            </DetailRow>

            <DetailRow label={t('operation.details.account')}>
              <AddressWithExplorers
                type="short"
                explorers={chain.explorers}
                addressFont="text-footnote text-inherit"
                accountId={realAccount.accountId}
                addressPrefix={chain.addressPrefix}
                wrapperClassName="text-text-secondary"
              />
            </DetailRow>
          </>
        )}
        {/* 
        {signerWallet && confirmStore.signatory && (
          <DetailRow label={t('proxy.details.signatory')}>
            <ExplorersPopover
              button={<WalletCardSm wallet={signerWallet} />}
              address={confirmStore.signatory.accountId}
              explorers={chain.explorers}
              addressPrefix={chain.addressPrefix}
            />
          </DetailRow>
        )} */}
        <hr className="border-filter-border w-full pr-2" />
        <DetailRow label={t('governance.operations.transferable')} wrapperClassName="items-start">
          <ValueIndicator
            from={transferableAmount.toString()}
            to={transferableAmount.add(totalUnlock).toString()}
            asset={asset}
          />
        </DetailRow>
        <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
          <ValueIndicator from={totalLock.toString()} to={totalLock.sub(totalUnlock).toString()} asset={asset} />
        </DetailRow>
        <hr className="border-filter-border w-full pr-2" />
        <FeeSection />
      </dl>

      <div className="flex w-full justify-between mt-3">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <div className="flex gap-4">
          {initiatorWallet && basketUtils.isBasketAvailable(initiatorWallet) && (
            <Button pallet="secondary" onClick={() => unlockAggregate.events.txSaved()}>
              {t('operation.addToBasket')}
            </Button>
          )}
          {/* <SignButton
            isDefault={Boolean(secondaryActionButton)}
            type={(signerWallet || initiatorWallet).type}
            onClick={confirmModel.events.confirmed}
          /> */}
        </div>
      </div>
    </div>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { shards },
  } = useForm(unlockConfirmAggregate.$confirmForm);

  const api = useUnit(confirmModel.$api);
  const chain = useUnit(networkSelectorModel.$governanceChain);
  const transactions = useUnit(unlockConfirmAggregate.$transactions);
  const isMultisig = useUnit(confirmModel.$isMultisig);

  if (!chain || shards.value.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={chain.assets[0]}
          threshold={(shards.value[0] as MultisigAccount).threshold || 1}
          onDepositChange={unlockConfirmAggregate.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        label={t('staking.networkFee', { count: shards.value.length || 1 })}
        api={api}
        asset={chain.assets[0]}
        transaction={transactions?.[0]?.wrappedTx}
        onFeeChange={unlockConfirmAggregate.events.feeChanged}
        onFeeLoading={unlockConfirmAggregate.events.isFeeLoadingChanged}
      />

      {transactions && transactions.length > 1 && (
        <FeeWithLabel
          label={t('staking.networkFeeTotal')}
          api={api}
          asset={chain.assets[0]}
          multiply={transactions.length}
          transaction={transactions[0].wrappedTx}
          onFeeChange={unlockConfirmAggregate.events.totalFeeChanged}
          onFeeLoading={unlockConfirmAggregate.events.isFeeLoadingChanged}
        />
      )}
    </div>
  );
};