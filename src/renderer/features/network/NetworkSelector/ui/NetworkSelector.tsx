import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { TFunction } from 'react-i18next';

import { cnTw } from '@shared/lib/utils';
import { Icon, FootnoteText, IconButton, Button, HelpText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { SelectButtonStyle, OptionStyle } from '@shared/ui/Dropdowns/common/constants';
import { useScrollTo } from '@shared/lib/hooks';
import { CommonInputStyles, CommonInputStylesTheme } from '@shared/ui/Inputs/common/styles';
import { ConnectionType } from '@shared/core';
import { networkSelectorUtils } from '../lib/network-selector-utils';
import type { Theme } from '@shared/ui/types';
import type { RpcNode } from '@shared/core';
import type { ConnectionItem, SelectorPayload } from '../lib/types';

const OptionsContainerStyle =
  'mt-1 absolute z-20 py-1 px-1 w-full border border-token-container-border rounded bg-input-background shadow-card-shadow';

const TRANSITION_DURATION = 100;

const Title = {
  [ConnectionType.AUTO_BALANCE]: (t: TFunction) => t('settings.networks.selectorAutoBalance'),
  [ConnectionType.DISABLED]: (t: TFunction) => t('settings.networks.selectorDisableNode'),
  [ConnectionType.LIGHT_CLIENT]: (t: TFunction) => t('settings.networks.selectorLightClient'),
  [ConnectionType.RPC_NODE]: (t: TFunction, nodeName?: string) => nodeName,
};

type Props = {
  nodesList: ConnectionItem[];
  selectedConnection?: ConnectionItem;
  theme?: Theme;
  onChange: (value: SelectorPayload) => void;
  onRemoveCustomNode: (node: RpcNode) => void;
  onChangeCustomNode: (node?: RpcNode) => void;
};

export const NetworkSelector = ({
  nodesList,
  selectedConnection,
  theme = 'light',
  onChange,
  onRemoveCustomNode,
  onChangeCustomNode,
}: Props) => {
  const { t } = useI18n();
  const [ref, scroll] = useScrollTo<HTMLDivElement>(TRANSITION_DURATION);

  return (
    <Listbox value={selectedConnection || {}} onChange={onChange}>
      {({ open }) => (
        <div className="relative">
          <Listbox.Button
            className={cnTw(
              open && SelectButtonStyle[theme].open,
              SelectButtonStyle[theme].disabled,
              CommonInputStyles,
              CommonInputStylesTheme[theme],
              'w-[248px] flex items-center gap-x-2 justify-between',
            )}
            onClick={scroll}
          >
            <FootnoteText className="truncate">
              {(selectedConnection && Title[selectedConnection.type](t, selectedConnection.node?.name)) ||
                t('settings.networks.selectorPlaceholder')}
            </FootnoteText>
            <Icon name="down" size={16} />
          </Listbox.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-0"
            enterTo="opacity-100 translate-y-1"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-1"
            leaveTo="opacity-0 translate-y-0"
          >
            <div ref={ref} className={OptionsContainerStyle}>
              <Listbox.Options className="max-h-64 overflow-y-auto overscroll-contain">
                {nodesList.map((data) => {
                  const { type, node, isCustom } = data;

                  return (
                    <Listbox.Option
                      key={node ? `${node.name}_${node.url}` : type}
                      value={data}
                      className={cnTw(
                        OptionStyle,
                        'ui-selected:bg-selected-background ui-active:bg-action-background-hover mb-1 last:mb-0',
                      )}
                    >
                      <div className="flex items-center gap-x-4">
                        <div className="flex flex-col justify-center overflow-hidden flex-1 h-8 pr-1">
                          <FootnoteText className="text-text-secondary truncate">
                            {Title[type](t, node?.name)}
                          </FootnoteText>
                          {node?.url && <HelpText className="text-text-tertiary truncate">{node.url}</HelpText>}
                        </div>
                        {node && isCustom && (
                          <>
                            <IconButton
                              name="edit"
                              onClick={(event) => {
                                event.stopPropagation();
                                onChangeCustomNode(node);
                              }}
                            />
                            {networkSelectorUtils.canDeleteNode(node.url, selectedConnection?.node?.url) && (
                              <IconButton
                                name="delete"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onRemoveCustomNode(node);
                                }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </Listbox.Option>
                  );
                })}
              </Listbox.Options>
              <Listbox.Option as="div" value={null} className="h-8.5">
                <Button
                  size="sm"
                  variant="text"
                  className="w-full h-full justify-center"
                  suffixElement={<Icon name="add" size={16} />}
                >
                  {t('settings.networks.addNodeButton')}
                </Button>
              </Listbox.Option>
            </div>
          </Transition>
        </div>
      )}
    </Listbox>
  );
};