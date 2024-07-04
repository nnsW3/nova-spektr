import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { BaseModal, Button } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { OperationSign, OperationSubmit } from '@features/operations';
import { BondForm } from './BondForm';
import { bondExtraUtils } from '../lib/bond-extra-utils';
import { bondExtraModel } from '../model/bond-extra-model';
import { Step } from '../lib/types';
import { basketUtils, BondExtraConfirmation as Confirmation } from '@features/operations/OperationsConfirm';
import { OperationResult } from '@entities/transaction';

export const BondExtra = () => {
  const { t } = useI18n();

  const step = useUnit(bondExtraModel.$step);
  const walletData = useUnit(bondExtraModel.$walletData);
  const initiatorWallet = useUnit(bondExtraModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!bondExtraUtils.isNoneStep(step), bondExtraModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    bondExtraUtils.isBasketStep(step),
    bondExtraModel.output.flowFinished,
  );

  useEffect(() => {
    if (bondExtraUtils.isBasketStep(step)) {
      const timer = setTimeout(() => closeBasketModal(), 1450);

      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!walletData) return null;

  if (bondExtraUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  if (bondExtraUtils.isBasketStep(step)) {
    return (
      <OperationResult
        isOpen={isBasketModalOpen}
        variant="success"
        title={t('operation.addedToBasket')}
        onClose={closeBasketModal}
      />
    );
  }

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="w-max"
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.stakeMore.title', { asset: walletData.chain.assets[0].symbol })}
          chainId={walletData.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {bondExtraUtils.isInitStep(step) && <BondForm onGoBack={closeModal} />}
      {bondExtraUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => bondExtraModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => bondExtraModel.events.stepChanged(Step.INIT)}
        />
      )}
      {bondExtraUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => bondExtraModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
