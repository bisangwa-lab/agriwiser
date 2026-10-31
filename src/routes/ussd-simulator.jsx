import { createFileRoute } from '@tanstack/react-router';
import { UssdSimulator } from '@/components/ussd/UssdSimulator';

export const Route = createFileRoute('/ussd-simulator')({
  ssr: false,
  head: () => ({ meta: [{ title: 'USSD Simulator · AgriWiser' }] }),
  component: UssdSimulator,
});
