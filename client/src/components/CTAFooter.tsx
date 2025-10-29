import { Button } from "@/components/ui/button";

interface CTAFooterProps {
  onSignUpFarmer: () => void;
  onSignUpAgent: () => void;
}

export default function CTAFooter({ onSignUpFarmer, onSignUpAgent }: CTAFooterProps) {
  return (
    <section className="py-20 md:py-32 bg-primary/5" data-testid="section-cta-footer">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-center">
          <div className="md:col-span-3">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Join the movement to empower farmers
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Be part of the agricultural revolution. Whether you're a farmer looking for affordable fertilizer or an agent helping your community, Gladfore is here to support you.
            </p>
          </div>
          <div className="md:col-span-2 flex flex-col gap-4">
            <Button 
              size="lg" 
              className="w-full rounded-full px-8 py-6 text-lg"
              onClick={onSignUpFarmer}
              data-testid="button-signup-farmer"
            >
              Sign Up as Farmer
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full rounded-full px-8 py-6 text-lg"
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
