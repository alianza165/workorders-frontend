// pages/analytics.tsx
import LocationDistribution from './LocationDistribution';
import EquipmentTypeAnalysis from './EquipmentTypeAnalysis';
import StatusTrend from './StatusTrend';
import EquipmentFaultAnalysis from './EquipmentFaultAnalysis';

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Work Order Analytics</h1>
      
      {/* First row - Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="lg:col-span-1">
          <LocationDistribution />
        </div>
        <div className="lg:col-span-1">
          <EquipmentTypeAnalysis />
        </div>
      </div>

      {/* Second row - Full width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="lg:col-span-1">
          <StatusTrend />
        </div>
        <div className="lg:col-span-1">
          <EquipmentFaultAnalysis />
        </div>
        {/* Future components can follow similar patterns */}
        {/* <div className="lg:col-span-1"><EquipmentDistribution /></div>
        <div className="lg:col-span-1"><TypeComparison /></div> */}
      </div>
    </div>
  );
}