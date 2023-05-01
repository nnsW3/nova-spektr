import { useForm, Controller } from 'react-hook-form';
import { useState, useEffect, FormEvent, ReactNode } from 'react';
import { TFunction, Trans } from 'react-i18next';

import {
  Button,
  AmountInput,
  InputHint,
  Icon,
  RadioGroup,
  Combobox,
  Identicon,
  Block,
  InputArea,
} from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { RewardsDestination } from '@renderer/domain/stake';
import { validateAddress } from '@renderer/shared/utils/address';
import { Asset } from '@renderer/domain/asset';
import { Address, ChainId } from '@renderer/domain/shared-kernel';
import { RadioResult, RadioOption } from '@renderer/components/ui/RadioGroup/common/types';
import { DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useAccount } from '@renderer/services/account/accountService';
import { useWallet } from '@renderer/services/wallet/walletService';
import { getStakeAccountOption } from '../../common/utils';

const PAYOUT_URL = 'https://wiki.polkadot.network/docs/learn-simple-payouts';

const getDestinations = (t: TFunction): RadioOption<RewardsDestination>[] => {
  const options = [
    { value: RewardsDestination.RESTAKE, element: t('staking.bond.restakeRewards') },
    { value: RewardsDestination.TRANSFERABLE, element: t('staking.bond.transferableRewards') },
  ];

  return options.map((dest, index) => ({
    id: index.toString(),
    value: dest.value,
    element: (
      <div className="grid grid-cols-2 items-center flex-1">
        <p className="text-neutral text-lg leading-5 font-semibold">{dest.element}</p>
      </div>
    ),
  }));
};

type FormData = {
  amount: string;
  destination?: Address;
  description?: string;
};

type Props = {
  chainId: ChainId;
  canSubmit: boolean;
  addressPrefix: number;
  fields: string[];
  balanceRange?: [string, string];
  asset: Asset;
  children: ((error: boolean) => ReactNode) | ReactNode;
  validateBalance?: (amount: string) => boolean;
  validateFee?: (amount: string) => boolean;
  validateDeposit?: (amount: string) => boolean;
  onFormChange: (data: FormData) => void;
  onSubmit: (data: FormData) => void;
};

