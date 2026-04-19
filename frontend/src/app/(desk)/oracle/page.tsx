import TopBar from '@/components/layout/TopBar';
import OracleDashboard from '@/components/oracle/OracleDashboard';

export default function Page(): JSX.Element {
  return (
    <>
      <TopBar eyebrow="Resolution Desk" title="Oracle Desk" />
      <main className="px-4 py-8 lg:px-10">
        <OracleDashboard />
      </main>
    </>
  );
}
