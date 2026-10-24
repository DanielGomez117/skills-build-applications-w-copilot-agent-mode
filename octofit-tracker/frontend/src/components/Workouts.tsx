import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Suggestion = { title: string; reason: string };
const userEmail = 'mona@example.com';
const loadSuggestions = () => getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`).then(({ suggestions }) => suggestions);

export default function Workouts() {
  return <CapabilityCard<Suggestion>
    title="Workout suggestions"
    description="Recommend workouts from activity patterns."
    loadItems={loadSuggestions}
    emptyMessage="No workout suggestions yet."
    itemKey={(suggestion) => suggestion.title}
    renderItem={(suggestion) => <>{suggestion.title}: {suggestion.reason}</>}
  />;
}
