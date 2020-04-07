import { createLocalVue, shallowMount } from '@vue/test-utils';

import router from '@/router';
import Clients from '@/components/admin/Clients.vue';

const localVue = createLocalVue();
localVue.use(router);

describe('Clients.vue', () => {
  it('renders', () => {
    const wrapper = shallowMount(Clients, { localVue });
    expect(wrapper.text()).toMatch('Service Clients');
  });
});
