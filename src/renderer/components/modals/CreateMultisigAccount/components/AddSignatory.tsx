import { ChangeEvent, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { keyBy } from 'lodash';
import cn from 'classnames';

import { useI18n } from '@renderer/context/I18nContext';
import { Signatory } from '@renderer/domain/signatory';
import { useAccount } from '@renderer/services/account/accountService';
import { useContact } from '@renderer/services/contact/contactService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { includes } from '@renderer/shared/utils/strings';
import { Contact } from '@renderer/domain/contact';
import { toAddress } from '@renderer/shared/utils/address';
import { ChainId, SigningType } from '@renderer/domain/shared-kernel';
import { useWallet } from '@renderer/services/wallet/walletService';
import { FootnoteText, SearchInput, SmallTitleText, Checkbox, Button } from '@renderer/components/ui-redesign';
import Tabs, { TabItem } from '@renderer/components/ui-redesign/Tabs/Tabs';
import { useChains } from '@renderer/services/network/chainsService';
import { ChainsRecord } from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';
import { useToggle } from '@renderer/shared/hooks';
import ContactModal from '@renderer/screens/AddressBook/components/ContactModal';
import { WalletsTabItem } from './WalletsTabItem';
import { Icon } from '@renderer/components/ui';
import EmptyContacts from '@renderer/screens/AddressBook/components/EmptyState/EmptyContacts';
import { isMultisig } from '@renderer/domain/account';

type ContactWithIndex = { index: number } & Contact;
export type WalletContact = ContactWithIndex & { walletName?: string; chainId?: ChainId };

type ContactsForm = {
  contacts: number[];
  wallets: number[];
};

const SignatoryTabs = {
  WALLETS: 'wallets',
  CONTACTS: 'contacts',
} as const;

type SignatoryTabsType = (typeof SignatoryTabs)[keyof typeof SignatoryTabs];

type Props = {
  onSelect: (signatories: Signatory[]) => void;
  isEditing: boolean;
};

const AddSignatory = ({ onSelect, isEditing }: Props) => {
  const { t } = useI18n();
  const { matrix } = useMatrix();
  const { getLiveAccounts } = useAccount();
  const { getLiveContacts } = useContact();
  const { getLiveWallets } = useWallet();
  const { getChainsData } = useChains();

  const [query, setQuery] = useState('');
  const [contactList, setContactList] = useState<ContactWithIndex[]>([]);
  const [walletList, setWalletList] = useState<WalletContact[]>([]);
  const [chains, setChains] = useState<ChainsRecord>({});
  const [isContactModalOpen, toggleContactModalOpen] = useToggle();

  const accounts = getLiveAccounts();
  const contacts = getLiveContacts();
  const wallets = getLiveWallets();

  useEffect(() => {
    getChainsData().then((chainsData) => setChains(keyBy(chainsData, 'chainId')));
  }, []);

  useEffect(() => {
    const addressBookContacts = contacts.filter((c) => c.matrixId);
    setContactList(addressBookContacts.map((contact, index) => ({ ...contact, index })));

    const walletContacts = accounts
      .filter((a) => a.signingType !== SigningType.WATCH_ONLY && !isMultisig(a))
      .map<WalletContact>((a, index) => ({
        name: a.name || a.accountId,
        address: toAddress(a.accountId),
        accountId: a.accountId,
        matrixId: matrix.userId,
        index,
        chainId: a.chainId,
        walletName: a.walletId ? wallets.find((w) => w.id === a.walletId)?.name : undefined,
      }));
    setWalletList(walletContacts);
  }, [accounts.length, contacts.length, wallets.length]);

  const searchedContactList = contactList.filter((c) => {
    return includes(c.address, query) || includes(c.matrixId, query) || includes(c.name, query);
  });

  const { control, watch } = useForm<ContactsForm>({
    mode: 'onChange',
    defaultValues: { contacts: [], wallets: [] },
  });

  const selectedContacts = watch('contacts');
  const selectedWallets = watch('wallets');

  const onSelectAccount = (
    event: ChangeEvent<HTMLInputElement>,
    value: number[],
    onChange: (indexes: number[]) => void,
    tab: SignatoryTabsType,
  ) => {
    const selectedAccount = Number(event.target.value);
    const newValues = event.target.checked ? value.concat(selectedAccount) : value.filter((v) => v !== selectedAccount);

    onChange(newValues);

    const wallets = walletList.filter((c) =>
      (tab === SignatoryTabs.WALLETS ? newValues : selectedWallets).includes(c.index),
    );
    const contacts = contactList.filter((c) =>
      (tab === SignatoryTabs.CONTACTS ? newValues : selectedContacts).includes(c.index),
    );

    onSelect([...wallets, ...contacts]);
  };

  const isAccountSelected = (
    accountIdx: number,
    selection: number[],
    list: (ContactWithIndex | WalletContact)[],
  ): boolean => {
    return selection.some((index) => {
      const isCurrentIndex = accountIdx === index;
      const isSameContact = list[index].accountId === list[accountIdx].accountId;

      return !isCurrentIndex && isSameContact;
    });
  };

  const walletsTab = (
    <ul className="gap-y-2">
      {walletList.map(({ index, accountId, name, walletName, chainId }) => (
        <li key={index + 'wallets'} className="py-1.5">
          <Controller
            name="wallets"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <Checkbox
                value={index}
                checked={selectedWallets.includes(index)}
                disabled={isAccountSelected(index, selectedWallets, walletList)}
                onChange={(event) => onSelectAccount(event, value, onChange, 'wallets')}
              >
                <WalletsTabItem
                  name={name}
                  accountId={accountId}
                  walletName={walletName}
                  explorers={chainId ? chains[chainId].explorers : []}
                />
              </Checkbox>
            )}
          />
        </li>
      ))}
    </ul>
  );

  const hasContacts = Boolean(contactList.length);

  const contactsTab = (
    <div>
      <div className="flex items-center gap-x-4 flex-1 mb-4">
        <SearchInput
          placeholder={t('createMultisigAccount.searchContactPlaceholder')}
          wrapperClass={cn('flex-1')}
          value={query}
          onChange={setQuery}
        />
        {hasContacts && (
          <Button variant="text" suffixElement={<Icon name="add" size={16} />} onClick={toggleContactModalOpen}>
            {t('createMultisigAccount.addContact')}
          </Button>
        )}
      </div>
      {hasContacts ? (
        <ul className="gap-y-2">
          {searchedContactList.map(({ index, accountId, name }) => (
            <li key={index + 'contacts'} className="py-0.5">
              <Controller
                name="contacts"
                control={control}
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <Checkbox
                    value={index}
                    checked={selectedContacts.includes(index)}
                    disabled={isAccountSelected(index, selectedContacts, contactList)}
                    onChange={(event) => onSelectAccount(event, value, onChange, 'contacts')}
                  >
                    <AddressWithExplorers
                      accountId={accountId}
                      name={name}
                      size={20}
                      showIcon
                      addressFont="text-footnote"
                    />
                  </Checkbox>
                )}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyContacts onAddContact={toggleContactModalOpen} />
      )}
    </div>
  );

  const tabItems: TabItem[] = [
    {
      id: SignatoryTabs.WALLETS,
      title: (
        <>
          {t('createMultisigAccount.walletsTab')}
          <FootnoteText className="text-text-tertiary ml-1 mt-0.5">{selectedWallets.length}</FootnoteText>
        </>
      ),
      panel: walletsTab,
    },
    {
      id: SignatoryTabs.CONTACTS,
      title: (
        <>
          {t('createMultisigAccount.contactsTab')}
          <FootnoteText className="text-text-tertiary ml-1 mt-0.5">{selectedContacts.length}</FootnoteText>
        </>
      ),
      panel: contactsTab,
    },
  ];

  return (
    <>
      <section className="flex flex-col px-5 py-4 flex-1 bg-input-background-disabled h-full">
        <SmallTitleText className="py-2 mb-4">{t('createMultisigAccount.signatoryTitle')}</SmallTitleText>

        {isEditing ? (
          <Tabs items={tabItems} panelClassName="mt-4 overflow-y-scroll" tabClassName="flex-inline" />
        ) : (
          <div className="flex flex-col gap-y-2">
            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.walletsTab')} <span className="ml-2">{selectedWallets.length}</span>
            </FootnoteText>
            <ul className="gap-y-2">
              {walletList
                .filter((w) => selectedWallets.includes(w.index))
                .map(({ index, accountId, name, walletName, chainId }) => (
                  <li key={index} className="py-1.5 flex items-center gap-x-2">
                    <WalletsTabItem
                      name={name}
                      accountId={accountId}
                      walletName={walletName}
                      explorers={chainId ? chains[chainId].explorers : []}
                    />
                  </li>
                ))}
            </ul>

            <FootnoteText className="text-text-tertiary">
              {t('createMultisigAccount.contactsTab')} <span className="ml-2">{selectedContacts.length}</span>
            </FootnoteText>
            <ul className="gap-y-2">
              {contactList
                .filter((w) => selectedContacts.includes(w.index))
                .map(({ index, accountId, name }) => (
                  <li key={index} className="py-1.5">
                    <AddressWithExplorers
                      accountId={accountId}
                      name={name}
                      size={20}
                      showIcon
                      addressFont="text-footnote"
                    />
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>
      <ContactModal isOpen={isContactModalOpen} onToggle={toggleContactModalOpen} />
    </>
  );
};

export default AddSignatory;