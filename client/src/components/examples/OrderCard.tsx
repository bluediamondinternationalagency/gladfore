import OrderCard from '../OrderCard';

export default function OrderCardExample() {
  return (
    <div className="p-8 max-w-md">
      <OrderCard
        orderId="12345678-1234-1234-1234-123456789abc"
        farmerName="John Kamau"
        totalCost={50000}
        downPayment={25000}
        balance={25000}
        status="pending"
        dueDate={new Date('2025-12-31')}
        showActions={true}
        onApprove={() => console.log('Approved')}
        onReject={() => console.log('Rejected')}
      />
    </div>
  );
}
