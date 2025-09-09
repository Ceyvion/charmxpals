import RunnerClient from './RunnerClient';

export default function RunnerGame({ searchParams }: { searchParams?: { cid?: string } }) {
  const cid = searchParams?.cid;
  return <RunnerClient cid={cid} />;
}
