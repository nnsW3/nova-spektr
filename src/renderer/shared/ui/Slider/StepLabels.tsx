import { type ReactNode, memo, useMemo } from 'react';

type Props = {
  steps: number;
  min: number;
  stepSize: number;
  renderLabel?: (value: number, index: number) => ReactNode;
};

export const StepLabels = memo<Props>(({ steps, renderLabel, min, stepSize }) => {
  const nodes = useMemo(() => {
    if (!renderLabel) {
      return [];
    }

    // for better visuals
    if (steps > 10) {
      return [];
    }

    return Array.from({ length: steps }).map((_, i) => {
      const value = min + i * stepSize;

      return (
        // eslint-disable-next-line react/no-array-index-key
        <div key={value} className="flex justify-center h-fit w-2 mx-1">
          {renderLabel(value, i)}
        </div>
      );
    });
  }, [renderLabel, steps, min, stepSize]);

  if (nodes.length === 0) {
    return null;
  }

  return <div className="flex px-2 w-full justify-between pointer-events-none">{nodes}</div>;
});
