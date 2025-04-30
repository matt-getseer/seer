import { SignIn as ClerkSignIn, useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const SignIn = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isSignedIn } = useAuth()

  console.log('Rendering SignIn component', { pathname: location.pathname, isSignedIn }); // Log entry

  // Log when we arrive at sign-in page to help debugging
  useEffect(() => {
    console.log('Login page loaded with search params:', location.search)
  }, [location])

  // Redirect if already signed in
  useEffect(() => {
    if (isSignedIn) {
      console.log('Already signed in, redirecting to /')
      navigate('/', { replace: true })
    }
  }, [isSignedIn, navigate])

  // Return null or a loading indicator while checking auth/redirecting
  console.log('SignIn component: Checking if signed in before return:', isSignedIn); // Log state before check
  if (isSignedIn) {
    // Return a simple loading indicator instead of null during redirect
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  console.log('SignIn component: Rendering ClerkSignIn element'); // Log before final return

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <ClerkSignIn 
        signUpUrl="/sign-up"
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

export default SignIn 