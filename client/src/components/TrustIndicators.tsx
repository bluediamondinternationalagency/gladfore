const stats = [
  { value: "1,000+", label: "Farmers Served" },
  { value: "98%", label: "Approval Rate" },
  { value: "₦ 50M+", label: "Credit Disbursed" },
  { value: "24/7", label: "Support Available" },
];

export default function TrustIndicators() {
  return (
    <section className="py-10 sm:py-12 md:py-16 lg:py-20 bg-background" data-testid="section-trust-indicators">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center items-center gap-8 sm:gap-10 md:gap-16 lg:gap-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-1 sm:mb-2" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
