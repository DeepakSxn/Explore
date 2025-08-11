"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Brain, BrushIcon as Broom, ArrowRight, Play, Star, Users, Zap, MessageCircle, ChevronRight, Sparkles, Target, Shield, Globe } from "lucide-react"
import { useEffect, useState } from "react"
import React from "react"

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentFeature, setCurrentFeature] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setTimeout(() => {
      setIsLoaded(true);
    }, 100);
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 4)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      icon: Calendar,
      title: "No Scheduling Required",
      description: "Watch demos instantly without booking appointments or waiting for sales calls. Access content 24/7 at your convenience.",
      color: "green",
      gradient: "from-green-500 to-green-600"
    },
    {
      icon: Brain,
      title: "AI-Powered Personalization",
      description: "Get content tailored to your specific interests and needs with our intelligent recommendation system.",
      color: "blue",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      icon: Broom,
      title: "Distraction-Free Experience",
      description: "Focus on what matters with our clean, clutter-free interface designed for optimal learning.",
      color: "purple",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      icon: Zap,
      title: "Lightning Fast Access",
      description: "Instant access to all demos and features. No downloads, no installations, just pure learning.",
      color: "orange",
      gradient: "from-orange-500 to-orange-600"
    }
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Product Manager",
      company: "TechCorp",
      content: "DemoX transformed how we evaluate software. The AI recommendations are spot-on!",
      rating: 5
    },
    {
      name: "Mike Chen",
      role: "CTO",
      company: "StartupXYZ",
      content: "Finally, a demo platform that doesn't waste our time. Instant access is a game-changer.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "VP Engineering",
      company: "InnovateLab",
      content: "The personalized experience helped us find the perfect solution in minutes, not days.",
      rating: 5
    }
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 relative overflow-hidden">
      {/* Particle effects */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-green-400 rounded-full opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="container flex h-20 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center">
            <Link href="/" className="flex items-center group">
              <img src="/light.webp" alt="EOXS Logo" className="h-8 w-auto transition-transform group-hover:scale-105" />
            </Link>
          </div>
          <nav className="ml-auto flex gap-8 items-center">
            <Link href="/about" className="text-base font-medium text-gray-700 hover:text-green-600 transition-colors relative group">
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-600 transition-all group-hover:w-full"></span>
            </Link>
            <Link href="https://eoxs.com/contact" className="text-base font-medium text-gray-700 hover:text-green-600 transition-colors relative group">
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-600 transition-all group-hover:w-full"></span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-blue-50/30"></div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          
          <div className="container px-4 md:px-6 max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col items-center justify-center space-y-12 text-center">
              {/* Logo with animation */}
              <div className={`transform transition-all duration-700 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                <div className="relative group">
                  <img 
                    src="logoxplore.jpg" 
                    alt="Demox" 
                    className="h-80 w-auto drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute -inset-4 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
              
              {/* Main heading */}
              <div className={`space-y-6 transform transition-all duration-700 delay-200 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="h-6 w-6 text-green-500 animate-pulse" />
                  <span className="text-green-600 font-semibold text-lg">Revolutionary Demo Platform</span>
                  <Sparkles className="h-6 w-6 text-green-500 animate-pulse" />
                </div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-green-800 to-green-600 bg-clip-text text-transparent gradient-text-animate">
                  Explore Software Features
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 max-w-4xl leading-relaxed">
                  Discover our powerful software solutions at your own pace. 
                  <span className="text-green-600 font-semibold"> No scheduling required.</span>
                </p>
              </div>

              {/* CTA Buttons */}
              <div className={`flex flex-col sm:flex-row gap-4 transform transition-all duration-700 delay-400 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                <Link href={'login'}>
                  <Button size="lg" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-12 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                    <span className="relative z-10 flex items-center">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="border-2 border-gray-300 hover:border-green-600 text-gray-700 hover:text-green-600 px-12 py-6 text-lg rounded-full transition-all duration-300 group hover:bg-green-50">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Features Section */}
        <section className="w-full py-20 bg-white">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Why Choose <span className="text-green-600">DemoX</span>?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Experience software demos like never before with our innovative platform
              </p>
            </div>
            
            {/* Feature showcase */}
            <div className="mb-16">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                                         <div className="flex items-center gap-4">
                       <div className={`bg-gradient-to-br ${features[currentFeature].gradient} p-4 rounded-2xl shadow-lg`}>
                         {React.createElement(features[currentFeature].icon, { className: "h-8 w-8 text-white" })}
                       </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{features[currentFeature].title}</h3>
                        <p className="text-gray-600">{features[currentFeature].description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {features.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentFeature(index)}
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            index === currentFeature ? 'bg-green-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl p-8 h-64 flex items-center justify-center">
                      <div className="text-center">
                        <Target className="h-16 w-16 text-green-600 mx-auto mb-4" />
                        <p className="text-gray-700 font-medium">Interactive Demo Preview</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Feature cards */}
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 hover:border-green-200 transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                  onMouseEnter={() => setCurrentFeature(index)}
                >
                                     <div className="flex items-start gap-6">
                     <div className={`bg-gradient-to-br ${feature.gradient} p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                       {React.createElement(feature.icon, { className: "h-8 w-8 text-white" })}
                     </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-20 bg-gradient-to-r from-green-600 to-green-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="container px-4 md:px-6 max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div className="text-white group">
                <div className="text-4xl md:text-5xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300">500+</div>
                <div className="text-green-100 text-lg">Software Demos</div>
              </div>
              <div className="text-white group">
                <div className="text-4xl md:text-5xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300">50K+</div>
                <div className="text-green-100 text-lg">Happy Users</div>
              </div>
              <div className="text-white group">
                <div className="text-4xl md:text-5xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300">99.9%</div>
                <div className="text-green-100 text-lg">Uptime</div>
              </div>
              <div className="text-white group">
                <div className="text-4xl md:text-5xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300">24/7</div>
                <div className="text-green-100 text-lg">Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 bg-white">
          <div className="container px-4 md:px-6 max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-12 shadow-xl border border-green-100">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Join thousands of users who are already experiencing the future of software demos
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={'login'}>
                  <Button size="lg" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-12 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group">
                    Start Your Free Trial
                    <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="border-2 border-gray-300 hover:border-green-600 text-gray-700 hover:text-green-600 px-12 py-6 text-lg rounded-full transition-all duration-300">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button 
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <MessageCircle className="h-6 w-6" />
          {isHovered && (
            <div className="absolute bottom-full right-0 mb-2 bg-white text-gray-800 px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
              Need help? Chat with us!
            </div>
          )}
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container px-4 md:px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <img src="/light.webp" alt="EOXS Logo" className="h-8 w-auto" />
              <span className="text-gray-400">© 2024 DemoX. All rights reserved.</span>
            </div>
            <div className="flex gap-8 text-sm">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Certified Engineer
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
