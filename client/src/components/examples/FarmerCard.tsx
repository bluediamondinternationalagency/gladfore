import FarmerCard from '../FarmerCard';

export default function FarmerCardExample() {
  return (
    <div className="p-8 max-w-md">
      <FarmerCard
        farmerId="F2025001"
        name="Mary Wanjiku"
        phone="+254 712 345 678"
        onSelect={() => console.log('Farmer selected')}
      />
    </div>
  );
}
