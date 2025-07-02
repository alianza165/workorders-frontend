// pages/analytics.tsx
import LocationDistribution from './LocationDistribution';
import EquipmentTypeAnalysis from './EquipmentTypeAnalysis';
import StatusTrend from './StatusTrend';

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Work Order Analytics</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <LocationDistribution />
        <EquipmentTypeAnalysis />
        <StatusTrend />
        {/* Future components will go here */}
        {/* <EquipmentDistribution />
        <StatusTrends />
        <TypeComparison /> */}
      </div>
    </div>
  );
}