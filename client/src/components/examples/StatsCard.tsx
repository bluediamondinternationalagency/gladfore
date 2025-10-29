import StatsCard from '../StatsCard';
import { DollarSign } from 'lucide-react';

export default function StatsCardExample() {
  return (
    <div className="p-8 space-y-4">
      <StatsCard
        title="Total Revenue"
        value="KES 2.5M"
        icon={DollarSign}
        trend="+12.5% from last month"
        trendUp={true}
      />
    </div>
  );
}
