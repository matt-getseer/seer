import { SignUp as ClerkSignUp } from '@clerk/clerk-react'
import { useFeatureFlags } from '../context/FeatureFlagContext'

const SignUp = () => {
  const { isOrganizationsEnabled } = useFeatureFlags();
  
  // Determine the redirect URL after signup based on the feature flag
  const afterSignUpUrl = isOrganizationsEnabled() ? "/organizations/new" : "/";
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <ClerkSignUp 
        signInUrl="/sign-in"
        afterSignUpUrl={afterSignUpUrl}
        appearance={{
          layout: {
            socialButtonsVariant: "iconButton",
            socialButtonsPlacement: "bottom",
            logoPlacement: "inside",
          },
          elements: {
            rootBox: "mx-auto w-full max-w-md",
            card: "shadow-xl border rounded-lg",
            formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-sm font-medium py-2",
            footerActionLink: "text-indigo-600 hover:text-indigo-500",
            formFieldInput: "rounded-md border-gray-300",
            dividerLine: "bg-gray-200",
            dividerText: "text-gray-500",
            formFieldLabel: "text-gray-700",
            headerTitle: "text-2xl font-bold",
            headerSubtitle: "text-gray-600",
            socialButtonsIconButton: "border border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }
        }}
      />
    </div>
  )
}

export default SignUp 