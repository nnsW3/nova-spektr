import { render, screen } from '@testing-library/react';

import AboutStaking from './AboutStaking';

jest.mock('react-i18next', () => ({ Trans: (props: any) => props.i18nKey }));

jest.mock('@renderer/components/common', () => ({
  Expandable: ({ item, children }: any) => (
    <>
      {item}
      {children}
    </>
  ),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/AboutStaking', () => {
  test('should create component', () => {
    render(<AboutStaking validators={[]} />);

    const text = screen.getByText('staking.about.aboutStakingTitle');
    expect(text).toBeInTheDocument();
  });
});