import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { Fee } from '@renderer/components/common';
import { AmountInput, Balance, Button, HintList, Icon, InputHint, Select } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Address, ChainId, AccountId, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, transferableAmount } from '@renderer/shared/utils/balance';
import { AccountDS, BalanceDS } from '@renderer/services/storage';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { StakingMap } from '@renderer/services/staking/common/types';
import { Stake } from '@renderer/domain/stake';
import { UnstakingDuration } from '../../../Overview/components';
import { getUnstakeAccountOption } from '../../common/utils';

const validateBalance = (stake: Stake | string, amount: string, asset: Asset): boolean => {
  const unstakeableBalance = typeof stake === 'string' ? stake : stake.active;

  let formatedAmount = new BN(formatAmount(amount, asset.precision));

  return formatedAmount.lte(new BN(unstakeableBalance));
};

const validateBalanceForFee = (balance: BalanceDS | string, fee: string): boolean => {
  const transferableBalance = typeof balance === 'string' ? balance : transferableAmount(balance);

  return new BN(fee).lte(new BN(transferableBalance));
};

type UnstakeForm = {
  amount: string;
};

export type UnstakeResult = {
  accounts: AccountDS[];
  amount: string;
};

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  addressPrefix: number;
  identifiers: string[];
  asset: Asset;
  staking: StakingMap;
  onResult: (unstake: UnstakeResult) => void;
};

