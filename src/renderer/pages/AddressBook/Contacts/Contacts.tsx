import { useUnit } from 'effector-react';
import { Outlet } from 'react-router-dom';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { ContactList, ContactRow, EmptyContactList, EmptyFilteredContacts, contactModel } from '@entities/contact';
import { ContactFilter, CreateContactNavigation, EditContactNavigation, filterModel } from '@features/contacts';

export const Contacts = () => {
  const { t } = useI18n();

  const [contacts, contactsFiltered] = useUnit([contactModel.$contacts, filterModel.$contactsFiltered]);

  const hasContacts = contacts.length > 0;
  const hasContactsFiltered = contactsFiltered.length > 0;

  return (
    <>
      <div className="h-full flex flex-col">
        <Header title={t('addressBook.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
          <div className="flex items-center gap-4">
            <ContactFilter />
            <CreateContactNavigation />
          </div>
        </Header>

        <section className="overflow-y-auto w-full h-full mt-4">
          <div className="flex flex-col gap-y-4 w-[546px] mx-auto h-full">
            {!hasContacts && <EmptyContactList />}

            {hasContacts && !hasContactsFiltered && <EmptyFilteredContacts />}

            {hasContacts && hasContactsFiltered && (
              <ContactList>
                {contactsFiltered.map((contact) => (
                  <ContactRow key={contact.id} contact={contact}>
                    <EditContactNavigation contactId={contact.id} />
                  </ContactRow>
                ))}
              </ContactList>
            )}
          </div>
        </section>
      </div>

      <Outlet />
    </>
  );
};
