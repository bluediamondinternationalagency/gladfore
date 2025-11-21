import { Button } from "@/components/ui/button";

interface CTAFooterProps {
  onSignUpFarmer: () => void;
  onSignUpAgent: () => void;
}

export default function CTAFooter({ onSignUpFarmer, onSignUpAgent }: CTAFooterProps) {
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-primary/5" data-testid="section-cta-footer">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 sm:gap-10 md:gap-12 items-center">
          <div className="md:col-span-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display mb-3 sm:mb-4">
              Join the movement to empower farmers
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
              Be part of the agricultural revolution. Whether you're a farmer looking for affordable fertilizer or an agent helping your community, Gladfore is here to support you.
            </p>
          </div>
          <div className="md:col-span-2 flex flex-col gap-3">
            <Button 
              size="default" 
              className="w-full rounded-full px-6 py-5 sm:px-8 sm:py-6 text-sm sm:text-base"
              onClick={onSignUpFarmer}
              data-testid="button-signup-farmer"
            >
              Sign Up as Farmer
            </Button>
            <Button 
              size="default" 
              variant="outline" 
              className="w-full rounded-full px-6 py-5 sm:px-8 sm:py-6 text-sm sm:text-base"
              onClick={onSignUpAgent}
              data-testid="button-signup-agent"
            >
              Sign Up as Agent
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
