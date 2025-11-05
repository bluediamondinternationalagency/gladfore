const stats = [
  { value: "1,000+", label: "Farmers Served" },
  { value: "98%", label: "Approval Rate" },
  { value: "₦ 50M+", label: "Credit Disbursed" },
  { value: "24/7", label: "Support Available" },
];

export default function TrustIndicators() {
  return (
    <section className="py-16 md:py-24 bg-background" data-testid="section-trust-indicators">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
