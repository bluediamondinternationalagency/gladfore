import CTAFooter from '../CTAFooter';

export default function CTAFooterExample() {
  return (
    <CTAFooter 
      onSignUpFarmer={() => console.log('Sign up as farmer')}
      onSignUpAgent={() => console.log('Sign up as agent')}
    />
  );
}
