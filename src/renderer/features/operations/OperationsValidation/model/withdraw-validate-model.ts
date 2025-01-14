import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { type Store, createEffect, createEvent, restore, sample, scopeBind } from 'effector';
import { combineEvents } from 'patronum';

import {
  type Address,
  type Asset,
  type Balance,
  type Chain,
  type ChainId,
  type ID,
  type Transaction,
} from '@shared/core';
import { redeemableAmount, toAccountId, transferableAmount } from '@shared/lib/utils';
import { balanceModel, balanceUtils } from '@entities/balance';
import { networkModel } from '@entities/network';
import { type StakingMap, eraService, useStakingData } from '@entities/staking';
import { transactionService } from '@entities/transaction';
import { validationUtils } from '../lib/validation-utils';
import { WithdrawRules } from '../lib/withdraw-rules';
import { type AmountFeeStore, type ValidationResult } from '../types/types';

const validationStarted = createEvent<{ id: ID; transaction: Transaction; signerOptions?: Partial<SignerOptions> }>();
const txValidated = createEvent<{ id: ID; result: ValidationResult }>();
const stakingSet = createEvent<StakingMap>();

const $staking = restore(stakingSet, null);

const getEraFx = createEffect(async ({ api }: { api: ApiPromise }): Promise<number | null> => {
  const era = await eraService.getActiveEra(api);

  return era || null;
});

type StakingParams = {
  chainId: ChainId;
  api: ApiPromise;
  addresses: Address[];
};
const subscribeStakingFx = createEffect(({ chainId, api, addresses }: StakingParams): Promise<() => void> => {
  const boundStakingSet = scopeBind(stakingSet, { safe: true });

  return useStakingData().subscribeStaking(chainId, api, addresses, boundStakingSet);
});

type ValidateParams = {
  id: ID;
  api: ApiPromise;
  chain: Chain;
  asset: Asset;
  transaction: Transaction;
  balances: Balance[];
  staking: StakingMap | null;
  era: number | null;
  signerOptions?: Partial<SignerOptions>;
};

const validateFx = createEffect(
  async ({ id, api, chain, asset, transaction, balances, staking, era, signerOptions }: ValidateParams) => {
    const accountId = toAccountId(transaction.address);
    const fee = await transactionService.getTransactionFee(transaction, api, signerOptions);

    const shardBalance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toString());

    const rules = [
      {
        value: transaction.args.value,
        form: {
          shards: [{ accountId }],
        },
        ...WithdrawRules.amount.insufficientBalanceForFee({} as Store<AmountFeeStore>),
        source: {
          isMultisig: false,
          network: { chain, asset },
          feeData: { fee },
          accountsBalances: [transferableAmount(shardBalance)],
        } as AmountFeeStore,
      },
      {
        value: transaction.args.value,
        form: {
          shards: [{ accountId }],
        },
        ...WithdrawRules.amount.noRedeemBalance({} as Store<AmountFeeStore>),
        source: {
          accountsBalances: [redeemableAmount(staking?.[transaction.address]?.unlocking, era || 0)],
        } as AmountFeeStore,
      },
    ];

    return { id, result: validationUtils.applyValidationRules(rules) };
  },
);

sample({
  clock: validationStarted,
  source: {
    apis: networkModel.$apis,
  },
  filter: ({ apis }, { transaction }) => Boolean(apis[transaction.chainId]),
  fn: ({ apis }, { transaction }) => {
    const api = apis[transaction.chainId];

    return {
      api,
      addresses: [transaction.address],
      chainId: transaction.chainId,
    };
  },
  target: [subscribeStakingFx, getEraFx],
});

sample({
  clock: combineEvents({
    events: { validation: validationStarted, staking: $staking.updates, era: getEraFx.doneData },
    reset: txValidated,
  }),
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balances,
    staking: $staking,
  },
  filter: ({ apis, staking }, { validation: { transaction }, era }) => {
    return Boolean(apis[transaction.chainId]) && Boolean(era) && Boolean(staking);
  },
  fn: ({ apis, chains, balances, staking }, { validation: { id, transaction, signerOptions }, era }) => {
    const chain = chains[transaction.chainId];
    const api = apis[transaction.chainId];
    const asset = chain.assets[0];

    return {
      id,
      api,
      transaction,
      chain,
      asset,
      balances,
      staking,
      era,
      signerOptions,
    };
  },
  target: validateFx,
});

sample({
  clock: validateFx.doneData,
  target: txValidated,
});

export const withdrawValidateModel = {
  events: {
    validationStarted,
  },
  output: {
    txValidated,
  },
};
