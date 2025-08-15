"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DemoXplorePage() {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 relative overflow-hidden">
      {/* Enhanced animated mesh gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-green-100/30 via-blue-50/20 to-purple-100/30 animate-pulse"></div>
      
      {/* Animated mesh overlay with smooth transitions */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.08),transparent_50%)] animate-pulse-scale"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent_50%)] animate-pulse-scale animation-delay-2000"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.08),transparent_50%)] animate-pulse-scale animation-delay-4000"></div>

      {/* Enhanced floating particles with smooth animations */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full animate-float ${
              i % 4 === 0 ? 'bg-green-400/20' : 
              i % 4 === 1 ? 'bg-blue-400/20' : 
              i % 4 === 2 ? 'bg-purple-400/20' :
              'bg-pink-400/20'
            }`}
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.3 + 0.1,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${6 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Floating geometric shapes with enhanced animations */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-16 left-16 w-32 h-32 border border-green-300/30 rounded-full animate-spin-slow shadow-[0_0_20px_rgba(34,197,94,0.2)]"></div>
        <div className="absolute top-24 right-24 w-24 h-24 border border-blue-300/30 rotate-45 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.2)]"></div>
        <div className="absolute bottom-40 left-1/3 w-20 h-20 border border-purple-300/30 rounded-full animate-bounce-slow shadow-[0_0_20px_rgba(168,85,247,0.2)]"></div>
        <div className="absolute bottom-24 right-1/4 w-16 h-16 border border-pink-300/30 rotate-12 animate-pulse-scale shadow-[0_0_20px_rgba(236,72,153,0.2)]"></div>
        <div className="absolute top-1/2 left-1/4 w-20 h-20 border border-green-300/30 rounded-full animate-float shadow-[0_0_20px_rgba(34,197,94,0.2)]"></div>
      </div>

      {/* Enhanced gradient blobs with smooth animations */}
      <div className="fixed top-16 left-16 w-[400px] h-[400px] bg-gradient-to-br from-green-200/20 via-emerald-200/15 to-teal-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
      <div className="fixed bottom-16 right-16 w-[400px] h-[400px] bg-gradient-to-br from-blue-200/20 via-indigo-200/15 to-purple-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gradient-to-br from-purple-200/15 via-pink-200/15 to-rose-200/15 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>

      {/* Subtle light rays effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-green-300/15 to-transparent animate-pulse"></div>
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-blue-300/15 to-transparent animate-pulse animation-delay-2000"></div>
        <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-purple-300/15 to-transparent animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating orbs with enhanced glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-32 left-1/4 w-3 h-3 bg-green-400/30 rounded-full animate-float shadow-[0_0_15px_rgba(34,197,94,0.4)]"></div>
        <div className="absolute top-48 right-1/3 w-2 h-2 bg-blue-400/30 rounded-full animate-float animation-delay-2000 shadow-[0_0_12px_rgba(59,130,246,0.4)]"></div>
        <div className="absolute bottom-32 left-1/3 w-4 h-4 bg-purple-400/30 rounded-full animate-float animation-delay-4000 shadow-[0_0_18px_rgba(168,85,247,0.4)]"></div>
        <div className="absolute bottom-48 right-1/4 w-1.5 h-1.5 bg-pink-400/30 rounded-full animate-float animation-delay-1000 shadow-[0_0_10px_rgba(236,72,153,0.4)]"></div>
      </div>

      {/* Enhanced animated gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-transparent via-white/3 to-transparent animate-pulse-scale opacity-30"></div>

      {/* Navbar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src="/Black logo.png" height={120} width={80} alt="EOXS Logo" />
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="https://eoxs.com" className="text-black hover:text-green-600 font-medium">
              Home
            </Link>
            <Link href="https://eoxs.com/contact" className="text-black hover:text-green-600 font-medium">
              Contact
            </Link>
          </nav>
          <div className="md:hidden">
            <button className="text-black">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-menu"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 pt-6">
          <button
            className="flex items-center gap-2 text-sm px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 mb-6 shadow-sm"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 text-center">
            {/* Embedded YouTube Video */}
            <div className="flex justify-center items-center mb-8 gap-4">
              <div className="w-full max-w-2xl mx-auto mb-8">
                <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src="https://www.youtube.com/embed/Rk-GmLzqa3A"
                    title="Eoxsplore Guide"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                  ></iframe>
                </div>
              </div>
            </div>
            <div className="flex justify-center items-center  gap-4">
              <img src="lVJ7PU01.svg" alt="DemoXplore Logo" height={600} width={400} />
            </div>
          </div>
        </section>

        {/* What is DemoXplore Section */}
        <section className="py-16 bg-green-100">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">What is EOXSplore?</h2>
              <p className="text-lg mb-6">
                 EOXSplore is an innovative platform designed by EOXS to offer steel industry professionals a seamless,
                self-service experience to explore EOXS's software features. We understand that the traditional live
                demo process can be time-consuming and sometimes not tailored to specific needs. That's why EOXSplore
                empowers users to discover features at their own pace, whenever it suits them.
              </p>
            </div>
          </div>
        </section>

        {/* Why DemoXplore Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">Why was EOXSplore Created?</h2>
              <p className="text-lg mb-6">
                We created EOXSplore to solve a common challenge faced by prospects and businesses alike — the need for
                quick, personalized software demos without scheduling constraints. Steel industry professionals can now
                explore our solutions on their own terms, focusing on the features that matter most to their specific
                operations.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white/20 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-12 text-center text-gray-900 relative">
              <span className="relative z-10">Key Features</span>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-full"></div>
            </h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Feature 1 */}
              <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-green-200 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-green-700 transition-colors duration-300">Self-Service Exploration</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Navigate through our software features at your own pace, focusing on the capabilities that matter most
                      to your steel business operations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-200 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-blue-700 transition-colors duration-300">24/7 Availability</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Access demos anytime, anywhere, eliminating the need to schedule and wait for traditional live
                      demonstrations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Icons Section */}
        <section className="py-16 bg-white/20 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-12 text-center text-gray-900 relative">
              <span className="relative z-10">Platform Capabilities</span>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* No Scheduling */}
              <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-green-200 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" stroke="currentColor" fill="none"/>
                      <path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-green-700 transition-colors duration-300">No Scheduling</h3>
                    <p className="text-gray-700 leading-relaxed">Watch demos without booking a time</p>
                  </div>
                </div>
              </div>
              
              {/* AI Personalized */}
              <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-200 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v4m0 8v4m4-4h4m-8 0H4" strokeWidth="2" stroke="currentColor" fill="none"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-blue-700 transition-colors duration-300">AI Personalized</h3>
                    <p className="text-gray-700 leading-relaxed">Content tailored to your interests</p>
                  </div>
                </div>
              </div>
              
              {/* No Clutter */}
              <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-purple-200 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" stroke="currentColor" fill="none"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-purple-700 transition-colors duration-300">No Clutter</h3>
                    <p className="text-gray-700 leading-relaxed">Focused demos without distractions</p>
                  </div>
                </div>
              </div>
              
              {/* 24/7 Availability */}
              <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-pink-200 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-pink-100 to-pink-200 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-6 w-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" stroke="currentColor" fill="none"/>
                      <path d="M12 6v6l4 2" strokeWidth="2" stroke="currentColor" fill="none"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-pink-700 transition-colors duration-300">24/7 Availability</h3>
                    <p className="text-gray-700 leading-relaxed">Access demos anytime, day or night</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <div className="flex justify-center space-x-8 mb-4">
            <Link href="#" className="hover:text-green-600">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-green-600">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-green-600">
              Contact Us
            </Link>
          </div>
          <p>© {new Date().getFullYear()} EOXS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}