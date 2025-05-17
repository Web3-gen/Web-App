import Image from 'next/image';
import { ArrowLeft, ArrowRight, CheckCircle, Circle, X } from 'lucide-react';
import Link from 'next/link';

export default function LeaveManagement() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header with back button */}
      <div className="mb-6 flex gap-8">
        <Link href="/dashboard" className="p-2 rounded-full bg-neutral-800">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl">Leave Management</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6">
        {/* Approved Card */}
        <div className="col-span-full md:col-span-3 bg-black rounded-lg p-4 md:p-6 border border-[#2C2C2C] transition-all duration-300 hover:border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              
               
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="text-blue-500" size={24} />
                    </div>
                   
                 
              <div className='mt-12'>
              <h2 className="text-4xl font-bold">4</h2>
              <p className="text-neutral-400 text-sm">Approved This Month</p>
              </div>
            </div>
            
          </div>
        </div>

        {/* Active Employee Card */}
        <div className="col-span-full md:col-span-1 bg-black rounded-lg p-4 md:p-6 border border-[#2C2C2C] transition-all duration-300 hover:border-blue-500/20">
          <div className="relative w-24 h-24 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" 
                stroke="#333" 
                strokeWidth="6"
              />
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" 
                stroke="#3b82f6" 
                strokeWidth="8"
                strokeDasharray="251.2" 
                strokeDashoffset="62.8" 
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xl font-bold">75%</div>
            </div>
          </div>
          <div className="mt-4 text-center text-nowrap">
            <h2 className="text-4xl font-bold">41</h2>
            <p className="text-neutral-400 text-sm ">Active employee</p>
          </div>
        </div>

        {/* Declined Card */}
        <div className="col-span-full md:col-span-2 bg-black rounded-lg p-4 md:p-6 border border-[#2C2C2C] transition-all duration-300 hover:border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <X className="text-red-500" size={24} />
                </div>
              </div>
              <div className='mt-12'>
                <h2 className="text-4xl font-bold">2</h2>
              <p className="text-neutral-400 text-sm">Declined Requests</p>
              </div>
            </div>
           
          </div>
        </div>
      </div>

      {/* Leave Request Table */}
      <div className="bg-black border border-neutral-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-6">Leave Request</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-sm">
                <th className="pb-4 text-left font-normal">Recipient</th>
                <th className="pb-4 text-left font-normal">Leave Type</th>
                <th className="pb-4 text-left font-normal">Days</th>
                <th className="pb-4 text-left font-normal">Reason</th>
                <th className="pb-4 text-left font-normal">Status</th>
                <th className="pb-4 text-left font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {/* Jane Doe - Sick Leave */}
              <tr className="border-b border-neutral-800">
                <td className="py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                      <Image 
                        src="/jane.jpg" 
                        alt="Jane Doe"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                    <span>Jane Doe</span>
                  </div>
                </td>
                <td className="py-4">Sick Leave</td>
                <td className="py-4">3 Days</td>
                <td className="py-4">Medical checkup</td>
                <td className="py-4">
                  <span className="text-yellow-500">Pending</span>
                </td>
                <td className="py-4">
                  <button className="bg-blue-600 text-white rounded px-5 py-2">View</button>
                </td>
              </tr>

              {/* John Smith - Annual */}
              <tr className="border-b border-neutral-800">
                <td className="py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                      <Image 
                        src="/john.jpg" 
                        alt="John Smith"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                    <span>John Smith</span>
                  </div>
                </td>
                <td className="py-4">Annual</td>
                <td className="py-4">20 Days</td>
                <td className="py-4">Family trip</td>
                <td className="py-4">
                  <span className="text-green-500">Approve</span>
                </td>
                <td className="py-4">
                  <Link href="/leaveManagementDetails" className="bg-blue-600 text-white rounded px-5 py-2">View</Link>
                </td>
              </tr>

              {/* Jane Doe - Sick Leave (Repeated) */}
              <tr className="border-b border-neutral-800">
                <td className="py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                      <Image 
                        src="/jane.jpg" 
                        alt="Jane Doe"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                    <span>Jane Doe</span>
                  </div>
                </td>
                <td className="py-4">Sick Leave</td>
                <td className="py-4">3 Days</td>
                <td className="py-4">Medical checkup</td>
                <td className="py-4">
                  <span className="text-yellow-500">Pending</span>
                </td>
                <td className="py-4">
                  <button className="bg-blue-600 text-white rounded px-5 py-2">View</button>
                </td>
              </tr>

              {/* John Smith - Annual (Repeated) */}
              <tr className="border-b border-neutral-800">
                <td className="py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                      <Image 
                        src="/john.jpg" 
                        alt="John Smith"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                    <span>John Smith</span>
                  </div>
                </td>
                <td className="py-4">Annual</td>
                <td className="py-4">20 Days</td>
                <td className="py-4">Family trip</td>
                <td className="py-4">
                  <span className="text-green-500">Approve</span>
                </td>
                <td className="py-6">
                  <button className="bg-blue-600 text-white rounded px-5 py-2">View</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}