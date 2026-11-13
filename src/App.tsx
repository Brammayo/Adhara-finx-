import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './components/landing/LandingPage';
import { CustomerOnboardingFlow } from './components/onboarding/CustomerOnboardingFlow';
import { IndividualPortal } from './components/portals/IndividualPortal';
import { AgentPortal } from './components/portals/AgentPortal';
import { AdminPortal } from './components/portals/AdminPortal';

function AdharaFinxRouter() {
  const { currentUser } = useApp();
  const [onboardingToken, setOnboardingToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('onboard');
  });

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setOnboardingToken(params.get('onboard'));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openOnboardingToken = (token: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('onboard', token);
    window.history.pushState({}, '', url.toString());
    setOnboardingToken(token);
  };

  const exitOnboarding = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('onboard');
    window.history.pushState({}, '', url.pathname);
    setOnboardingToken(null);
  };

  if (onboardingToken) {
    return <CustomerOnboardingFlow token={onboardingToken} onExit={exitOnboarding} />;
  }

  if (!currentUser) {
    return <LandingPage onOpenSampleOnboarding={openOnboardingToken} />;
  }

  if (currentUser.role === 'individual') {
    return <IndividualPortal />;
  }

  if (currentUser.role === 'agent') {
    return <AgentPortal onOpenOnboardingLink={openOnboardingToken} />;
  }

  return <AdminPortal />;
}

export default function App() {
  return (
    <AppProvider>
      <AdharaFinxRouter />
    </AppProvider>
  );
}
