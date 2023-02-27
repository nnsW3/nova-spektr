import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import React, { useEffect, useState } from 'react';

import { Balance } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { useTransaction } from '@renderer/services/transaction/transactionService';

type Props = {
  api?: ApiPromise;
  repeat?: number;
  asset: Asset;
  transaction?: Transaction;
  className?: string;
};

const Fee = ({ api, repeat = 1, asset, transaction, className }: Props) => {
  const { getTransactionFee } = useTransaction();

  const [isLoading, setIsLoading] = useState(false);
  const [transactionFee, setTransactionFee] = useState('');

  useEffect(() => {
    (async () => {
      if (!transaction?.address || !api) {
        setTransactionFee('0');
        setIsLoading(false);

        return;
      }

      setIsLoading(true);

      try {
        const fee = await getTransactionFee(transaction, api);

        setTransactionFee(fee);
      } catch (error) {
        setTransactionFee('0');
      }

      setIsLoading(false);
    })();
  }, [transaction?.args, transaction?.address]);

  if (isLoading) {
    return <div className="animate-pulse bg-shade-20 rounded-lg w-20 h-2.5" data-testid="fee-loader" />;
  }

  const totalFee = new BN(transactionFee).muln(repeat).toString();

  return (
    <div className={className}>
      <Balance value={totalFee} precision={asset.precision} symbol={asset.symbol} />
    </div>
  );
};

export default React.memo(Fee);