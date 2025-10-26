import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  BarChart3, 
  Smartphone, 
  Package, 
  ShoppingCart, 
  Award, 
  Zap, 
  Shield, 
  Users, 
  CheckCircle,
  ArrowRight,
  Star,
  Play,
  Download,
  Globe,
  Lock,
  Menu,
  X
} from 'lucide-react';
import '../styles/landing.css';

// Component to generate barcode visualizations
const BarcodeVisualization: React.FC<{ type: string; sample: string }> = ({ type, sample }) => {
  const generateBarcode = () => {
    switch (type) {
      case 'ean13':
        return (
          <div className="flex flex-col items-center">
            <div className="bg-white p-6 rounded-lg border-2 border-slate-200 shadow-lg">
              <div className="flex items-center justify-center mb-3">
                {/* EAN-13 Start pattern (101) */}
                <div className="h-20 w-1 bg-black"></div>
                <div className="h-20 w-1 bg-white"></div>
                <div className="h-20 w-1 bg-black"></div>
                
                {/* Left group (6 digits) - realistic pattern */}
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                
                {/* Center pattern (01010) */}
                <div className="h-20 w-1 bg-white"></div>
                <div className="h-20 w-1 bg-black"></div>
                <div className="h-20 w-1 bg-white"></div>
                <div className="h-20 w-1 bg-black"></div>
                <div className="h-20 w-1 bg-white"></div>
                
                {/* Right group (6 digits) - realistic pattern */}
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                
                {/* EAN-13 End pattern (101) */}
                <div className="h-20 w-1 bg-black"></div>
                <div className="h-20 w-1 bg-white"></div>
                <div className="h-20 w-1 bg-black"></div>
              </div>
              <div className="text-center text-xs text-slate-600 font-mono tracking-wider">
                {sample}
              </div>
            </div>
          </div>
        );
      
      case 'qrcode':
        return (
          <div className="flex flex-col items-center">
            <div className="bg-white p-6 rounded-lg border-2 border-slate-200 shadow-lg">
              <div className="w-40 h-40 bg-white border border-slate-300 relative">
                {/* QR Code grid - more realistic pattern */}
                <div className="grid grid-cols-10 gap-0 w-full h-full">
                  {/* Top-left position marker */}
                  <div className="col-span-3 row-span-3 bg-black">
                    <div className="w-full h-full bg-white m-1">
                      <div className="w-full h-full bg-black m-1"></div>
                    </div>
                  </div>
                  
                  {/* Top-right position marker */}
                  <div className="col-span-3 row-span-3 col-start-8 bg-black">
                    <div className="w-full h-full bg-white m-1">
                      <div className="w-full h-full bg-black m-1"></div>
                    </div>
                  </div>
                  
                  {/* Bottom-left position marker */}
                  <div className="col-span-3 row-span-3 row-start-8 bg-black">
                    <div className="w-full h-full bg-white m-1">
                      <div className="w-full h-full bg-black m-1"></div>
                    </div>
                  </div>
                  
                  {/* Timing patterns */}
                  <div className="col-span-4 col-start-4 row-span-1 row-start-6 bg-black"></div>
                  <div className="col-span-1 col-start-6 row-span-4 row-start-4 bg-black"></div>
                  
                  {/* Data modules - realistic pattern */}
                  {Array.from({ length: 100 }).map((_, i) => {
                    const row = Math.floor(i / 10);
                    const col = i % 10;
                    // Skip position markers and timing patterns
                    if (
                      (row < 3 && col < 3) || // top-left
                      (row < 3 && col >= 7) || // top-right
                      (row >= 7 && col < 3) || // bottom-left
                      (row === 5 && col >= 3 && col <= 6) || // horizontal timing
                      (col === 5 && row >= 3 && row <= 6) // vertical timing
                    ) {
                      return null;
                    }
                    return (
                      <div
                        key={i}
                        className={`w-full h-full ${
                          Math.random() > 0.5 ? 'bg-black' : 'bg-white'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="text-center text-xs text-slate-600 font-mono mt-3 tracking-wider">
                {sample}
              </div>
            </div>
          </div>
        );
      
      case 'code128':
        return (
          <div className="flex flex-col items-center">
            <div className="bg-white p-6 rounded-lg border-2 border-slate-200 shadow-lg">
              <div className="flex items-center justify-center mb-3">
                {/* Code 128 Start pattern (11010010000) */}
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                
                {/* Data bars - realistic Code 128 pattern */}
                <div className="h-16 w-2 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-2 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-2 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-2 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-2 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-2 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                
                {/* Code 128 End pattern (11000101000) */}
                <div className="h-16 w-2 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-1 bg-black"></div>
                <div className="h-16 w-1 bg-white"></div>
                <div className="h-16 w-2 bg-black"></div>
              </div>
              <div className="text-center text-xs text-slate-600 font-mono tracking-wider">
                {sample}
              </div>
            </div>
          </div>
        );
      
      case 'upca':
        return (
          <div className="flex flex-col items-center">
            <div className="bg-white p-6 rounded-lg border-2 border-slate-200 shadow-lg">
              <div className="flex items-center justify-center mb-3">
                {/* UPC-A Start pattern (101) */}
                <div className="h-20 w-1 bg-black"></div>
                <div className="h-20 w-1 bg-white"></div>
                <div className="h-20 w-1 bg-black"></div>
                
                {/* Left group (6 digits) - realistic UPC-A pattern */}
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                
                {/* Center pattern (01010) */}
                <div className="h-20 w-1 bg-white"></div>
                <div className="h-20 w-1 bg-black"></div>
                <div className="h-20 w-1 bg-white"></div>
                <div className="h-20 w-1 bg-black"></div>
                <div className="h-20 w-1 bg-white"></div>
                
                {/* Right group (6 digits) - realistic UPC-A pattern */}
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                <div className="h-10 w-1 bg-black"></div>
                <div className="h-10 w-1 bg-white"></div>
                
                {/* UPC-A End pattern (101) */}
                <div className="h-20 w-1 bg-black"></div>
                <div className="h-20 w-1 bg-white"></div>
                <div className="h-20 w-1 bg-black"></div>
              </div>
              <div className="text-center text-xs text-slate-600 font-mono tracking-wider">
                {sample}
              </div>
            </div>
          </div>
        );
      
      default:
        return <div>Unknown barcode type</div>;
    }
  };

  return generateBarcode();
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentBarcodeType, setCurrentBarcodeType] = useState(0);
  
  const barcodeTypes = [
    { 
      name: 'EAN-13', 
      description: 'Retail & Supermarket', 
      icon: ShoppingCart,
      sample: '1234567890123',
      image: 'ean13'
    },
    { 
      name: 'QR Code', 
      description: 'Mobile & Digital', 
      icon: Smartphone,
      sample: 'https://barcodegenpro.com',
      image: 'qrcode'
    },
    { 
      name: 'Code 128', 
      description: 'Logistics & Inventory', 
      icon: Package,
      sample: 'ABC123456789',
      image: 'code128'
    },
    { 
      name: 'UPC-A', 
      description: 'US Retail Standard', 
      icon: BarChart3,
      sample: '123456789012',
      image: 'upca'
    }
  ];

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast Generation',
      description: 'Generate thousands of barcodes in seconds with our optimized engine'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and secure cloud infrastructure'
    },
    {
      icon: Globe,
      title: 'Global Standards',
      description: 'Support for all international barcode standards and formats'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Share projects, manage permissions, and collaborate seamlessly'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Retail Manager',
      company: 'TechMart',
      content: 'BarcodeGenPro revolutionized our inventory management. The interface is intuitive and the results are flawless.',
      rating: 5
    },
    {
      name: 'Michael Rodriguez',
      role: 'Operations Director',
      company: 'LogiFlow',
      content: 'We generate 10,000+ barcodes daily. The speed and reliability are unmatched in the industry.',
      rating: 5
    },
    {
      name: 'Emily Watson',
      role: 'E-commerce Manager',
      company: 'ShopFast',
      content: 'The variety of barcode types and customization options helped us streamline our entire product catalog.',
      rating: 5
    }
  ];

  const awards = [
    { name: 'Best Barcode Solution 2024', issuer: 'Tech Innovation Awards' },
    { name: 'Enterprise Software Excellence', issuer: 'Digital Business Awards' },
    { name: 'User Experience Champion', issuer: 'UX Design Awards' },
    { name: 'Security & Compliance Leader', issuer: 'Enterprise Security Summit' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBarcodeType((prev) => (prev + 1) % barcodeTypes.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">BarcodeGenPro</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors">Reviews</a>
              <Button variant="outline" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/register')}>
                Get Started
              </Button>
            </div>

            {/* Mobile Navigation */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <span>BarcodeGenPro</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-4 mt-8">
                  <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors py-2 px-4 rounded-lg hover:bg-slate-100">
                    Features
                  </a>
                  <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors py-2 px-4 rounded-lg hover:bg-slate-100">
                    Pricing
                  </a>
                  <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors py-2 px-4 rounded-lg hover:bg-slate-100">
                    Reviews
                  </a>
                  <div className="pt-4 space-y-2">
                    <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                      Sign In
                    </Button>
                    <Button className="w-full" onClick={() => navigate('/register')}>
                      Get Started
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-2">
              <Award className="w-4 h-4 mr-2" />
              Award-Winning Barcode Solution
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight hero-title animate-fade-in-up">
              Generate Professional
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient"> Barcodes</span>
              <br />
              in Seconds
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed hero-subtitle animate-fade-in-up">
              The world's most advanced barcode generation platform. Create retail, inventory, 
              and mobile barcodes with enterprise-grade security and lightning-fast performance.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="px-8 py-4 text-lg" onClick={() => navigate('/register')}>
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Animated Barcode Types */}
            <div className="max-w-4xl mx-auto">
              <Card className="p-8 bg-white/50 backdrop-blur-sm border-slate-200">
                <div className="flex items-center justify-center mb-6">
                  {barcodeTypes.map((type, index) => {
                    const IconComponent = type.icon;
                    return (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-500 ${
                          currentBarcodeType === index
                            ? 'bg-blue-100 text-blue-700 scale-105'
                            : 'text-slate-500'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                        <div>
                          <div className="font-semibold">{type.name}</div>
                          <div className="text-sm">{type.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Barcode Visualization */}
                <div className="bg-white/50 backdrop-blur-sm border-slate-200 p-8 rounded-lg">
                  <BarcodeVisualization 
                    type={barcodeTypes[currentBarcodeType].image} 
                    sample={barcodeTypes[currentBarcodeType].sample}
                  />
                  <div className="text-center mt-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {barcodeTypes[currentBarcodeType].name}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {barcodeTypes[currentBarcodeType].description}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Barcode Types Showcase */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Support for All Barcode Types
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Generate professional barcodes for any industry or use case
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {barcodeTypes.map((type, index) => {
              const IconComponent = type.icon;
              return (
                <Card key={index} className="p-6 barcode-showcase-item bg-white/70 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {type.name}
                    </h3>
                    <p className="text-slate-600 mb-4">
                      {type.description}
                    </p>
                    <div className="scale-75">
                      <BarcodeVisualization type={type.image} sample={type.sample} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Choose BarcodeGenPro?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Built for professionals who demand excellence in barcode generation
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="p-6 hover-lift transition-shadow duration-300">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Awards Section */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Recognized Excellence
            </h2>
            <p className="text-lg text-slate-600">
              Industry leaders trust BarcodeGenPro
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {awards.map((award, index) => (
              <Card key={index} className="p-6 text-center bg-white/70 backdrop-blur-sm">
                <Award className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">{award.name}</h3>
                <p className="text-sm text-slate-600">{award.issuer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-slate-600">
              See what our customers say about BarcodeGenPro
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 bg-white">
                <div className="flex items-center mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-600 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-sm text-slate-600">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Barcode Generation?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of businesses already using BarcodeGenPro
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" variant="secondary" className="px-8 py-4 text-lg" onClick={() => navigate('/register')}>
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-4 text-lg text-white border-white hover:bg-white hover:text-blue-600">
              <Download className="w-5 h-5 mr-2" />
              Download Brochure
            </Button>
          </div>
          
          <div className="flex items-center justify-center space-x-6 text-blue-100">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              <span>Enterprise security</span>
            </div>
            <div className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              <span>24/7 support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">BarcodeGenPro</span>
              </div>
              <p className="text-slate-400">
                The world's most advanced barcode generation platform.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2024 BarcodeGenPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
