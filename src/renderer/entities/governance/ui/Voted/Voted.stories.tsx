import { type ComponentMeta, type ComponentStory } from '@storybook/react';

import { Voted } from './Voted';

export default {
  title: 'Voted',
  component: Voted,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Voted>;

const Template: ComponentStory<typeof Voted> = (args) => <Voted {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  active: true,
};
