import { CapabilityCard } from './CapabilityCard.js';

type Team = { name: string; mascot: string; members: string[] };

export default function Teams() {
  return <CapabilityCard<Team>
    title="Teams"
    description="Manage teams and members."
    path="/api/teams"
    resourceKey="teams"
    emptyMessage="No teams yet."
    itemKey={(team) => team.name}
    renderItem={(team) => <>{team.name} ({team.mascot}) · {team.members.length} members</>}
  />;
}
