import { useForm } from 'effector-forms';
import { FormEvent, useEffect } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Select, Button, FootnoteText, HelpText, BaseModal, Icon, InputHint } from '@shared/ui';
import { offChainModel } from '../model/off-chain-model';
import { Sources } from '../lib/constants';
import { useModalClose } from '@shared/lib/hooks';

export const OffChainDataSource = () => {
  const { t } = useI18n();

  const isFlowStarted = useUnit(offChainModel.$isFlowStarted);
  const { submit } = useForm(offChainModel.$offChainForm);

  const [isModalOpen, closeModal] = useModalClose(isFlowStarted, offChainModel.output.flowClosed);

  useEffect(() => {
    offChainModel.events.flowStarted();
  }, []);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <BaseModal isOpen={isModalOpen} closeButton title={t('governance.offChainDataSource.title')} onClose={closeModal}>
      <form id="offchain-datasource" className="flex flex-col gap-y-4 pt-4" onSubmit={submitForm}>
        <div>
          <FootnoteText>{t('governance.offChainDataSource.formTitle')}</FootnoteText>
          <HelpText className="text-text-tertiary">{t('governance.offChainDataSource.formDescription')}</HelpText>
        </div>
        <DataSourceSelector />
      </form>

      <ActionSection />
    </BaseModal>
  );
};

const DataSourceSelector = () => {
  const { t } = useI18n();

  const {
    fields: { source },
  } = useForm(offChainModel.$offChainForm);

  const options = Object.entries(Sources).map(([type, value]) => ({
    id: type,
    value: type,
    element: (
      <div className="flex items-center gap-x-1">
        <Icon size={16} name={value.icon} />
        <FootnoteText>{value.title}</FootnoteText>
      </div>
    ),
  }));

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        placeholder={t('governance.offChainDataSource.selectPlaceholder')}
        options={options}
        invalid={source.hasError()}
        selectedId={source.value}
        onChange={({ value }) => source.onChange(value)}
      />
      <InputHint active={source.hasError()} variant="error">
        {t(source.errorText())}
      </InputHint>
    </div>
  );
};

const ActionSection = () => {
  const { t } = useI18n();

  const canSubmit = useUnit(offChainModel.$canSubmit);

  return (
    <Button form="offchain-datasource" className="w-fit mt-7 ml-auto" type="submit" disabled={!canSubmit}>
      {t('governance.offChainDataSource.save')}
    </Button>
  );
};