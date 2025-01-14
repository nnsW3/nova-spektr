import { type ApiPromise } from '@polkadot/api';
import { BN_ZERO } from '@polkadot/util';

import { proxyService } from '@shared/api/proxy';
import {
  type Account,
  type AccountId,
  type Address,
  type Asset,
  type BasketTransaction,
  type Chain,
  type ChainId,
  type Connection,
  type ProxiedAccount,
  type ProxyType,
  type Transaction,
  TransactionType,
  type Validator,
  type Wallet,
} from '@shared/core';
import { getAssetById, redeemableAmount, toAccountId } from '@shared/lib/utils';
import { networkUtils } from '@entities/network';
import { eraService, useStakingData, validatorsService } from '@entities/staking';
import { transactionService } from '@entities/transaction';
import { type UnlockFormData } from '@features/governance/types/structs';

import { getCoreTx } from './utils';

type FeeMap = Record<ChainId, Record<TransactionType, string>>;

type PrepareDataParams = {
  wallets: Wallet[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transactions: BasketTransaction[];
  connections: Record<ChainId, Connection>;
  feeMap: FeeMap;
};

type DataParams = Omit<PrepareDataParams, 'transactions'> & { transaction: BasketTransaction };

type TransferInput = {
  xcmChain: Chain;
  chain: Chain;
  asset: Asset;
  account: Account;
  amount: string;
  destination: Address;
  description: string;

  fee: string;
  xcmFee: string;
  multisigDeposit: string;
};

export const prepareTransaction = {
  prepareTransferTransactionData,
  prepareAddProxyTransaction,
  prepareAddPureProxiedTransaction,
  prepareRemovePureProxiedTransaction,
  prepareRemoveProxyTransaction,
  prepareWithdrawTransaction,
  prepareBondNominateTransaction,
  prepareBondExtraTransaction,
  prepareNominateTransaction,
  prepareRestakeTransaction,
  prepareUnstakeTransaction,
  preparePayeeTransaction,
  prepareUnlockTransaction,
};

async function prepareTransferTransactionData({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;

  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  const xcmChain = chains[transaction.coreTx.args.destinationChain] || chain;

  return {
    id: transaction.id,
    xcmChain,
    chain,
    asset: getAssetById(transaction.coreTx.args.asset, chain.assets),
    account,
    amount: transaction.coreTx.args.value,
    destination: transaction.coreTx.args.dest,
    description: '',

    fee,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: '0',
  } as TransferInput;
}

type AddProxyInput = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  proxyType: ProxyType;
  delegate: Address;
  description: string;

  transaction: Transaction;
  proxiedAccount?: ProxiedAccount;

  proxyDeposit: string;
  proxyNumber: number;
};

async function prepareAddProxyTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  const proxy = await proxyService.getProxiesForAccount(apis[chainId], transaction.coreTx.address);
  const proxyDeposit = proxyService.getProxyDeposit(apis[chainId], proxy.deposit, proxy.accounts.length + 1);

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    delegate: transaction.coreTx.args.delegate,
    description: '',

    transaction: transaction.coreTx,
    proxyDeposit,
    proxyNumber: proxy.accounts.length + 1,
    fee,
  } as AddProxyInput;
}

type AddPureProxiedInput = {
  chain: Chain;
  account: Account;
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  description: string;
  fee: string;
  multisigDeposit: string;
};

async function prepareAddPureProxiedTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));
  const proxyDeposit = proxyService.getProxyDeposit(apis[chainId], '0', 1);

  return {
    id: transaction.id,
    chain,
    account,
    amount: transaction.coreTx.args.value,
    description: '',
    fee,
    proxyDeposit,
    multisigDeposit: '0',
  } as AddPureProxiedInput;
}

type RemoveProxyInput = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  proxyType: ProxyType;
  delegate: Address;
  description: string;
  transaction: Transaction;
  proxiedAccount?: ProxiedAccount;
};

async function prepareRemoveProxyTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    delegate: transaction.coreTx.args.delegate,
    description: '',

    transaction: transaction.coreTx,
    fee,
  } as RemoveProxyInput;
}

