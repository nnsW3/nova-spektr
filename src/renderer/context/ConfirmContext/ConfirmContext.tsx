import { createContext, PropsWithChildren, useCallback, useContext, useRef, useState } from 'react';

import { ConfirmModal } from '@renderer/components/ui';

export type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
};

type ConfirmContextProps = {
  confirm: (props: ConfirmDialogProps) => Promise<any>;
};

const ConfirmDialog = createContext<ConfirmContextProps>({} as ConfirmContextProps);

const defaultState = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: '',
  cancelText: '',
};

export const ConfirmDialogProvider = ({ children }: PropsWithChildren) => {
  const [dialogState, setDialogState] = useState(defaultState);

  const fn = useRef<(choice: any) => void>();

  const confirm = useCallback(
    (data: ConfirmDialogProps) => {
      return new Promise((resolve) => {
        setDialogState({ ...data, isOpen: true });

        fn.current = (choice: boolean) => {
          resolve(choice);
          setDialogState(defaultState);
        };
      });
    },
    [setDialogState],
  );

  return (
    <ConfirmDialog.Provider value={{ confirm }}>
      {children}

      <ConfirmModal
        className="w-[400px]"
        isOpen={dialogState.isOpen}
        onClose={() => fn.current?.(false)}
        onConfirm={() => fn.current?.(true)}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
      >
        <h2 className="text-error font-semibold text-xl border-b border-error pb-2.5">{dialogState.title}</h2>
        <p className="pt-2.5 pb-5 text-neutral-variant">{dialogState.message}</p>
      </ConfirmModal>
    </ConfirmDialog.Provider>
  );
};

export const useConfirmContext = () => useContext<ConfirmContextProps>(ConfirmDialog);