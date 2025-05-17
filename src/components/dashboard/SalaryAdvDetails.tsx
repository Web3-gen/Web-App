import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function SalaryAdvDetails() {
  const [isApproved, setIsApproved] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);

  const handleApprove = () => {
    setIsApproved(true);
  };

  const handleDecline = () => {
    setIsDeclined(true);
  };

  return (
    <div className="bg-black text-white p-8">
      <div className="">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 mt-6">
          <div className="flex items-center">
            <Link href="/payroll" className="mr-4">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-xl font-medium">Salary Advancement</h1>
          </div>
          <div className="text-gray-400 text-sm">
            <span>Date Submitted</span>
            <span className="ml-4">May 12, 2025</span>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="mb-8">
          <div className=" ">
            <div className="relative w-16 h-16 rounded-full overflow-hidden mr-4">
              <div className="absolute inset-0 bg-gray-600 rounded-full">
                {/* Profile image placeholder */}
                <div className="w-full h-full relative flex items-center justify-center bg-blue-600 text-white text-2xl font-bold">
                  JS
                </div>                
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center mt-4">
                <h2 className="text-2xl font-medium mr-3">John Smith</h2>
                <span className="text-green-500 text-sm -mb-2">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="border-t border-gray-800 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-1">Position</p>
                <p>Software Engineer</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Repayment Plan</p>
                <div className="flex items-center">
                  <p>Split over 2 months</p>
                  <div className="ml-2 w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-1">Salary</p>
                <p>$4,000/month</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Requested Amount</p>
                <p>$1,000</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reason Section */}
        <div className="border-t border-gray-800 pb-4 pt-8 mb-8">
          <p className="text-gray-400 text-sm mb-2">Reason for Leave</p>
          <p className="italic text-gray-300">
            I had an unexpected car repair expense and need temporary assistance. I will repay over the next two months.
            I appreciate the support.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-20">
          {isDeclined ? (
            <div className="text-red-500">Request declined</div>
          ) : isApproved ? (
            <div className="text-green-500">Request approved</div>
          ) : (
            <>
              <button
                onClick={handleDecline}
                className="px-6 py-2 rounded-md mr-4 border border-gray-700 hover:bg-gray-800"
              >
                Decline
              </button>
              <button
                onClick={handleApprove}
                className="px-6 py-2 rounded-md bg-blue-600 hover:bg-blue-700"
              >
                Approve
              </button>
            </>
          )}
        </div>
      </div>
  
  );
}