type RemovePureProxiedInput = {
  signatory?: Account;
  description: string;
  transaction: Transaction;
  spawner: AccountId;
  proxyType: ProxyType;
  chain?: Chain;
  account?: Account;
  proxiedAccount?: ProxiedAccount;
};

async function prepareRemovePureProxiedTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    spawner: toAccountId(transaction.coreTx.args.spawner),
    description: '',

    transaction: transaction.coreTx,
    fee,
  } as RemovePureProxiedInput;
}

type BondNominateInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  destination: string;
  description: string;
};

async function prepareBondNominateTransaction({ transaction, wallets, chains, apis, connections, feeMap }: DataParams) {
  const bondTx = transaction.coreTx.args.transactions.find((t: Transaction) => t.type === TransactionType.BOND)!;
  const nominateTx = transaction.coreTx.args.transactions.find(
    (t: Transaction) => t.type === TransactionType.NOMINATE,
  )!;

  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  const era = await eraService.getActiveEra(apis[chainId]);
  const isLightClient = networkUtils.isLightClientConnection(connections[chain!.chainId]);
  const validatorsMap = await validatorsService.getValidatorsWithInfo(apis[chainId], era || 0, isLightClient);

  const validators = nominateTx.args.targets.map((address: string) => validatorsMap[address]);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    shards: [account],
    amount: bondTx.args.value,
    validators,
    destination: bondTx.args.dest,
    description: '',

    fee,
    multisigDeposit: '0',
  } as BondNominateInput;
}

type BondExtraInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;
};

async function prepareBondExtraTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
    shards: [account],
    amount: transaction.coreTx.args.maxAdditional,
    description: '',

    fee,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: '0',
  } as BondExtraInput;
}

type NominateInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  description: string;
};

async function prepareNominateTransaction({ transaction, wallets, chains, connections, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  const era = await eraService.getActiveEra(apis[chainId]);
  const isLightClient = networkUtils.isLightClientConnection(connections[chain!.chainId]);
  const validatorsMap = await validatorsService.getValidatorsWithInfo(apis[chainId], era || 0, isLightClient);

  const validators = transaction.coreTx.args.targets.map((address: string) => validatorsMap[address]);

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
    shards: [account],
    validators,
    destination: transaction.coreTx.args.dest,
    description: '',

    fee,
  } as NominateInput;
}

type PayeeInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  destination?: string;
  description: string;
};

async function preparePayeeTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
    shards: [account],
    destination: transaction.coreTx.args.dest,
    description: '',

    fee,
  } as PayeeInput;
}

type UnstakeInput = {
  chain: Chain;
  asset: Asset;
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

async function prepareUnstakeTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const coreTx = getCoreTx(transaction, [TransactionType.UNSTAKE]);

  const chainId = coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(coreTx.address));

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(coreTx.args.assetId, chain.assets),
    shards: [account],
    amount: coreTx.args.value,
    description: '',

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } as UnstakeInput;
}

type RestakeInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;
};

async function prepareRestakeTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
    shards: [account],
    amount: transaction.coreTx.args.value,
    description: '',

    fee,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: '0',
  } as RestakeInput;
}

type WithdrawInput = {
  chain: Chain;
  asset: Asset;
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

async function prepareWithdrawTransaction({ transaction, wallets, chains, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));
  const era = await eraService.getActiveEra(apis[chainId]);

  const staking = (await new Promise((resolve) => {
    useStakingData().subscribeStaking(chainId, apis[chainId], [transaction.coreTx.address], resolve);
  })) as any;

  const amount = redeemableAmount(staking?.[transaction.coreTx.address]?.unlocking, era || 0);

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
    shards: [account],
    amount,
    description: '',

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } as WithdrawInput;
}

// TODO add transaction details
async function prepareUnlockTransaction({ transaction, wallets, apis, feeMap }: DataParams) {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    shards: [account!],
    amount: '0',
    description: '',

    fee,
    totalFee: '0',
    multisigDeposit: '0',
    transferableAmount: BN_ZERO,
  } satisfies UnlockFormData;
}
