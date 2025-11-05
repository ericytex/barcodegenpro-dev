import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileSpreadsheet, 
  BarChart3, 
  Download, 
  DollarSign, 
  TrendingUp, 
  Settings, 
  CreditCard,
  Smartphone,
  Home,
  Library,
  TestTube
} from 'lucide-react';

export default function HowToPage() {
  const sections = [
    {
      title: "Getting Started",
      icon: Home,
      color: "blue",
      steps: [
        {
          number: "1",
          title: "Log In or Register",
          description: "Create your account or log in to access the Barcode Generator Pro dashboard.",
          image: null
        },
        {
          number: "2",
          title: "Navigate to Dashboard",
          description: "Use the sidebar menu to access different sections of the application.",
          image: null
        },
        {
          number: "3",
          title: "Check Your Tokens",
          description: "View your available tokens in the top navigation bar. Tokens are required for barcode generation.",
          image: null
        }
      ]
    },
    {
      title: "Excel File Upload",
      icon: Upload,
      color: "green",
      steps: [
        {
          number: "1",
          title: "Prepare Your Excel File",
          description: "Create an Excel file with columns: Product Name, Code, Description, etc. Download the template from the Upload Excel page.",
          image: null
        },
        {
          number: "2",
          title: "Upload the File",
          description: "Click on 'Upload Excel' in the sidebar, then drag and drop your file or click to browse.",
          image: null
        },
        {
          number: "3",
          title: "Review Data Preview",
          description: "After upload, review your data in the 'Data Preview' tab to ensure everything is correct.",
          image: null
        },
        {
          number: "4",
          title: "Generate Barcodes",
          description: "Go to 'Generate Barcodes' tab and click 'Generate' to create barcode images. This will deduct tokens.",
          image: null
        }
      ]
    },
    {
      title: "Barcode Generation",
      icon: BarChart3,
      color: "purple",
      steps: [
        {
          number: "1",
          title: "Configure Settings",
          description: "Set PDF grid settings (columns and rows), choose barcode format (EAN-13, UPC-A, Code 128, QR Code), and select device template.",
          image: null
        },
        {
          number: "2",
          title: "Select Generation Mode",
          description: "Choose 'Direct Generation Mode' for immediate barcode creation, or use advanced settings for customization.",
          image: null
        },
        {
          number: "3",
          title: "Generate & Download",
          description: "Click 'Generate Barcodes' to create your files. Download the PDF or PNG files from the Downloads page.",
          image: null
        }
      ]
    },
    {
      title: "Token Purchase",
      icon: CreditCard,
      color: "orange",
      steps: [
        {
          number: "1",
          title: "Check Token Balance",
          description: "View your current token balance in the top navigation bar or settings page.",
          image: null
        },
        {
          number: "2",
          title: "Select Package",
          description: "Choose from pre-set packages or enter a custom amount. Minimum purchase amount is displayed.",
          image: null
        },
        {
          number: "3",
          title: "Choose Payment Method",
          description: "Select from available mobile money providers (MTN, Airtel, or M-PESA) and complete payment.",
          image: null
        },
        {
          number: "4",
          title: "Verify Payment",
          description: "Your tokens will be credited automatically once payment is confirmed.",
          image: null
        }
      ]
    },
    {
      title: "Payments & Collections",
      icon: DollarSign,
      color: "red",
      steps: [
        {
          number: "1",
          title: "View Payments Dashboard",
          description: "Access the 'Payments Dashboard' to monitor all token purchases and payment analytics.",
          image: null
        },
        {
          number: "2",
          title: "Review Collections",
          description: "Check the 'Collections' page to view transaction details, status, and provider information.",
          image: null
        },
        {
          number: "3",
          title: "Export Data",
          description: "Export transaction data as CSV for reporting and analysis.",
          image: null
        }
      ]
    },
    {
      title: "Settings & Configuration",
      icon: Settings,
      color: "gray",
      steps: [
        {
          number: "1",
          title: "Update Profile",
          description: "Go to Settings → Profile tab to update your personal information, password, and account details.",
          image: null
        },
        {
          number: "2",
          title: "Configure Device Templates",
          description: "Add or edit device templates for different phone models in Settings → Device Management.",
          image: null
        },
        {
          number: "3",
          title: "API Settings",
          description: "Configure API endpoints and keys in Settings → API Settings (for Super Admins).",
          image: null
        },
        {
          number: "4",
          title: "Token Settings",
          description: "Adjust token price and minimum purchase amount in Settings → Tokens & Credits (Super Admins only).",
          image: null
        }
      ]
    }
  ];

  const quickLinks = [
    { title: "Dashboard", url: "/dashboard", icon: Home, color: "bg-blue-500" },
    { title: "Upload Excel", url: "/upload-excel", icon: Upload, color: "bg-green-500" },
    { title: "Generate Barcodes", url: "/generate", icon: BarChart3, color: "bg-purple-500" },
    { title: "Payments", url: "/payments", icon: TrendingUp, color: "bg-orange-500" },
    { title: "Collections", url: "/collections", icon: DollarSign, color: "bg-red-500" },
    { title: "Settings", url: "/settings", icon: Settings, color: "bg-gray-500" },
    { title: "API Test", url: "/api-test", icon: TestTube, color: "bg-indigo-500" },
    { title: "Features", url: "/features", icon: Library, color: "bg-teal-500" },
  ];

  const colorVariants: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    green: "bg-green-100 text-green-800 border-green-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    red: "bg-red-100 text-red-800 border-red-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Library className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">How To Guide</h1>
                <p className="text-gray-600 mt-1">Step-by-step instructions to help you use Barcode Generator Pro</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Quick Links */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {quickLinks.map((link) => (
                <a
                  key={link.title}
                  href={link.url}
                  className="group relative overflow-hidden rounded-lg bg-white p-4 border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={`p-3 rounded-lg ${link.color} group-hover:scale-110 transition-transform`}>
                      <link.icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600">
                      {link.title}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {sections.map((section, sectionIndex) => {
              const Icon = section.icon;
              return (
                <Card key={sectionIndex} className="overflow-hidden border-2">
                  <CardHeader className={`${colorVariants[section.color]}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-white/70 rounded-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{section.title}</CardTitle>
                        <CardDescription className="text-base mt-1">
                          Follow these steps to get started with {section.title.toLowerCase()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      {section.steps.map((step, stepIndex) => (
                        <div
                          key={stepIndex}
                          className="relative pl-10 pb-4 border-l-2 border-gray-200 last:pb-0"
                        >
                          <div className="absolute left-0 -top-1 -ml-6">
                            <div className="flex items-center justify-center w-10 h-10 bg-white border-2 border-blue-500 rounded-full">
                              <span className="text-sm font-bold text-blue-600">{step.number}</span>
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                          <p className="text-gray-600 leading-relaxed">{step.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Additional Resources */}
          <div className="mt-12">
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Library className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Need More Help?</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Contact our support team or explore additional resources
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-gray-900 mb-2">📚 Documentation</h4>
                    <p className="text-sm text-gray-600">
                      Access comprehensive guides and API documentation for advanced features.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-gray-900 mb-2">💬 Support</h4>
                    <p className="text-sm text-gray-600">
                      Get help from our support team via email or in-app messaging.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-gray-900 mb-2">🎯 Tips & Tricks</h4>
                    <p className="text-sm text-gray-600">
                      Learn advanced features and best practices for optimal results.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}














