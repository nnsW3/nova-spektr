import { useGate, useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@app/providers';
import { Header, Plate } from '@shared/ui';
import { InactiveNetwork } from '@entities/network';
import {
  type AggregatedReferendum,
  CompletedReferendums,
  Delegations,
  Locks,
  NetworkSelector,
  OngoingReferendums,
  ReferendumDetailsDialog,
  ReferendumFilters,
  ReferendumSearch,
  networkSelectorModel,
} from '@features/governance';
import { AddDelegationModal } from '@/widgets/AddDelegationModal/components/AddDelegationModal';
import { addDelegationModel } from '@/widgets/AddDelegationModal/model/addDelegation';
import { UnlockModal, unlockAggregate } from '@/widgets/UnlockModal';
import { governancePageAggregate } from '../aggregates/governancePage';

import { EmptyGovernance } from './EmptyGovernance';

export const Governance = () => {
  useGate(governancePageAggregate.gates.flow);

  const { t } = useI18n();

  const [selectedReferendum, setSelectedReferendum] = useState<AggregatedReferendum | null>(null);
  const isApiConnected = useUnit(networkSelectorModel.$isApiConnected);
  const governanceChain = useUnit(networkSelectorModel.$governanceChain);

  const isLoading = useUnit(governancePageAggregate.$isLoading);
  const isTitlesLoading = useUnit(governancePageAggregate.$isTitlesLoading);
  const ongoing = useUnit(governancePageAggregate.$ongoing);
  const completed = useUnit(governancePageAggregate.$completed);

  return (
    <div className="h-full flex flex-col">
      <Header title={t('governance.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <ReferendumSearch />
      </Header>

      <div className="overflow-y-auto w-full h-full py-6">
        <section className="flex flex-col h-full w-[736px] mx-auto">
          <div className="flex gap-x-3 mb-2">
            <Plate className="w-[240px] h-[90px] pt-3 px-4 pb-4.5">
              <NetworkSelector />
            </Plate>
            <Locks onClick={unlockAggregate.events.flowStarted} />
            <Delegations onClick={addDelegationModel.events.flowStarted} />
          </div>

          <div className="mt-5 mb-4">
            <ReferendumFilters />
          </div>

          <div className="flex flex-col gap-y-3">
            <OngoingReferendums
              referendums={ongoing}
              isTitlesLoading={isTitlesLoading}
              isLoading={isLoading}
              onSelect={setSelectedReferendum}
            />
            <CompletedReferendums
              referendums={completed}
              isTitlesLoading={isTitlesLoading}
              isLoading={isLoading}
              onSelect={setSelectedReferendum}
            />
          </div>

          <EmptyGovernance />
          <InactiveNetwork active={!isApiConnected} isLoading={isLoading} className="flex-grow" />
        </section>
      </div>

      {selectedReferendum && governanceChain && (
        <ReferendumDetailsDialog
          referendum={selectedReferendum}
          chain={governanceChain}
          onClose={() => setSelectedReferendum(null)}
        />
      )}

      <AddDelegationModal />
      <UnlockModal />
    </div>
  );
};