const InitOperation = ({ api, chainId, addressPrefix, staking, identifiers, asset, onResult }: Props) => {
  const { t } = useI18n();
  const { getLiveAssetBalances } = useBalance();
  const { getLiveAccounts } = useAccount();
  const { getTransactionFee } = useTransaction();

  const dbAccounts = getLiveAccounts();

  const [fee, setFee] = useState('');
  const [stakedRange, setStakedRange] = useState<[string, string]>(['0', '0']);
  const [transferableRange, setTransferableRange] = useState<[string, string]>(['0', '0']);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [unstakeAccounts, setUnstakeAccounts] = useState<DropdownOption<Address>[]>([]);
  const [activeUnstakeAccounts, setActiveUnstakeAccounts] = useState<DropdownResult<Address>[]>([]);

  const [activeBalances, setActiveBalances] = useState<BalanceDS[]>([]);
  const [balancesMap, setBalancesMap] = useState<Map<string, BalanceDS>>(new Map());

  const totalAccounts = dbAccounts.filter((account) => {
    if (!account.id) return false;

    const correctSigningType = [SigningType.PARITY_SIGNER, SigningType.MULTISIG].includes(account.signingType);
    const accountExistInDb = identifiers.includes(account.id.toString());

    return correctSigningType && accountExistInDb;
  });

  const accountIds = totalAccounts.map((account) => account.accountId);
  const balances = getLiveAssetBalances(accountIds, chainId, asset.assetId.toString());

  const {
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { isValid },
  } = useForm<UnstakeForm>({
    mode: 'onChange',
    defaultValues: { amount: '' },
  });

  const amount = watch('amount');

  // Set balance map
  useEffect(() => {
    const newBalancesMap = new Map(balances.map((balance) => [balance.accountId, balance]));
    const newActiveBalances = activeUnstakeAccounts.map((a) => newBalancesMap.get(a.id as AccountId)) as BalanceDS[];

    setBalancesMap(newBalancesMap);
    setActiveBalances(newActiveBalances);
  }, [activeUnstakeAccounts.length, balances]);

  // Set staked range
  useEffect(() => {
    if (!Object.keys(staking).length) return;

    const staked = activeUnstakeAccounts.map((a) => staking[a.value]?.active || '0');
    const minMaxBalances = staked.reduce<[string, string]>(
      (acc, balance) => {
        if (!balance) return acc;

        acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
        acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];

        return acc;
      },
      [staked[0], staked[0]],
    );

    setStakedRange(minMaxBalances);
  }, [activeUnstakeAccounts.length, staking]);

  // Set transferable range
  useEffect(() => {
    if (!activeUnstakeAccounts.length) return;

    const transferable = activeUnstakeAccounts.map((a) => transferableAmount(balancesMap.get(a.id as AccountId)));
    const minMaxTransferable = transferable.reduce<[string, string]>(
      (acc, balance) => {
        if (!balance) return acc;

        acc[0] = new BN(balance).lt(new BN(acc[0])) ? balance : acc[0];
        acc[1] = new BN(balance).gt(new BN(acc[1])) ? balance : acc[1];

        return acc;
      },
      [transferable?.[0], transferable?.[0]],
    );

    setTransferableRange(minMaxTransferable);
  }, [activeUnstakeAccounts.length, balancesMap]);

  useEffect(() => {
    amount && trigger('amount');
  }, [activeBalances]);

  // Init accounts
  useEffect(() => {
    const formattedAccounts = totalAccounts.map((account) => {
      const balance = balancesMap.get(account.accountId);
      const stake = staking[account.accountId];

      return getUnstakeAccountOption(account, { balance, stake, asset, addressPrefix, fee, amount });
    });

    setUnstakeAccounts(formattedAccounts);
  }, [totalAccounts.length, staking, amount, fee, balancesMap]);

  // Init active unstake accounts
  useEffect(() => {
    if (unstakeAccounts.length === 0) return;

    const activeAccounts = unstakeAccounts.map(({ id, value }) => ({ id, value }));
    setActiveUnstakeAccounts(activeAccounts);
  }, [unstakeAccounts.length]);

  // Setup transactions
  useEffect(() => {
    if (!stakedRange) return;

    const newTransactions = activeUnstakeAccounts.map(({ value }) => {
      return {
        chainId,
        type: TransactionType.UNSTAKE,
        address: value,
        args: { value: formatAmount(amount, asset.precision) },
      };
    });

    setTransactions(newTransactions);
  }, [stakedRange, amount]);

  useEffect(() => {
    if (!amount || !transactions.length) return;

    getTransactionFee(transactions[0], api).then(setFee);
  }, [amount]);

  const submitUnstake: SubmitHandler<UnstakeForm> = ({ amount }) => {
    const selectedAddresses = activeUnstakeAccounts.map((stake) => stake.id);

    const accounts = totalAccounts.filter(
      (account) => account.accountId && selectedAddresses.includes(account.accountId),
    );

    onResult({
      amount: formatAmount(amount, asset.precision),
      accounts,
    });
  };

  const transferable =
    transferableRange[0] === transferableRange[1] ? (
      <Balance value={transferableRange[0]} precision={asset.precision} />
    ) : (
      <>
        <Balance value={transferableRange[0]} precision={asset.precision} />
        {' - '}
        <Balance value={transferableRange[1]} precision={asset.precision} />
      </>
    );

  return (
    <div className="w-[600px] flex flex-col items-center mx-auto rounded-2lg bg-shade-2 p-5 ">
      <div className="w-full p-5 rounded-2lg bg-white shadow-surface">
        <Select
          weight="lg"
          placeholder={t('staking.bond.selectStakeAccountLabel')}
          summary={t('staking.bond.selectStakeAccountSummary')}
          activeIds={activeUnstakeAccounts.map((acc) => acc.id)}
          options={unstakeAccounts}
          onChange={setActiveUnstakeAccounts}
        />
      </div>

      <form
        id="initUnstakeForm"
        className="flex flex-col gap-y-5 p-5 w-full rounded-2lg bg-white mt-2.5 mb-5 shadow-surface"
        onSubmit={handleSubmit(submitUnstake)}
      >
        <Controller
          name="amount"
          control={control}
          rules={{
            required: true,
            validate: {
              notZero: (v) => Number(v) > 0,
              insufficientBalance: (amount) =>
                activeUnstakeAccounts.every((a) => validateBalance(staking[a.value] || '0', amount, asset)),
              insufficientBalanceForFee: () => activeBalances.every((b) => validateBalanceForFee(b, fee)),
            },
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <AmountInput
                placeholder={t('staking.unstake.amountPlaceholder')}
                balancePlaceholder={t('staking.unstake.stakedPlaceholder')}
                value={value}
                name="amount"
                balance={stakedRange[0] === stakedRange[1] ? stakedRange[0] : stakedRange}
                asset={asset}
                invalid={Boolean(error)}
                onChange={onChange}
              />
              <InputHint active={error?.type === 'insufficientBalance'} variant="error">
                {t('staking.notEnoughStakedError')}
              </InputHint>
              <InputHint active={error?.type === 'insufficientBalanceForFee'} variant="error">
                {t('staking.notEnoughBalanceForFeeError')}
              </InputHint>
              <InputHint active={error?.type === 'required'} variant="error">
                {t('staking.requiredAmountError')}
              </InputHint>
              <InputHint active={error?.type === 'notZero'} variant="error">
                {t('staking.requiredAmountError')}
              </InputHint>

              <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
                <p>{t('staking.unstake.transferable')}</p>

                <div
                  className={cn(
                    'flex font-semibold',
                    error?.type === 'insufficientBalanceForFee' ? 'text-error' : 'text-neutral',
                  )}
                >
                  {error?.type === 'insufficientBalanceForFee' && (
                    <Icon size={12} className="text-error mr-1" name="warnCutout" />
                  )}
                  {transferable}&nbsp;{asset.symbol}
                </div>
              </div>
            </>
          )}
        />
        <div className="flex justify-between items-center uppercase text-neutral-variant text-2xs">
          <p>{t('staking.unstake.networkFee', { count: activeUnstakeAccounts.length })}</p>

          <Fee className="text-neutral font-semibold" api={api} asset={asset} transaction={transactions[0]} />
        </div>

        <HintList>
          <HintList.Item>
            {t('staking.unstake.durationHint')} {'('}
            <UnstakingDuration className="ml-1" api={api} />
            {')'}
          </HintList.Item>
          <HintList.Item>{t('staking.unstake.noRewardsHint')}</HintList.Item>
          <HintList.Item>{t('staking.unstake.redeemHint')}</HintList.Item>
        </HintList>
      </form>

      <Button type="submit" form="initUnstakeForm" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>
        {t('staking.bond.continueButton')}
      </Button>
    </div>
  );
};

export default InitOperation;
