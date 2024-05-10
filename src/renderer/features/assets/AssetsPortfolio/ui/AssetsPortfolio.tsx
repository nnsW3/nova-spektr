import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Icon, BodyText, FootnoteText } from '@shared/ui';
import { priceProviderModel } from '@entities/price';
import { walletModel } from '@entities/wallet';
import { Wallet, WalletType } from '@shared/core';
import { portfolioModel } from '../model/portfolio-model';
import { TokenBalance } from './TokenBalance';
import { TokenBalanceList } from './TokenBalanceList';

const getColStyle = (wallet?: Wallet) => {
  switch (wallet?.type) {
    case WalletType.WATCH_ONLY:
      return 'grid-cols-[1fr,100px,105px]';
    case WalletType.PROXIED:
      return 'grid-cols-[1fr,100px,105px,30px]';
    default:
      return 'grid-cols-[1fr,100px,105px,50px]';
  }
};

export const AssetsPortfolio = () => {
  const { t } = useI18n();
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const activeTokens = useUnit(portfolioModel.$activeTokens);
  const wallet = useUnit(walletModel.$activeWallet);
  const colStyle = getColStyle(wallet);

  return (
    <div className="flex flex-col gap-y-2 items-center w-full py-4">
      {!!activeTokens.length && (
        <div className={`grid items-center w-[548px] pl-[35px] pr-4 ${colStyle}`}>
          <FootnoteText className="text-text-tertiary">{t('balances.token')}</FootnoteText>
          <FootnoteText className="text-text-tertiary" align="right">
            {fiatFlag && t('balances.price')}
          </FootnoteText>
          <FootnoteText className="text-text-tertiary col-end-4" align="right">
            {t('balances.balance')}
          </FootnoteText>
        </div>
      )}
      <ul className="flex flex-col gap-y-4 items-center w-full">
        {activeTokens.map((asset) => (
          <li key={asset.priceId || asset.symbol} className="w-[548px]">
            {asset.chains.length === 1 ? <TokenBalance asset={asset} /> : <TokenBalanceList asset={asset} />}
          </li>
        ))}

        <div className="hidden only:flex flex-col items-center justify-center gap-y-8 w-full h-full">
          <Icon as="img" name="emptyList" alt={t('balances.emptyStateLabel')} size={178} />
          <BodyText align="center" className="text-text-tertiary">
            {t('balances.emptyStateLabel')}
            <br />
            {t('balances.emptyStateDescription')}
          </BodyText>
        </div>
      </ul>
    </div>
  );
};