export const OperationForm = ({
  chainId,
  canSubmit,
  addressPrefix,
  fields,
  balanceRange,
  asset,
  children,
  validateBalance = () => true,
  validateFee = () => true,
  validateDeposit = () => true,
  onFormChange,
  onSubmit,
}: Props) => {
  const { t } = useI18n();
  const { getLiveAccounts } = useAccount();
  const { getLiveWallets } = useWallet();

  const destinations = getDestinations(t);
  const dbAccounts = getLiveAccounts();
  const wallets = getLiveWallets();

  const [payoutAccounts, setPayoutAccounts] = useState<DropdownOption<Address>[]>([]);
  const [activeDestination, setActiveDestination] = useState<RadioResult<RewardsDestination>>(destinations[0]);

  const walletsMap = new Map(wallets.map((wallet) => [(wallet.id || '').toString(), wallet]));

  const {
    handleSubmit,
    control,
    watch,
    register,
    unregister,
    formState: { isValid, errors },
  } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: { amount: '', destination: '' },
  });

  useEffect(() => {
    if (activeDestination?.value === RewardsDestination.RESTAKE) {
      unregister('destination');
    } else {
      register('destination');
    }
  }, [activeDestination?.value]);

  useEffect(() => {
    const payoutAccounts = dbAccounts.reduce<DropdownOption<Address>[]>((acc, account) => {
      if (!account.chainId || account.chainId === chainId) {
        const wallet = account.walletId ? walletsMap.get(account.walletId.toString()) : undefined;
        const walletName = wallet?.name || '';

        const option = getStakeAccountOption(account, { asset, addressPrefix, walletName });
        acc.push({ ...option, value: option.value.accountId });
      }

      return acc;
    }, []);

    setPayoutAccounts(payoutAccounts);
  }, [dbAccounts.length]);

  const destination = watch('destination');

  const hasAmountField = fields.includes('amount') && balanceRange;
  const hasDestinationField = fields.includes('destination');
  const hasDescriptionField = fields.includes('description');

  const handleFormChange = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    const amount = data.get('amount')?.toString() || '';
    const destination = data.get('destination')?.toString() || '';

    onFormChange({ amount, destination });
  };

  return (
    <form className="w-full" onSubmit={handleSubmit(onSubmit)} onChange={handleFormChange}>
      <Block className="flex flex-col gap-y-5 p-5 mb-2.5">
        {hasAmountField && (
          <Controller
            name="amount"
            control={control}
            rules={{
              required: true,
              validate: {
                notZero: (v) => Number(v) > 0,
                insufficientBalance: validateBalance,
                insufficientBalanceForFee: validateFee,
                insufficientBalanceForDeposit: validateDeposit,
              },
            }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <>
                <AmountInput
                  placeholder={t('staking.bond.amountPlaceholder')}
                  balancePlaceholder={t('staking.bond.availableBalancePlaceholder')}
                  value={value}
                  name="amount"
                  balance={balanceRange[0] === balanceRange[1] ? balanceRange[0] : balanceRange}
                  asset={asset}
                  invalid={Boolean(error)}
                  onChange={onChange}
                />
                <InputHint active={error?.type === 'insufficientBalance'} variant="error">
                  {t('staking.notEnoughBalanceError')}
                </InputHint>
                <InputHint active={error?.type === 'insufficientBalanceForFee'} variant="error">
                  {t('staking.notEnoughBalanceForFeeError')}
                </InputHint>
                <InputHint active={error?.type === 'insufficientBalanceForDeposit'} variant="error">
                  {t('staking.notEnoughBalanceForDepositError')}
                </InputHint>
                <InputHint active={error?.type === 'required'} variant="error">
                  {t('staking.requiredAmountError')}
                </InputHint>
                <InputHint active={error?.type === 'notZero'} variant="error">
                  {t('staking.requiredAmountError')}
                </InputHint>
              </>
            )}
          />
        )}

        {hasDestinationField && (
          <>
            <div className="grid grid-cols-2">
              <p className="text-neutral text-xs uppercase font-bold">{t('staking.bond.rewardsDestinationTitle')}</p>
              <a
                className="flex items-center gap-x-1 justify-self-end text-primary w-max"
                href={PAYOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="info" size={14} />
                <span className="underline text-xs">{t('staking.bond.aboutRewards')}</span>
              </a>
              <RadioGroup
                className="col-span-2"
                optionClass="p-2.5 rounded-2lg bg-shade-2 mt-2.5"
                activeId={activeDestination?.id}
                options={destinations}
                onChange={setActiveDestination}
              />
            </div>

            {activeDestination?.value === RewardsDestination.TRANSFERABLE && (
              <Controller
                name="destination"
                control={control}
                rules={{
                  required: true,
                  validate: validateAddress,
                }}
                render={({ field: { onChange }, fieldState: { error } }) => (
                  <>
                    <Combobox
                      variant="up"
                      label={t('staking.bond.payoutAccountLabel')}
                      placeholder={t('staking.bond.payoutAccountPlaceholder')}
                      options={payoutAccounts}
                      invalid={Boolean(error)}
                      suffixElement={
                        destination && (
                          <Button variant="text" pallet="dark" weight="xs" onClick={() => onChange(undefined)}>
                            <Icon name="clearOutline" size={20} />
                          </Button>
                        )
                      }
                      prefixElement={<Identicon address={destination} size={24} background={false} canCopy={false} />}
                      onChange={(option) => onChange(option.value)}
                    />
                    <InputHint active={error?.type === 'isAddress'} variant="error">
                      {t('staking.bond.incorrectAddressError')}
                    </InputHint>
                    <InputHint active={error?.type === 'required'} variant="error">
                      {t('staking.bond.requiredAddressError')}
                    </InputHint>
                  </>
                )}
              />
            )}
          </>
        )}
        {typeof children === 'function' ? children(Boolean(errors.amount || errors.destination)) : children}
      </Block>

      {hasDescriptionField && (
        <Block>
          <Controller
            name="description"
            control={control}
            rules={{ required: true, maxLength: 120 }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="flex flex-col gap-y-2.5">
                <InputArea
                  className="w-full"
                  label={t('transfer.descriptionLabel')}
                  placeholder={t('transfer.descriptionPlaceholder')}
                  invalid={Boolean(error)}
                  rows={2}
                  value={value}
                  onChange={onChange}
                />
                <InputHint active={error?.type === 'required'} variant="error">
                  {t('transfer.requiredDescriptionError')}
                </InputHint>
                <InputHint active={error?.type === 'maxLength'} variant="error">
                  <Trans t={t} i18nKey="transfer.descriptionLengthError" values={{ maxLength: 120 }} />
                </InputHint>
              </div>
            )}
          />
        </Block>
      )}

      <Button
        className="mt-5 mx-auto"
        type="submit"
        variant="fill"
        pallet="primary"
        weight="lg"
        disabled={!isValid || !canSubmit}
      >
        {t('staking.bond.continueButton')}
      </Button>
    </form>
  );
};
