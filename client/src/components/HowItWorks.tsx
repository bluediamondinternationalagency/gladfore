import { UserPlus, DollarSign, Truck } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Register as a Farmer or Agent",
    description: "Quick and simple registration process to get started on your journey to better farming.",
  },
  {
    number: "02",
    icon: DollarSign,
    title: "Make 50% Down Payment",
    description: "Pay only half upfront to secure your fertilizer order and reduce financial burden.",
  },
  {
    number: "03",
    icon: Truck,
    title: "Get Fertilizer & Pay Balance Later",
    description: "Receive your fertilizer immediately and pay the remaining balance on flexible terms.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-32 bg-background" data-testid="section-how-it-works">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-4">
          How It Works
        </h2>
        <p className="text-lg text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          Three simple steps to transform your farming business
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <step.icon className="w-12 h-12 text-primary" />
                </div>
                <div className="absolute top-8 left-4 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {step.number}
                </div>
                <h3 className="text-xl md:text-2xl font-semibold mb-4">
                  {step.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
